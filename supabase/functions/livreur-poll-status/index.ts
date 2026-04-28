import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function getPath(obj: any, path?: string | null) {
  if (!path) return undefined;
  return path.split(".").reduce((acc: any, key) => acc?.[key], obj);
}

function setPath(obj: Record<string, any>, path: string, value: unknown) {
  const keys = path.split(".");
  let cur = obj;
  keys.slice(0, -1).forEach((key) => {
    if (!cur[key] || typeof cur[key] !== "object") cur[key] = {};
    cur = cur[key];
  });
  cur[keys[keys.length - 1]] = value ?? "";
}

function mapProviderStatus(status: unknown, mapping: Record<string, string>) {
  const raw = String(status ?? "").trim();
  if (!raw) return null;
  const direct = mapping[raw];
  if (typeof direct === "string" && direct.trim()) return direct.trim();
  const normalizedRaw = raw.toLowerCase();
  const match = Object.entries(mapping ?? {}).find(([providerStatus]) => providerStatus.trim().toLowerCase() === normalizedRaw);
  return typeof match?.[1] === "string" && match[1].trim() ? match[1].trim() : null;
}

function resolveValue(order: Record<string, any>, source: unknown) {
  const value = String(source ?? "");
  if (value === "external_tracking") return order.external_tracking_number || order.tracking_number;
  if (value.startsWith("secret:")) return Deno.env.get(value.slice(7)) ?? "";
  return getPath(order, value);
}

function buildPayload(order: Record<string, any>, mapping: Record<string, string>) {
  const payload: Record<string, any> = {};
  Object.entries(mapping ?? {}).forEach(([target, source]) => setPath(payload, target, resolveValue(order, source)));
  return payload;
}

async function authenticate(order: Record<string, any>, headers: Record<string, string>, authConfig: Record<string, any> | null) {
  if (!authConfig || authConfig.type === "none" || !authConfig.url) return headers;
  const response = await fetch(authConfig.url, {
    method: authConfig.method || "POST",
    headers: { "Content-Type": "application/json", ...(authConfig.headers ?? {}) },
    body: JSON.stringify(buildPayload(order, authConfig.payload_mapping ?? {})),
  });
  const text = await response.text();
  let parsed: any = {};
  try { parsed = JSON.parse(text); } catch { parsed = { raw: text }; }
  if (!response.ok) throw new Error(`Authentication ${response.status}: ${parsed?.description || parsed?.message || text}`);
  const token = getPath(parsed, authConfig.response_token_path || "token");
  if (!token) throw new Error("Authentication: missing token in response");
  return { ...headers, [authConfig.token_header || "Authorization"]: `${authConfig.token_prefix ?? "Bearer "}${token}` };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false, autoRefreshToken: false } });

  const { data: settingsRows, error } = await admin
    .from("livreur_api_settings")
    .select("*")
    .eq("is_active", true)
    .eq("polling_enabled", true)
    .not("polling_status_url", "is", null);
  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  const now = Date.now();
  let checked = 0;
  let updated = 0;

  for (const settings of settingsRows ?? []) {
    const lastRun = settings.polling_last_run_at ? new Date(settings.polling_last_run_at).getTime() : 0;
    const intervalMs = Math.max(Number(settings.polling_interval_minutes) || 15, 1) * 60_000;
    if (lastRun && now - lastRun < intervalMs) continue;

    const { data: orders } = await admin
      .from("orders")
      .select("*")
      .eq("assigned_livreur_id", settings.livreur_id)
      .not("external_tracking_number", "is", null)
      .limit(200);

    const delayMs = Math.ceil(1000 / Math.max(Number(settings.rate_limit_per_second) || 5, 0.1));
    for (const order of orders ?? []) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
      const method = String(settings.polling_status_method || "GET").toUpperCase();
      const headers = await authenticate(order, settings.polling_status_headers ?? {}, settings.auth_config ?? null);
      const payload = buildPayload(order, settings.polling_status_payload_mapping ?? { trackingID: "external_tracking" });
      const url = String(settings.polling_status_url).replace("{tracking}", encodeURIComponent(order.external_tracking_number || order.tracking_number || ""));
      const response = await fetch(url, { method, headers: { "Content-Type": "application/json", ...headers }, body: method === "GET" ? undefined : JSON.stringify(payload) });
      checked += 1;
      if (!response.ok) continue;
      const body = await response.json().catch(() => ({}));
      const mappedStatus = mapProviderStatus(getPath(body, settings.polling_status_field), settings.status_mapping ?? {});
      if (!mappedStatus || mappedStatus === order.status) continue;
      const message = getPath(body, settings.polling_message_field) ?? null;
      await admin.from("order_status_history").insert({ order_id: order.id, old_status: order.status, new_status: mappedStatus, changed_by: settings.livreur_id, notes: message });
      await admin.from("orders").update({ status: mappedStatus, status_note: message }).eq("id", order.id);
      updated += 1;
    }

    await admin.from("livreur_api_settings").update({ polling_last_run_at: new Date().toISOString() }).eq("livreur_id", settings.livreur_id);
  }

  return new Response(JSON.stringify({ ok: true, checked, updated }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
});