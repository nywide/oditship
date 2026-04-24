// Olivraison integration: create a CONFIRMED package and link tracking back to the ODiT order.
// Flow:
//   1. Verify the caller (vendeur or agent) owns the order.
//   2. Resolve hub from customer_city → livreur from hub_livreur.
//   3. Login to Olivraison to get a JWT.
//   4. POST /package (legacy endpoint, returns CONFIRMED).
//   5. Update the order: external_tracking_number, status=Pickup, assigned_livreur_id, hub_id.
//
// On any failure we set api_sync_status='failed' + api_sync_error and leave status=Confirmé
// so the vendeur sees a "Retry API" button.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const OLIVRAISON_BASE = "https://partners.olivraison.com";

interface ReqBody {
  order_id: number;
}

async function olivraisonLogin(apiKey: string, secretKey: string): Promise<string> {
  const r = await fetch(`${OLIVRAISON_BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ apiKey, secretKey }),
  });
  if (!r.ok) {
    const txt = await r.text();
    throw new Error(`Olivraison auth failed (${r.status}): ${txt}`);
  }
  const j = await r.json();
  if (!j.token) throw new Error("Olivraison auth: no token in response");
  return j.token;
}

async function olivraisonCreatePackage(token: string, body: Record<string, unknown>) {
  const r = await fetch(`${OLIVRAISON_BASE}/package`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });
  const text = await r.text();
  let parsed: any = {};
  try { parsed = JSON.parse(text); } catch { /* keep raw */ }
  if (!r.ok) {
    throw new Error(`Olivraison /package ${r.status}: ${parsed?.description || text}`);
  }
  if (!parsed?.trackingID) throw new Error("Olivraison /package: missing trackingID in response");
  return parsed as { trackingID: string; status?: string; partnerTrackingID?: string };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const ANON = Deno.env.get("SUPABASE_PUBLISHABLE_KEY") || Deno.env.get("SUPABASE_ANON_KEY")!;
  const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const OLI_KEY = Deno.env.get("OLIVRAISON_API_KEY");
  const OLI_SECRET = Deno.env.get("OLIVRAISON_SECRET_KEY");

  // Verify caller
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return new Response(JSON.stringify({ error: "Missing Authorization header" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const userClient = createClient(SUPABASE_URL, ANON, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false },
  });
  const { data: userData, error: userErr } = await userClient.auth.getUser();
  if (userErr || !userData.user) {
    return new Response(JSON.stringify({ error: "Invalid session" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  const callerId = userData.user.id;

  // Parse body
  let body: ReqBody;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  if (!body.order_id || typeof body.order_id !== "number") {
    return new Response(JSON.stringify({ error: "order_id (number) required" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // Load order
  const { data: order, error: orderErr } = await admin
    .from("orders")
    .select("*")
    .eq("id", body.order_id)
    .single();

  if (orderErr || !order) {
    return new Response(JSON.stringify({ error: "Order not found" }), {
      status: 404,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Authorization: vendeur owner OR agent of vendeur OR administrateur
  const { data: callerProfile } = await admin
    .from("profiles")
    .select("id, agent_of")
    .eq("id", callerId)
    .single();
  const { data: callerRoles } = await admin
    .from("user_roles")
    .select("role")
    .eq("user_id", callerId);
  const isAdmin = (callerRoles ?? []).some((r) => r.role === "administrateur");
  const isOwner = order.vendeur_id === callerId;
  const isAgent = callerProfile?.agent_of && callerProfile.agent_of === order.vendeur_id;
  if (!isOwner && !isAgent && !isAdmin) {
    return new Response(JSON.stringify({ error: "Forbidden" }), {
      status: 403,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (order.status !== "Confirmé") {
    return new Response(JSON.stringify({ error: `Order must be in 'Confirmé' (current: ${order.status})` }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Resolve hub from city
  const { data: hubCity } = await admin
    .from("hub_cities")
    .select("hub_id")
    .eq("city_name", order.customer_city)
    .limit(1)
    .maybeSingle();

  if (!hubCity) {
    await admin.from("orders").update({
      api_sync_status: "failed",
      api_sync_error: `City "${order.customer_city}" is not assigned to any hub. Contact administrator.`,
    }).eq("id", order.id);
    return new Response(JSON.stringify({
      error: `City "${order.customer_city}" is not assigned to any hub. Contact administrator.`,
    }), { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  // Resolve livreur from hub
  const { data: hubLivreur } = await admin
    .from("hub_livreur")
    .select("livreur_id")
    .eq("hub_id", hubCity.hub_id)
    .maybeSingle();

  if (!hubLivreur) {
    await admin.from("orders").update({
      api_sync_status: "failed",
      api_sync_error: "No delivery person assigned to this hub. Contact administrator.",
    }).eq("id", order.id);
    return new Response(JSON.stringify({
      error: "No delivery person assigned to this hub. Contact administrator.",
    }), { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  // Check livreur API enabled
  const { data: livreurProfile } = await admin
    .from("profiles")
    .select("id, api_enabled, full_name")
    .eq("id", hubLivreur.livreur_id)
    .single();

  if (!livreurProfile) {
    return new Response(JSON.stringify({ error: "Livreur profile missing." }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // ============ CASE B: Traditional livreur (no API) ============
  if (!livreurProfile.api_enabled) {
    const trackingNumber = `ODiT-${crypto.randomUUID().replace(/-/g, "").slice(0, 8).toUpperCase()}`;
    const { error: updErr } = await admin.from("orders").update({
      tracking_number: trackingNumber,
      status: "Pickup",
      assigned_livreur_id: livreurProfile.id,
      hub_id: hubCity.hub_id,
      api_sync_status: "not_applicable",
      api_sync_error: null,
    }).eq("id", order.id);

    if (updErr) {
      return new Response(JSON.stringify({ error: updErr.message }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    return new Response(JSON.stringify({
      ok: true,
      mode: "internal",
      tracking_number: trackingNumber,
      message: "Order moved to Pickup with internal tracking.",
    }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  // ============ CASE A: API-enabled livreur → call Olivraison ============
  if (!OLI_KEY || !OLI_SECRET) {
    await admin.from("orders").update({
      api_sync_status: "failed",
      api_sync_error: "Olivraison credentials are not configured on the server.",
    }).eq("id", order.id);
    return new Response(JSON.stringify({
      error: "Olivraison credentials not configured.",
    }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  try {
    const token = await olivraisonLogin(OLI_KEY, OLI_SECRET);

    const partnerTrackingID = `ODiT-${order.id}`;
    console.log(JSON.stringify({
      event: "olivraison-create-order-payload",
      order_id: order.id,
      open_package: order.open_package,
      noOpen: order.open_package === true ? 1 : 0,
    }));
    const result = await olivraisonCreatePackage(token, {
      price: Number(order.order_value),
      description: order.product_name,
      name: order.product_name,
      comment: order.comment ?? "",
      orderId: String(order.id),
      partnerTrackingID,
      noOpen: order.open_package === true ? 1 : 0,
      destination: {
        name: order.customer_name,
        phone: order.customer_phone,
        city: order.customer_city,
        streetAddress: order.customer_address,
      },
    });

    const { error: updErr } = await admin.from("orders").update({
      external_tracking_number: result.trackingID,
      status: "Pickup",
      assigned_livreur_id: livreurProfile.id,
      hub_id: hubCity.hub_id,
      api_sync_status: "success",
      api_sync_error: null,
    }).eq("id", order.id);

    if (updErr) {
      return new Response(JSON.stringify({
        error: `Olivraison succeeded but DB update failed: ${updErr.message}`,
        tracking_id: result.trackingID,
      }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({
      ok: true,
      mode: "olivraison",
      tracking_id: result.trackingID,
      partner_tracking_id: partnerTrackingID,
    }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown Olivraison error";
    await admin.from("orders").update({
      api_sync_status: "failed",
      api_sync_error: msg,
    }).eq("id", order.id);
    return new Response(JSON.stringify({ error: msg }), {
      status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
