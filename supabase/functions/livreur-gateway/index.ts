import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type JsonRecord = Record<string, any>;

function jsonResponse(body: JsonRecord, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function logApi(admin: any, entry: JsonRecord) {
  await admin.from("livreur_api_logs").insert({
    order_id: entry.order_id ?? null,
    livreur_id: entry.livreur_id ?? null,
    event_type: entry.event_type,
    status: entry.status,
    message: entry.message ?? null,
    details: entry.details ?? {},
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse({ error: "Method not allowed" }, 405);

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return jsonResponse({ error: "Missing Authorization header" }, 401);

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const ANON = Deno.env.get("SUPABASE_PUBLISHABLE_KEY") || Deno.env.get("SUPABASE_ANON_KEY")!;
  const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const userClient = createClient(SUPABASE_URL, ANON, { global: { headers: { Authorization: authHeader } }, auth: { persistSession: false } });
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false, autoRefreshToken: false } });

  const { data: userData, error: userErr } = await userClient.auth.getUser();
  if (userErr || !userData.user) return jsonResponse({ error: "Invalid session" }, 401);

  let body: { order_id?: number; livreur_id?: string };
  try { body = await req.json(); } catch { return jsonResponse({ error: "Invalid JSON body" }, 400); }
  if (!body.order_id || typeof body.order_id !== "number") return jsonResponse({ error: "order_id (number) required" }, 400);

  const { data: order } = await admin.from("orders").select("*").eq("id", body.order_id).single();
  if (!order) return jsonResponse({ error: "Order not found" }, 404);

  const callerId = userData.user.id;
  const [{ data: callerProfile }, { data: callerRoles }] = await Promise.all([
    admin.from("profiles").select("id, agent_of").eq("id", callerId).single(),
    admin.from("user_roles").select("role").eq("user_id", callerId),
  ]);
  const isAdmin = (callerRoles ?? []).some((r: any) => r.role === "administrateur");
  const isOwner = order.vendeur_id === callerId;
  const isAgent = callerProfile?.agent_of && callerProfile.agent_of === order.vendeur_id;
  if (!isOwner && !isAgent && !isAdmin) return jsonResponse({ error: "Forbidden" }, 403);
  if (order.status !== "Confirmé") return jsonResponse({ error: `Order must be in 'Confirmé' (current: ${order.status})` }, 400);

  const { data: hubCity } = await admin.from("hub_cities").select("hub_id").eq("city_name", order.customer_city).limit(1).maybeSingle();
  if (!hubCity) {
    const msg = `City "${order.customer_city}" is not assigned to any hub. Contact administrator.`;
    await admin.from("orders").update({ api_sync_status: "failed", api_sync_error: msg }).eq("id", order.id);
    return jsonResponse({ error: msg }, 422);
  }

  let livreurId = body.livreur_id;
  if (!livreurId) {
    const { data: hubLivreur } = await admin.from("hub_livreur").select("livreur_id").eq("hub_id", hubCity.hub_id).maybeSingle();
    livreurId = hubLivreur?.livreur_id;
  }
  if (!livreurId) {
    const msg = "No delivery person assigned to this hub. Contact administrator.";
    await admin.from("orders").update({ api_sync_status: "failed", api_sync_error: msg }).eq("id", order.id);
    return jsonResponse({ error: msg }, 422);
  }

  const { data: livreur } = await admin.from("profiles").select("id, api_enabled").eq("id", livreurId).single();
  if (!livreur) return jsonResponse({ error: "Delivery profile missing" }, 404);

  const insertPickupHistory = async (note: string) => {
    await admin.from("order_status_history").insert({
      order_id: order.id, old_status: order.status, new_status: "Pickup",
      changed_by: callerId, notes: note,
    });
  };

  // No external API → internal tracking
  if (!livreur.api_enabled) {
    const trackingNumber = order.tracking_number || `ODiT-${crypto.randomUUID().replace(/-/g, "").slice(0, 8).toUpperCase()}`;
    const { error } = await admin.from("orders").update({
      tracking_number: trackingNumber, status: "Pickup", assigned_livreur_id: livreur.id,
      hub_id: hubCity.hub_id, api_sync_status: "not_required", api_sync_error: null,
    }).eq("id", order.id);
    if (error) return jsonResponse({ error: error.message }, 500);
    await insertPickupHistory(`Pickup — tracking interne ${trackingNumber}`);
    await logApi(admin, { order_id: order.id, livreur_id: livreur.id, event_type: "create_package", status: "success", message: "Internal tracking generated (API disabled)", details: { mode: "internal_tracking", generated_tracking: trackingNumber } });
    return jsonResponse({ ok: true, mode: "internal_tracking", tracking_number: trackingNumber });
  }

  // External API → delegate to workflow runner
  // Find active workflow with on_pickup_request trigger
  const { data: workflows } = await admin
    .from("livreur_workflows")
    .select("*")
    .eq("livreur_id", livreur.id)
    .eq("enabled", true);
  const workflow = (workflows || []).find((wf: any) =>
    (wf.triggers || []).some((t: any) => t?.enabled !== false && t?.type === "on_pickup_request")
  );

  if (!workflow) {
    const msg = "Aucun workflow Pickup actif configuré pour ce livreur. Configurez un workflow avec le déclencheur 'on_pickup_request'.";
    await admin.from("orders").update({ api_sync_status: "failed", api_sync_error: msg }).eq("id", order.id);
    await logApi(admin, { order_id: order.id, livreur_id: livreur.id, event_type: "create_package", status: "failed", message: msg, details: {} });
    return jsonResponse({ error: msg }, 422);
  }

  // Pre-assign hub/livreur so workflow steps and downstream logic see it
  await admin.from("orders").update({ assigned_livreur_id: livreur.id, hub_id: hubCity.hub_id }).eq("id", order.id);

  // Invoke workflow runner
  const runnerRes = await fetch(`${SUPABASE_URL}/functions/v1/livreur-workflow-runner`, {
    method: "POST",
    headers: { "Content-Type": "application/json", apikey: ANON, Authorization: `Bearer ${ANON}` },
    body: JSON.stringify({
      action: "run",
      workflow_id: workflow.id,
      order_id: order.id,
      trigger_type: "on_pickup_request",
      trigger_payload: { caller_id: callerId },
    }),
  });
  const runnerData = await runnerRes.json().catch(() => ({} as any));

  if (!runnerData?.ok) {
    const errMsg = runnerData?.run?.error_message || runnerData?.error || "Workflow execution failed";
    await admin.from("orders").update({ api_sync_status: "failed", api_sync_error: errMsg }).eq("id", order.id);
    await logApi(admin, { order_id: order.id, livreur_id: livreur.id, event_type: "create_package", status: "failed", message: errMsg, details: { workflow_id: workflow.id, run: runnerData?.run } });
    return jsonResponse({ error: "Commande refusée par le workflow. Contactez l'administration." }, 502);
  }

  // Refetch order to get workflow's tracking update
  const { data: refetched } = await admin.from("orders").select("external_tracking_number, tracking_number, status").eq("id", order.id).single();
  await logApi(admin, { order_id: order.id, livreur_id: livreur.id, event_type: "create_package", status: "success", message: `Workflow ${workflow.name} succeeded`, details: { workflow_id: workflow.id, workflow_name: workflow.name, run_id: runnerData?.run?.id, tracking: refetched?.external_tracking_number } });

  return jsonResponse({
    ok: true,
    mode: "workflow",
    workflow: workflow.name,
    tracking_id: refetched?.external_tracking_number || refetched?.tracking_number || null,
  });
});
