// Admin-only: permanently delete an auth user (and cascading rows).
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

  let body: { targetUserId?: string };
  try { body = await req.json(); } catch { return json(400, { error: "Invalid JSON" }); }
  if (!body.targetUserId) return json(400, { error: "targetUserId required" });
  if (body.targetUserId === callerId) return json(400, { error: "Cannot delete your own account" });

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false, autoRefreshToken: false } });

  const { data: callerRoles } = await admin.from("user_roles").select("role").eq("user_id", callerId);
  const isAdmin = (callerRoles ?? []).some((r) => r.role === "administrateur");
  if (!isAdmin) return json(403, { error: "Forbidden" });

  const { error: delErr } = await admin.auth.admin.deleteUser(body.targetUserId);
  if (delErr) return json(400, { error: delErr.message });

  return json(200, { ok: true });
});
