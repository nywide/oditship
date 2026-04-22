// One-shot endpoint to seed default ramassoire + administrateur users.
// Idempotent: safe to call multiple times.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SeedUser {
  email: string;
  password: string;
  username: string;
  role: "ramassoire" | "administrateur";
  full_name: string;
  phone: string;
  cin: string;
}

const DEFAULTS: SeedUser[] = [
  {
    email: "ramassoire@odit.ma",
    password: "ramassoire123",
    username: "ramassoire",
    role: "ramassoire",
    full_name: "Ramassoire Principal",
    phone: "+212600000000",
    cin: "DEFAULT123",
  },
  {
    email: "admin@odit.ma",
    password: "admin123",
    username: "administrateur",
    role: "administrateur",
    full_name: "Administrateur Principal",
    phone: "+212600000001",
    cin: "ADMIN001",
  },
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const results: Array<{ username: string; status: string; user_id?: string; error?: string }> = [];

    for (const user of DEFAULTS) {
      // Check if profile already exists by username
      const { data: existing } = await admin
        .from("profiles")
        .select("id, username")
        .eq("username", user.username)
        .maybeSingle();

      if (existing) {
        results.push({ username: user.username, status: "already_exists", user_id: existing.id });
        continue;
      }

      // Create auth user (email pre-confirmed)
      const { data: created, error: createErr } = await admin.auth.admin.createUser({
        email: user.email,
        password: user.password,
        email_confirm: true,
        user_metadata: {
          username: user.username,
          full_name: user.full_name,
          phone: user.phone,
          cin: user.cin,
          role: user.role,
        },
      });

      if (createErr || !created.user) {
        results.push({ username: user.username, status: "auth_error", error: createErr?.message });
        continue;
      }

      // The trigger handle_new_user creates profile + user_role from metadata.
      // Ensure profile.role and user_roles entry are set correctly (in case metadata path failed).
      await admin
        .from("profiles")
        .update({
          role: user.role,
          full_name: user.full_name,
          phone: user.phone,
          cin: user.cin,
        })
        .eq("id", created.user.id);

      await admin
        .from("user_roles")
        .upsert({ user_id: created.user.id, role: user.role }, { onConflict: "user_id,role" });

      results.push({ username: user.username, status: "created", user_id: created.user.id });
    }

    return new Response(JSON.stringify({ ok: true, results }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown";
    return new Response(JSON.stringify({ ok: false, error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
