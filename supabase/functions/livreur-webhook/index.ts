// Inbound webhook stub for traditional (non-API) livreurs to push status updates back to ODiT.
// Authenticates the request with the livreur's api_token.
// Implementation is intentionally minimal — full status sync logic will land later.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  // URL: /livreur-webhook/{livreur_id}/order-status
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

  const { data: profile } = await admin
    .from("profiles")
    .select("id, api_token, api_enabled")
    .eq("id", livreurId)
    .maybeSingle();

  if (!profile || profile.api_token !== token) {
    return new Response(JSON.stringify({ error: "Invalid credentials" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let payload: unknown = null;
  try { payload = await req.json(); } catch { /* ignore */ }

  console.log("livreur-webhook received", { livreurId, payload });

  return new Response(JSON.stringify({ message: "Not implemented yet", received: true }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
