import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const OLIVRAISON_BASE = "https://partners.olivraison.com";

async function olivraisonLogin(apiKey: string, secretKey: string): Promise<string> {
  const r = await fetch(`${OLIVRAISON_BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ apiKey, secretKey }),
  });
  if (!r.ok) throw new Error(`Olivraison auth failed (${r.status})`);
  const j = await r.json();
  if (!j.token) throw new Error("Olivraison auth: no token");
  return j.token;
}

async function getOlivraisonPackage(token: string, trackingID: string) {
  const r = await fetch(`${OLIVRAISON_BASE}/package/${encodeURIComponent(trackingID)}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const text = await r.text();
  let parsed: any = null;
  try { parsed = JSON.parse(text); } catch { parsed = { raw: text }; }
  if (!r.ok) throw new Error(parsed?.description || `Olivraison package failed (${r.status})`);
  return parsed;
}

function isInternalConfirmed(status?: string | null) {
  const normalized = status?.toLowerCase();
  return normalized === "confirmé" || normalized === "confirmed";
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

  let payload: { order_id?: number } = {};
  try { payload = await req.json(); } catch { /* ignore */ }
  if (!payload.order_id || typeof payload.order_id !== "number") {
    return new Response(JSON.stringify({ error: "order_id required" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const callerId = userData.user.id;

  const { data: order, error: orderErr } = await admin
    .from("orders")
    .select("*")
    .eq("id", payload.order_id)
    .single();

  if (orderErr || !order) {
    return new Response(JSON.stringify({ error: "Order not found" }), {
      status: 404,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const [{ data: callerProfile }, { data: callerRoles }] = await Promise.all([
    admin.from("profiles").select("id, agent_of").eq("id", callerId).maybeSingle(),
    admin.from("user_roles").select("role").eq("user_id", callerId),
  ]);

  const isPrivileged = (callerRoles ?? []).some((r: any) => ["administrateur", "superviseur", "ramassoire", "livreur", "support", "suivi"].includes(r.role));
  const isVendeurOwner = order.vendeur_id === callerId;
  const isAgentOfVendeur = callerProfile?.agent_of && callerProfile.agent_of === order.vendeur_id;
  const isAssignedLivreur = order.assigned_livreur_id === callerId;

  if (!isPrivileged && !isVendeurOwner && !isAgentOfVendeur && !isAssignedLivreur) {
    return new Response(JSON.stringify({ error: "Forbidden" }), {
      status: 403,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const [{ data: history }, { data: livreur }, { data: vendeur }] = await Promise.all([
    admin.from("order_status_history").select("id, old_status, new_status, changed_at, changed_by, notes").eq("order_id", order.id).order("changed_at", { ascending: true }),
    order.assigned_livreur_id
      ? admin.from("profiles").select("id, full_name, username, phone").eq("id", order.assigned_livreur_id).maybeSingle()
      : Promise.resolve({ data: null }),
    admin.from("profiles").select("id, full_name, username, company_name, phone").eq("id", order.vendeur_id).maybeSingle(),
  ]);

  const actorIds = Array.from(new Set((history ?? []).map((h: any) => h.changed_by).filter(Boolean)));
  let actors: Record<string, any> = {};
  if (actorIds.length > 0) {
    const { data: rows } = await admin.from("profiles").select("id, full_name, username, role").in("id", actorIds);
    (rows ?? []).forEach((p: any) => { actors[p.id] = p; });
  }

  let packageDetails: any = null;
  let packageError: string | null = null;
  const tracking = order.external_tracking_number || order.tracking_number;
  if (order.external_tracking_number && OLI_KEY && OLI_SECRET) {
    try {
      const token = await olivraisonLogin(OLI_KEY, OLI_SECRET);
      packageDetails = await getOlivraisonPackage(token, order.external_tracking_number);
    } catch (e) {
      packageError = e instanceof Error ? e.message : "Olivraison unavailable";
    }
  }

  const apiHistory = Array.isArray(packageDetails?.history) ? packageDetails.history : [];
  const mergedHistory = [
    ...(history ?? []).filter((h: any) => !isInternalConfirmed(h.new_status) && !isInternalConfirmed(h.old_status)).map((h: any) => ({
      source: "odit",
      status: h.new_status,
      old_status: h.old_status,
      message: h.notes,
      changed_at: h.changed_at,
      actor: h.changed_by ? actors[h.changed_by] ?? null : null,
    })),
    ...apiHistory.map((h: any) => ({
      source: "olivraison",
      status: h.status,
      message: h.msg,
      changed_at: h.updateAt,
      actor: h.user ? { username: h.user } : null,
      reported_to: h.reportedTo ?? null,
    })),
  ].sort((a, b) => new Date(a.changed_at).getTime() - new Date(b.changed_at).getTime());

  return new Response(JSON.stringify({
    order,
    tracking,
    vendeur,
    livreur: {
      name: packageDetails?.transport?.currentDriverName || livreur?.full_name || livreur?.username || null,
      phone: packageDetails?.transport?.currentDriverPhone || livreur?.phone || null,
    },
    support: null,
    destination: packageDetails?.destination ?? null,
    history: mergedHistory,
    package_error: packageError,
  }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
