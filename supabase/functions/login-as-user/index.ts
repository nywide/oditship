// Admin "Login as user": generates a magic link for the target user and returns it.
// Only administrateurs may call this. The returned URL contains an OTP token that
// when opened logs the browser in as the target user.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (status: number, obj: unknown) =>
  new Response(JSON.stringify(obj), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json(405, { error: "Method not allowed" });

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const ANON = Deno.env.get("SUPABASE_PUBLISHABLE_KEY") || Deno.env.get("SUPABASE_ANON_KEY")!;
  const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return json(401, { error: "Missing Authorization" });

  const userClient = createClient(SUPABASE_URL, ANON, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false },
  });
  const { data: who, error: whoErr } = await userClient.auth.getUser();
  if (whoErr || !who.user) return json(401, { error: "Invalid session" });
  const callerId = who.user.id;

  let body: { user_id?: string; redirect_to?: string };
  try { body = await req.json(); } catch { return json(400, { error: "Invalid JSON" }); }
  if (!body.user_id) return json(400, { error: "user_id required" });

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false, autoRefreshToken: false } });

  const { data: callerRoles } = await admin.from("user_roles").select("role").eq("user_id", callerId);
  const isAdmin = (callerRoles ?? []).some((r) => r.role === "administrateur");
  if (!isAdmin) return json(403, { error: "Forbidden" });

  // Get email of target
  const { data: targetUser, error: tErr } = await admin.auth.admin.getUserById(body.user_id);
  if (tErr || !targetUser.user?.email) return json(404, { error: "Target user not found" });

  const { data: link, error: linkErr } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email: targetUser.user.email,
    options: { redirectTo: body.redirect_to || `${SUPABASE_URL.replace(".supabase.co", ".lovable.app")}/dashboard` },
  });
  if (linkErr) return json(400, { error: linkErr.message });

  return json(200, { ok: true, action_link: link.properties?.action_link, hashed_token: link.properties?.hashed_token, email_otp: link.properties?.email_otp });
});
