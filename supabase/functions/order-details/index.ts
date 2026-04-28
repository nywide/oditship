import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const OLIVRAISON_BASE = "https://partners.olivraison.com";

async function olivraisonLogin(apiKey: string, secretKey: string): Promise<string> {
  const r = await fetch(`${OLIVRAISON_BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ apiKey, secretKey }),
  });
  if (!r.ok) throw new Error(`Olivraison auth failed (${r.status})`);
  const j = await r.json();
  if (!j.token) throw new Error("Olivraison auth: no token");
  return j.token;
}

async function getOlivraisonPackage(token: string, trackingID: string) {
  const r = await fetch(`${OLIVRAISON_BASE}/package/${encodeURIComponent(trackingID)}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const text = await r.text();
  let parsed: any = null;
  try { parsed = JSON.parse(text); } catch { parsed = { raw: text }; }
  if (!r.ok) throw new Error(parsed?.description || `Olivraison package failed (${r.status})`);
  return parsed;
}

function isInternalConfirmed(status?: string | null) {
  const normalized = status?.toLowerCase();
  return normalized === "confirmed";
}

function isApiCreatedConfirmed(status?: string | null, message?: string | null) {
  const normalizedStatus = status?.toLowerCase();
  const normalizedMessage = message?.toLowerCase() ?? "";
  return normalizedStatus === "confirmed" && normalizedMessage.includes("colis cre") && normalizedMessage.includes("azizshop") && normalizedMessage.includes("api");
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

function latestMappedProviderEvent(history: any[], mapping: Record<string, string>) {
  return history
    .map((item) => ({ ...item, mappedStatus: mapProviderStatus(item?.status, mapping) }))
    .filter((item) => item.mappedStatus && item.updateAt && !isApiCreatedConfirmed(item.mappedStatus, item.msg))
    .sort((a, b) => new Date(b.updateAt).getTime() - new Date(a.updateAt).getTime())[0] ?? null;
}

function removeSystemDuplicates(history: any[]) {
  const providerKeys = new Set(
    (history ?? [])
      .filter((h: any) => h.changed_by)
      .map((h: any) => `${h.old_status ?? ""}|${h.new_status ?? ""}`),
  );
  return (history ?? []).filter((h: any) => h.changed_by || !providerKeys.has(`${h.old_status ?? ""}|${h.new_status ?? ""}`));
}

async function hasLatestDuplicate(admin: any, orderId: number, mappedStatus: string, livreurId: string) {
  const { data } = await admin
    .from("order_status_history")
    .select("new_status, changed_by")
    .eq("order_id", orderId)
    .order("changed_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data?.new_status === mappedStatus && data?.changed_by === livreurId;
}

async function syncCurrentStatusFromProvider(admin: any, order: any, latestEvent: any, livreurId: string) {
  if (!latestEvent?.mappedStatus || latestEvent.mappedStatus === order.status) return order;
  const message = latestEvent.msg ?? null;
  const { data: updated, error } = await admin
    .from("orders")
    .update({ status: latestEvent.mappedStatus, status_note: message })
    .eq("id", order.id)
    .select("*")
    .single();
  if (error || !updated) throw error ?? new Error("Unable to sync current status");
  await admin
    .from("order_status_history")
    .delete()
    .eq("order_id", order.id)
    .eq("old_status", order.status)
    .eq("new_status", latestEvent.mappedStatus)
    .is("changed_by", null)
    .gte("changed_at", new Date(Date.now() - 5000).toISOString());
  if (await hasLatestDuplicate(admin, order.id, latestEvent.mappedStatus, livreurId)) return updated;
  await admin.from("order_status_history").insert({
    order_id: order.id,
    old_status: order.status,
    new_status: latestEvent.mappedStatus,
    changed_by: livreurId,
    notes: message,
  });
  return updated;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const ANON = Deno.env.get("SUPABASE_PUBLISHABLE_KEY") || Deno.env.get("SUPABASE_ANON_KEY")!;
  const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const OLI_KEY = Deno.env.get("OLIVRAISON_API_KEY");
  const OLI_SECRET = Deno.env.get("OLIVRAISON_SECRET_KEY");
  const authHeader = req.headers.get("Authorization");

  if (!authHeader) {
    return new Response(JSON.stringify({ error: "Missing Authorization header" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const userClient = createClient(SUPABASE_URL, ANON, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false },
  });
  const { data: userData, error: userErr } = await userClient.auth.getUser();
  if (userErr || !userData.user) {
    return new Response(JSON.stringify({ error: "Invalid session" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let payload: { order_id?: number } = {};
  try { payload = await req.json(); } catch { /* ignore */ }
  if (!payload.order_id || typeof payload.order_id !== "number") {
    return new Response(JSON.stringify({ error: "order_id required" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const callerId = userData.user.id;

  const { data: order, error: orderErr } = await admin
    .from("orders")
    .select("*")
    .eq("id", payload.order_id)
    .single();

  if (orderErr || !order) {
    return new Response(JSON.stringify({ error: "Order not found" }), {
      status: 404,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const [{ data: callerProfile }, { data: callerRoles }] = await Promise.all([
    admin.from("profiles").select("id, agent_of").eq("id", callerId).maybeSingle(),
    admin.from("user_roles").select("role").eq("user_id", callerId),
  ]);

  const isPrivileged = (callerRoles ?? []).some((r: any) => ["administrateur", "superviseur", "ramassoire", "livreur", "support", "suivi"].includes(r.role));
  const isVendeurOwner = order.vendeur_id === callerId;
  const isAgentOfVendeur = callerProfile?.agent_of && callerProfile.agent_of === order.vendeur_id;
  const isAssignedLivreur = order.assigned_livreur_id === callerId;

  if (!isPrivileged && !isVendeurOwner && !isAgentOfVendeur && !isAssignedLivreur) {
    return new Response(JSON.stringify({ error: "Forbidden" }), {
      status: 403,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const [{ data: history }, { data: livreur }, { data: vendeur }, { data: settings }] = await Promise.all([
    admin.from("order_status_history").select("id, old_status, new_status, changed_at, changed_by, notes").eq("order_id", order.id).order("changed_at", { ascending: true }),
    order.assigned_livreur_id
      ? admin.from("profiles").select("id, full_name, username, phone").eq("id", order.assigned_livreur_id).maybeSingle()
      : Promise.resolve({ data: null }),
    admin.from("profiles").select("id, full_name, username, company_name, phone").eq("id", order.vendeur_id).maybeSingle(),
    order.assigned_livreur_id
      ? admin.from("livreur_api_settings").select("status_mapping, webhook_updates_current_status").eq("livreur_id", order.assigned_livreur_id).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  const actorIds = Array.from(new Set((history ?? []).map((h: any) => h.changed_by).filter(Boolean)));
  let actors: Record<string, any> = {};
  if (actorIds.length > 0) {
    const { data: rows } = await admin.from("profiles").select("id, full_name, username, role").in("id", actorIds);
    (rows ?? []).forEach((p: any) => { actors[p.id] = p; });
  }

  let packageDetails: any = null;
  let packageError: string | null = null;
  const tracking = order.external_tracking_number || order.tracking_number;
  if (order.external_tracking_number && OLI_KEY && OLI_SECRET) {
    try {
      const token = await olivraisonLogin(OLI_KEY, OLI_SECRET);
      packageDetails = await getOlivraisonPackage(token, order.external_tracking_number);
    } catch (e) {
      packageError = e instanceof Error ? e.message : "Olivraison unavailable";
    }
  }

  const statusMapping = settings?.status_mapping ?? {};
  const apiHistory = Array.isArray(packageDetails?.history) ? packageDetails.history : [];
  let currentOrder = order;
  const latestProviderEvent = latestMappedProviderEvent(apiHistory, statusMapping);
  if (settings?.webhook_updates_current_status === true && order.assigned_livreur_id && latestProviderEvent) {
    try {
      currentOrder = await syncCurrentStatusFromProvider(admin, order, latestProviderEvent, order.assigned_livreur_id);
    } catch (e) {
      packageError = e instanceof Error ? e.message : "Synchronisation du statut indisponible";
    }
  }
  const visibleDbHistory = removeSystemDuplicates(history ?? []);
  const seenTimeline = new Set<string>();
  const mergedHistory = [
    ...visibleDbHistory.filter((h: any) => !isInternalConfirmed(h.new_status) && !isInternalConfirmed(h.old_status)).map((h: any) => ({
      source: "odit",
      status: h.new_status,
      old_status: h.old_status,
      message: h.notes,
      changed_at: h.changed_at,
      actor: h.changed_by ? actors[h.changed_by] ?? null : null,
    })),
    ...apiHistory.filter((h: any) => mapProviderStatus(h.status, statusMapping) && !isApiCreatedConfirmed(mapProviderStatus(h.status, statusMapping), h.msg)).map((h: any) => ({
      source: "olivraison",
      status: mapProviderStatus(h.status, statusMapping),
      message: h.msg,
      changed_at: h.updateAt,
      actor: h.user ? { username: h.user } : null,
      reported_to: h.reportedTo ?? null,
    })),
  ]
    .sort((a, b) => new Date(a.changed_at).getTime() - new Date(b.changed_at).getTime())
    .filter((item: any) => {
      const key = `${item.status ?? ""}|${item.actor?.username ?? item.actor?.full_name ?? ""}`.toLowerCase();
      if (seenTimeline.has(key)) return false;
      seenTimeline.add(key);
      return true;
    });

  return new Response(JSON.stringify({
    order: currentOrder,
    tracking,
    vendeur,
    livreur: {
      name: packageDetails?.transport?.currentDriverName || livreur?.full_name || livreur?.username || null,
      phone: packageDetails?.transport?.currentDriverPhone || livreur?.phone || null,
    },
    support: null,
    destination: packageDetails?.destination ?? null,
    history: mergedHistory,
    package_error: packageError,
  }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
