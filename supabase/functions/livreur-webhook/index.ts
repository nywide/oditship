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

function getPath(obj: any, path?: string | null) {
  if (!path) return undefined;
  return path.split(".").reduce((acc: any, key) => acc?.[key], obj);
}

function buildCapturedFields(payload: any, mapping: Record<string, string>) {
  return Object.fromEntries(
    Object.entries(mapping ?? {})
      .map(([key, path]) => [key, getPath(payload, path)])
      .filter(([key, value]) => String(key).trim() && value !== undefined),
  );
}

function parseDateValue(value: unknown) {
  if (value === undefined || value === null || value === "") return null;
  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
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

async function logApi(admin: any, entry: Record<string, unknown>) {
  await admin.from("livreur_api_logs").insert({
    order_id: entry.order_id ?? null,
    livreur_id: entry.livreur_id ?? null,
    event_type: entry.event_type,
    status: entry.status,
    message: entry.message ?? null,
    details: entry.details ?? {},
  });
}

async function findOrderByTracking(admin: any, livreurId: string, tracking: string) {
  const baseSelect = "id, status";
  const external = await admin
    .from("orders")
    .select(baseSelect)
    .eq("assigned_livreur_id", livreurId)
    .eq("external_tracking_number", tracking)
    .maybeSingle();
  if (external.data || external.error) return external;
  return admin
    .from("orders")
    .select(baseSelect)
    .eq("assigned_livreur_id", livreurId)
    .eq("tracking_number", tracking)
    .maybeSingle();
}

async function removeRecentSystemDuplicate(admin: any, order: any, mappedStatus: string) {
  const since = new Date(Date.now() - 5000).toISOString();
  await admin
    .from("order_status_history")
    .delete()
    .eq("order_id", order.id)
    .eq("old_status", order.status)
    .eq("new_status", mappedStatus)
    .is("changed_by", null)
    .gte("changed_at", since);
}

async function latestDuplicate(admin: any, orderId: number, mappedStatus: string, livreurId: string) {
  const { data } = await admin
    .from("order_status_history")
    .select("id, new_status, changed_by")
    .eq("order_id", orderId)
    .eq("new_status", mappedStatus)
    .eq("changed_by", livreurId)
    .order("changed_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data ?? null;
}

async function updateOrderStatusFromProvider(admin: any, order: any, mappedStatus: string, livreurId: string, meta: Record<string, unknown>, updateCurrentStatus = true) {
  const orderPatch = {
    ...(updateCurrentStatus ? { status: mappedStatus } : {}),
    status_note: meta.note ?? null,
    postponed_date: meta.reported_date ?? null,
    scheduled_date: meta.scheduled_date ?? null,
  };
  const { error: updateError } = await admin.from("orders").update(orderPatch).eq("id", order.id);
  if (updateError) return updateError;
  if (updateCurrentStatus) await removeRecentSystemDuplicate(admin, order, mappedStatus);
  const duplicate = await latestDuplicate(admin, order.id, mappedStatus, livreurId);
  if (duplicate) {
    await admin.from("order_status_history").update({ notes: meta.note ?? null, provider_note: meta.note ?? null, reported_date: meta.reported_date ?? null, scheduled_date: meta.scheduled_date ?? null }).eq("id", duplicate.id);
    return null;
  }
  const { error: historyError } = await admin.from("order_status_history").insert({
    order_id: order.id,
    old_status: order.status,
    new_status: mappedStatus,
    changed_by: livreurId,
    notes: meta.note ?? null,
    provider_note: meta.note ?? null,
    reported_date: meta.reported_date ?? null,
    scheduled_date: meta.scheduled_date ?? null,
  });
  return historyError;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  const url = new URL(req.url);
  const parts = url.pathname.split("/").filter(Boolean);
  const idIdx = parts.findIndex((p) => p === "livreur-webhook");
  const livreurId = idIdx >= 0 ? parts[idIdx + 1] : null;

  const auth = req.headers.get("Authorization") ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;

  if (!livreurId || !token) {
    return jsonResponse({ error: "Missing livreur id or bearer token" }, 401);
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
    return jsonResponse({ error: "Invalid credentials" }, 401);
  }

  let payload: any = {};
  try { payload = await req.json(); } catch { payload = {}; }

  const trackingField = settings?.webhook_tracking_field || "trackingID";
  const statusField = settings?.webhook_status_field || "status";
  const tracking = getPath(payload, trackingField) || payload.tracking_id || payload.trackingNumber || payload.partnerTrackingID;
  const rawStatus = getPath(payload, statusField);
  const mappedStatus = mapProviderStatus(rawStatus, settings?.status_mapping ?? {});
  const message = getPath(payload, settings?.webhook_note_field || "note") ?? payload.message ?? payload.msg ?? payload.description ?? null;
  const reportedDate = parseDateValue(getPath(payload, settings?.webhook_reported_date_field || "reportedDate"));
  const scheduledDate = parseDateValue(getPath(payload, settings?.webhook_scheduled_date_field || "scheduledDate"));
  const meta = { note: message, reported_date: reportedDate, scheduled_date: scheduledDate };
  const driverName = getPath(payload, settings?.webhook_driver_name_field || "transport.currentDriverName") ?? null;
  const driverPhone = getPath(payload, settings?.webhook_driver_phone_field || "transport.currentDriverPhone") ?? null;
  const capturedFields = buildCapturedFields(payload, settings?.webhook_extra_fields_mapping ?? {});

  if (!tracking || !String(rawStatus ?? "").trim()) {
    await logApi(admin, { livreur_id: livreurId, event_type: "webhook_status", status: "failed", message: "Webhook requires tracking and status", details: { trackingField, statusField, payload } });
    return jsonResponse({ error: "Webhook requires tracking and status" }, 400);
  }

  if (!settings || settings.is_active === false) {
    await logApi(admin, { livreur_id: livreurId, event_type: "webhook_status", status: "ignored", message: "API settings disabled", details: { tracking, raw_status: rawStatus } });
    return jsonResponse({ ok: true, ignored: true, reason: "settings_disabled" });
  }

  if (!mappedStatus) {
    await logApi(admin, { livreur_id: livreurId, event_type: "webhook_status", status: "ignored", message: "Provider status is not mapped", details: { tracking, raw_status: rawStatus, status_mapping: settings?.status_mapping ?? {} } });
    return jsonResponse({ ok: true, ignored: true, reason: "status_not_mapped" });
  }

  const { data: order, error: orderError } = await findOrderByTracking(admin, livreurId, String(tracking).trim());

  if (orderError || !order) {
    await logApi(admin, { livreur_id: livreurId, event_type: "webhook_status", status: "failed", message: "Order not found for tracking", details: { tracking, raw_status: rawStatus, error: orderError?.message } });
    return jsonResponse({ error: "Order not found for tracking" }, 404);
  }

  const shouldUpdateCurrentStatus = settings.webhook_updates_current_status === true;
  if (shouldUpdateCurrentStatus && mappedStatus !== order.status) {
    const updateError = await updateOrderStatusFromProvider(admin, order, mappedStatus, livreurId, meta, true);
    if (updateError) {
      await logApi(admin, { order_id: order.id, livreur_id: livreurId, event_type: "webhook_status", status: "failed", message: "Unable to update order status", details: { tracking, raw_status: rawStatus, mapped_status: mappedStatus, error: updateError.message } });
      return jsonResponse({ error: "Unable to update order status" }, 500);
    }
  } else {
    const duplicate = await latestDuplicate(admin, order.id, mappedStatus, livreurId);
    if (duplicate) {
      await admin.from("order_status_history").update({ notes: message, provider_note: message, reported_date: reportedDate, scheduled_date: scheduledDate }).eq("id", duplicate.id);
      await admin.from("orders").update({ status_note: message, postponed_date: reportedDate, scheduled_date: scheduledDate }).eq("id", order.id);
      await logApi(admin, { order_id: order.id, livreur_id: livreurId, event_type: "webhook_status", status: "ignored", message: "Duplicate status updated with latest metadata", details: { tracking, raw_status: rawStatus, mapped_status: mappedStatus, note: message, reported_date: reportedDate, scheduled_date: scheduledDate, driver_name: driverName, driver_phone: driverPhone, captured_fields: capturedFields } });
      return jsonResponse({ ok: true, ignored: true, reason: "duplicate_status", order_id: order.id, status: mappedStatus });
    }
    await admin.from("orders").update({ status_note: message, postponed_date: reportedDate, scheduled_date: scheduledDate }).eq("id", order.id);
    const { error: historyError } = await admin.from("order_status_history").insert({
      order_id: order.id,
      old_status: order.status,
      new_status: mappedStatus,
      changed_by: livreurId,
      notes: message,
      provider_note: message,
      reported_date: reportedDate,
      scheduled_date: scheduledDate,
    });
    if (historyError) {
      await logApi(admin, { order_id: order.id, livreur_id: livreurId, event_type: "webhook_status", status: "failed", message: "Unable to record status history", details: { tracking, raw_status: rawStatus, mapped_status: mappedStatus, error: historyError.message } });
      return jsonResponse({ error: "Unable to record status history" }, 500);
    }
  }

  await logApi(admin, { order_id: order.id, livreur_id: livreurId, event_type: "webhook_status", status: "success", message: shouldUpdateCurrentStatus ? "Order status and history updated" : "History updated only", details: { tracking, raw_status: rawStatus, mapped_status: mappedStatus, updated_current_status: shouldUpdateCurrentStatus && mappedStatus !== order.status, note: message, reported_date: reportedDate, scheduled_date: scheduledDate, driver_name: driverName, driver_phone: driverPhone, captured_fields: capturedFields } });

  return jsonResponse({ ok: true, order_id: order.id, status: mappedStatus, updated_current_status: shouldUpdateCurrentStatus && mappedStatus !== order.status });
});
