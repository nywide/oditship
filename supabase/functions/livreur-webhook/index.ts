import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function getPath(obj: any, path?: string | null) {
  if (!path) return undefined;
  return path.split(".").reduce((acc: any, key) => acc?.[key], obj);
}

function normalizeStatus(status: unknown, mapping: Record<string, string>) {
  const raw = String(status ?? "").trim();
  if (!raw) return null;
  return mapping[raw] || mapping[raw.toUpperCase()] || mapping[raw.toLowerCase()] || raw;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const url = new URL(req.url);
  const parts = url.pathname.split("/").filter(Boolean);
  const idIdx = parts.findIndex((p) => p === "livreur-webhook");
  const livreurId = idIdx >= 0 ? parts[idIdx + 1] : null;

  const auth = req.headers.get("Authorization") ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;

  if (!livreurId || !token) {
    return new Response(JSON.stringify({ error: "Missing livreur id or bearer token" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const [{ data: profile }, { data: settings }] = await Promise.all([
    admin.from("profiles").select("id, api_token, api_enabled").eq("id", livreurId).maybeSingle(),
    admin.from("livreur_api_settings").select("*").eq("livreur_id", livreurId).maybeSingle(),
  ]);

  if (!profile || profile.api_token !== token) {
    return new Response(JSON.stringify({ error: "Invalid credentials" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let payload: any = {};
  try { payload = await req.json(); } catch { payload = {}; }

  const trackingField = settings?.webhook_tracking_field || "trackingID";
  const statusField = settings?.webhook_status_field || "status";
  const tracking = getPath(payload, trackingField) || payload.tracking_id || payload.trackingNumber || payload.partnerTrackingID;
  const mappedStatus = normalizeStatus(getPath(payload, statusField), settings?.status_mapping ?? {});
  const message = payload.message || payload.msg || payload.description || null;

  if (!tracking || !mappedStatus) {
    return new Response(JSON.stringify({ error: "Webhook requires tracking and status" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const { data: order } = await admin
    .from("orders")
    .select("id, status")
    .eq("assigned_livreur_id", livreurId)
    .or(`external_tracking_number.eq.${tracking},tracking_number.eq.${tracking}`)
    .maybeSingle();

  if (!order) {
    return new Response(JSON.stringify({ error: "Order not found for tracking" }), {
      status: 404,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  await admin.from("order_status_history").insert({
    order_id: order.id,
    old_status: order.status,
    new_status: mappedStatus,
    changed_by: livreurId,
    notes: message,
  });

  if (settings?.webhook_updates_current_status !== false) {
    await admin.from("orders").update({ status: mappedStatus, status_note: message }).eq("id", order.id);
  }

  return new Response(JSON.stringify({ ok: true, order_id: order.id, status: mappedStatus }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
