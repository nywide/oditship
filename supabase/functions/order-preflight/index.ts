import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type JsonRecord = Record<string, any>;

function jsonResponse(body: JsonRecord, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

function getPath(obj: any, path?: string | null) {
  if (!path) return undefined;
  return path.split(".").reduce((acc: any, key) => acc?.[key], obj);
}

function alnumCount(value: unknown) {
  return String(value ?? "").replace(/[^\p{L}\p{N}]/gu, "").length;
}

function validateOrder(order: JsonRecord, rules: JsonRecord) {
  for (const [field, rule] of Object.entries(rules ?? {})) {
    const value = getPath(order, field);
    if (rule?.min_alnum && alnumCount(value) < Number(rule.min_alnum)) throw new Error(`${field}: minimum ${rule.min_alnum} lettres ou chiffres`);
    if (rule?.min_length && String(value ?? "").trim().length < Number(rule.min_length)) throw new Error(`${field}: minimum ${rule.min_length} caractères`);
    if (rule?.digits && String(value ?? "").replace(/\D/g, "").length !== Number(rule.digits)) throw new Error(`${field}: doit contenir ${rule.digits} chiffres`);
    if (rule?.min !== undefined && Number(value) < Number(rule.min)) throw new Error(`${field}: minimum ${rule.min}`);
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse({ error: "Method not allowed" }, 405);

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return jsonResponse({ error: "Session requise" }, 401);

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const ANON = Deno.env.get("SUPABASE_PUBLISHABLE_KEY") || Deno.env.get("SUPABASE_ANON_KEY")!;
  const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const userClient = createClient(SUPABASE_URL, ANON, { global: { headers: { Authorization: authHeader } }, auth: { persistSession: false } });
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false, autoRefreshToken: false } });

  const { data: userData, error: userErr } = await userClient.auth.getUser();
  if (userErr || !userData.user) return jsonResponse({ error: "Session invalide" }, 401);

  let body: { city?: string; order?: JsonRecord } = {};
  try { body = await req.json(); } catch { return jsonResponse({ error: "Invalid JSON body" }, 400); }
  const city = String(body.city || body.order?.customer_city || "").trim();
  if (!city) return jsonResponse({ error: "Ville obligatoire" }, 400);

  const { data: hubCity } = await admin.from("hub_cities").select("hub_id").eq("city_name", city).limit(1).maybeSingle();
  if (!hubCity) return jsonResponse({ error: "Cette ville n'est assignée à aucun hub" }, 422);

  const { data: hubLivreur } = await admin.from("hub_livreur").select("livreur_id").eq("hub_id", hubCity.hub_id).maybeSingle();
  if (!hubLivreur?.livreur_id) return jsonResponse({ error: "Aucun livreur n'est assigné au hub de cette ville" }, 422);

  const [{ data: livreur }, { data: settings }] = await Promise.all([
    admin.from("profiles").select("id, full_name, username, api_enabled").eq("id", hubLivreur.livreur_id).maybeSingle(),
    admin.from("livreur_api_settings").select("validation_rules, is_active").eq("livreur_id", hubLivreur.livreur_id).maybeSingle(),
  ]);
  if (!livreur) return jsonResponse({ error: "Livreur introuvable" }, 422);

  try {
    if (livreur.api_enabled && settings?.is_active !== false) validateOrder(body.order ?? {}, settings?.validation_rules ?? {});
  } catch (error) {
    return jsonResponse({ error: error instanceof Error ? error.message : "Commande non conforme aux règles du livreur" }, 422);
  }

  return jsonResponse({ ok: true, livreur_id: livreur.id, livreur_name: livreur.full_name || livreur.username });
});