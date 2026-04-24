// Returns access_token + refresh_token for a target user. Admin only.
// Used by /impersonate page which sets the session into sessionStorage so the
// original admin tab (using localStorage) is unaffected.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (status: number, obj: unknown) =>
  new Response(JSON.stringify(obj), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

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

  let body: { targetUserId?: string };
  try {
    body = await req.json();
  } catch {
    return json(400, { error: "Invalid JSON" });
  }
  if (!body.targetUserId) return json(400, { error: "targetUserId required" });

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // Verify caller is administrateur via user_roles
  const { data: callerRoles } = await admin
    .from("user_roles")
    .select("role")
    .eq("user_id", callerId);
  const isAdmin = (callerRoles ?? []).some((r) => r.role === "administrateur");
  if (!isAdmin) return json(403, { error: "Forbidden" });

  // Fetch target email
  const { data: targetUser, error: tErr } = await admin.auth.admin.getUserById(body.targetUserId);
  if (tErr || !targetUser.user?.email) return json(404, { error: "Target user not found" });

  // Generate a magic link, then exchange the OTP for a real session (access + refresh tokens)
  const { data: link, error: linkErr } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email: targetUser.user.email,
  });
  if (linkErr || !link.properties?.email_otp) {
    return json(400, { error: linkErr?.message || "Failed to generate link" });
  }

  // Use a fresh anon client (no persisted session) to verify the OTP and get tokens
  const otpClient = createClient(SUPABASE_URL, ANON, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: verified, error: vErr } = await otpClient.auth.verifyOtp({
    type: "magiclink",
    email: targetUser.user.email,
    token: link.properties.email_otp,
  });
  if (vErr || !verified.session) {
    return json(400, { error: vErr?.message || "Failed to verify token" });
  }

  return json(200, {
    ok: true,
    access_token: verified.session.access_token,
    refresh_token: verified.session.refresh_token,
  });
});
