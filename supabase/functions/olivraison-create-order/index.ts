import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse({ error: "Method not allowed" }, 405);

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return jsonResponse({ error: "Missing Authorization header" }, 401);

  let body: { order_id?: number; livreur_id?: string };
  try { body = await req.json(); } catch { return jsonResponse({ error: "Invalid JSON body" }, 400); }
  if (!body.order_id || typeof body.order_id !== "number") return jsonResponse({ error: "order_id (number) required" }, 400);

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false, autoRefreshToken: false } });

  let livreurId = body.livreur_id;
  if (!livreurId) {
    const { data: order } = await admin.from("orders").select("customer_city").eq("id", body.order_id).single();
    const { data: hubCity } = await admin.from("hub_cities").select("hub_id").eq("city_name", order?.customer_city).limit(1).maybeSingle();
    const { data: hubLivreur } = await admin.from("hub_livreur").select("livreur_id").eq("hub_id", hubCity?.hub_id).maybeSingle();
    livreurId = hubLivreur?.livreur_id;
  }

  const gatewayUrl = `${SUPABASE_URL}/functions/v1/livreur-gateway`;
  const response = await fetch(gatewayUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: authHeader },
    body: JSON.stringify({ order_id: body.order_id, livreur_id: livreurId }),
  });
  const text = await response.text();
  return new Response(text, {
    status: response.status,
    headers: { ...corsHeaders, "Content-Type": response.headers.get("Content-Type") || "application/json" },
  });
});
