import { ReactNode, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Activity, BookOpen, ChevronDown, Clock, ExternalLink, Eye, EyeOff, Gauge, HelpCircle, PackageCheck, RefreshCw, ShieldCheck, SlidersHorizontal, Webhook } from "lucide-react";
import { toast } from "sonner";

interface Livreur { id: string; username: string; full_name: string | null; api_enabled: boolean; api_token: string | null; }
interface Hub { id: number; name: string; }
interface HubLivreur { hub_id: number; livreur_id: string; }
interface LivreurApiSettings {
  livreur_id: string;
  create_package_url: string | null;
  create_package_method: string;
  create_package_headers: Record<string, string>;
  create_package_mapping: Record<string, string>;
  auth_config: Record<string, unknown>;
  api_operations: Array<Record<string, unknown>>;
  validation_rules: Record<string, unknown>;
  status_mapping: Record<string, string>;
  webhook_updates_current_status: boolean;
  webhook_status_field: string;
  webhook_tracking_field: string;
  polling_enabled: boolean;
  polling_interval_minutes: number;
  polling_status_url: string | null;
  polling_status_method: string;
  polling_status_headers: Record<string, string>;
  polling_status_payload_mapping: Record<string, string>;
  polling_tracking_field: string;
  polling_status_field: string;
  polling_message_field: string;
  rate_limit_per_second: number;
  is_active: boolean;
}

const db = supabase as any;

const defaultSettings = (livreurId: string): LivreurApiSettings => ({
  livreur_id: livreurId,
  create_package_url: "",
  create_package_method: "POST",
  create_package_headers: {},
  create_package_mapping: {
    price: "order_value",
    description: "product_name",
    name: "product_name",
    comment: "comment",
    orderId: "id",
    partnerTrackingID: "partner_tracking_id",
    "destination.name": "customer_name",
    "destination.phone": "customer_phone",
    "destination.city": "customer_city",
    "destination.streetAddress": "customer_address",
  },
  auth_config: {
    type: "none",
    url: "",
    method: "POST",
    headers: {},
    payload_mapping: { apiKey: "secret:OLIVRAISON_API_KEY", secretKey: "secret:OLIVRAISON_SECRET_KEY" },
    response_token_path: "token",
    token_header: "Authorization",
    token_prefix: "Bearer ",
    expires_in_path: "expiresIn",
  },
  api_operations: [],
  validation_rules: {
    product_name: { min_alnum: 3 },
    customer_name: { min_length: 2 },
    customer_address: { min_length: 2 },
    customer_phone: { digits: 10 },
    order_value: { min: 1 },
  },
  status_mapping: {
    DELIVERED: "Livré",
    CANCELED: "Annulé",
    REFUSED: "Refusé",
    RETURNED: "Retourné",
    IN_TRANSIT: "En transit",
    PICKUP: "Pickup",
    CONFIRMED: "Confirmé",
  },
  webhook_updates_current_status: true,
  webhook_status_field: "status",
  webhook_tracking_field: "trackingID",
  polling_enabled: false,
  polling_interval_minutes: 15,
  polling_status_url: "",
  polling_status_method: "GET",
  polling_status_headers: {},
  polling_status_payload_mapping: {},
  polling_tracking_field: "trackingID",
  polling_status_field: "status",
  polling_message_field: "message",
  rate_limit_per_second: 5,
  is_active: true,
});

const generateToken = () => {
  const arr = new Uint8Array(24);
  crypto.getRandomValues(arr);
  return Array.from(arr).map((b) => b.toString(16).padStart(2, "0")).join("");
};

const formatJson = (value: unknown) => JSON.stringify(value ?? {}, null, 2);
const parseJson = (label: string, value: string) => {
  try {
    const parsed = JSON.parse(value || "{}");
    if (!parsed || Array.isArray(parsed) || typeof parsed !== "object") throw new Error();
    return parsed;
  } catch {
    throw new Error(`${label}: JSON invalide`);
  }
};
const parseJsonArray = (label: string, value: string) => {
  try {
    const parsed = JSON.parse(value || "[]");
    if (!Array.isArray(parsed)) throw new Error();
    return parsed;
  } catch {
    throw new Error(`${label}: JSON array invalide`);
  }
};

const docs = {
  auth: "https://partners.olivraison.com/docs#tag/auth/POST/auth/login",
  api: "https://partners.olivraison.com/docs",
};

const HelpLink = ({ href, children }: { href: string; children: string }) => (
  <a href={href} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline">
    <BookOpen className="h-3.5 w-3.5" /> {children} <ExternalLink className="h-3 w-3" />
  </a>
);

const FieldHelp = ({ children }: { children: string }) => (
  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{children}</p>
);

const SectionHeader = ({ icon: Icon, title, description, children }: { icon: typeof PackageCheck; title: string; description: string; children?: ReactNode }) => (
  <div className="flex flex-col gap-3 border-b border-border pb-3 sm:flex-row sm:items-start sm:justify-between">
    <div className="flex gap-3">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-secondary text-secondary-foreground">
        <Icon className="h-4 w-4" />
      </span>
      <div>
        <h3 className="font-semibold leading-none">{title}</h3>
        <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{description}</p>
      </div>
    </div>
    {children}
  </div>
);

const JsonTextarea = ({ label, help, rows, value, onChange }: { label: string; help: string; rows: number; value: string; onChange: (value: string) => void }) => (
  <div>
    <Label>{label}</Label>
    <FieldHelp>{help}</FieldHelp>
    <Textarea rows={rows} className="mt-2 font-mono text-xs leading-relaxed" value={value} onChange={(e) => onChange(e.target.value)} />
  </div>
);

const AdminLivreurs = () => {
  const [livreurs, setLivreurs] = useState<Livreur[]>([]);
  const [hubs, setHubs] = useState<Hub[]>([]);
  const [hubLivreurs, setHubLivreurs] = useState<HubLivreur[]>([]);
  const [settings, setSettings] = useState<Record<string, LivreurApiSettings>>({});
  const [show, setShow] = useState<Set<string>>(new Set());
  const [savingId, setSavingId] = useState<string | null>(null);
  const [editing, setEditing] = useState<Livreur | null>(null);
  const activeSettings = useMemo(() => editing ? settings[editing.id] ?? defaultSettings(editing.id) : null, [editing, settings]);
  const [settingsForm, setSettingsForm] = useState({
    create_package_url: "",
    create_package_method: "POST",
    create_package_headers: "{}",
    create_package_mapping: "{}",
    auth_config: "{}",
    api_operations: "[]",
    validation_rules: "{}",
    status_mapping: "{}",
    webhook_updates_current_status: true,
    webhook_status_field: "status",
    webhook_tracking_field: "trackingID",
    polling_enabled: false,
    polling_interval_minutes: 15,
    polling_status_url: "",
    polling_status_method: "GET",
    polling_status_headers: "{}",
    polling_status_payload_mapping: "{}",
    polling_tracking_field: "trackingID",
    polling_status_field: "status",
    polling_message_field: "message",
    rate_limit_per_second: 5,
    is_active: true,
  });

  const load = async () => {
    const [p, h, hl, s] = await Promise.all([
      supabase.from("profiles").select("id, username, full_name, api_enabled, api_token").eq("role", "livreur").order("username"),
      supabase.from("hubs").select("id, name").order("name"),
      supabase.from("hub_livreur").select("hub_id, livreur_id"),
      db.from("livreur_api_settings").select("*"),
    ]);
    setLivreurs((p.data ?? []) as Livreur[]);
    setHubs((h.data ?? []) as Hub[]);
    setHubLivreurs((hl.data ?? []) as HubLivreur[]);
    const byLivreur: Record<string, LivreurApiSettings> = {};
    (s.data ?? []).forEach((row: LivreurApiSettings) => { byLivreur[row.livreur_id] = row; });
    setSettings(byLivreur);
  };
  useEffect(() => { load(); }, []);

  useEffect(() => {
    if (!activeSettings) return;
    setSettingsForm({
      create_package_url: activeSettings.create_package_url ?? "",
      create_package_method: activeSettings.create_package_method || "POST",
      create_package_headers: formatJson(activeSettings.create_package_headers),
      create_package_mapping: formatJson(activeSettings.create_package_mapping),
      auth_config: formatJson(activeSettings.auth_config),
      api_operations: JSON.stringify(activeSettings.api_operations ?? [], null, 2),
      validation_rules: formatJson(activeSettings.validation_rules),
      status_mapping: formatJson(activeSettings.status_mapping),
      webhook_updates_current_status: activeSettings.webhook_updates_current_status,
      webhook_status_field: activeSettings.webhook_status_field || "status",
      webhook_tracking_field: activeSettings.webhook_tracking_field || "trackingID",
      polling_enabled: activeSettings.polling_enabled ?? false,
      polling_interval_minutes: activeSettings.polling_interval_minutes ?? 15,
      polling_status_url: activeSettings.polling_status_url ?? "",
      polling_status_method: activeSettings.polling_status_method || "GET",
      polling_status_headers: formatJson(activeSettings.polling_status_headers),
      polling_status_payload_mapping: formatJson(activeSettings.polling_status_payload_mapping),
      polling_tracking_field: activeSettings.polling_tracking_field || "trackingID",
      polling_status_field: activeSettings.polling_status_field || "status",
      polling_message_field: activeSettings.polling_message_field || "message",
      rate_limit_per_second: activeSettings.rate_limit_per_second ?? 5,
      is_active: activeSettings.is_active,
    });
  }, [activeSettings]);

  const hubsOf = (livreurId: string) => hubLivreurs.filter((x) => x.livreur_id === livreurId).map((x) => x.hub_id);
  const hubAssignedTo = (hubId: number) => hubLivreurs.find((x) => x.hub_id === hubId)?.livreur_id;

  const toggleHubForLivreur = async (livreurId: string, hubId: number, currentlyAssigned: boolean) => {
    setSavingId(livreurId);
    try {
      if (currentlyAssigned) {
        const { error } = await supabase.from("hub_livreur").delete().eq("livreur_id", livreurId).eq("hub_id", hubId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("hub_livreur").insert({ livreur_id: livreurId, hub_id: hubId });
        if (error) throw error;
      }
      await load();
    } catch (e: any) {
      toast.error(e.message || "Erreur");
    } finally {
      setSavingId(null);
    }
  };

  const toggleApi = async (l: Livreur, v: boolean) => {
    const { error } = await supabase.from("profiles").update({ api_enabled: v }).eq("id", l.id);
    if (error) toast.error(error.message);
    else { toast.success(v ? "API activée" : "API désactivée"); load(); }
  };

  const regenToken = async (l: Livreur) => {
    const t = generateToken();
    const { error } = await supabase.from("profiles").update({ api_token: t }).eq("id", l.id);
    if (error) toast.error(error.message);
    else { toast.success("Token régénéré"); load(); }
  };

  const saveSettings = async () => {
    if (!editing) return;
    setSavingId(editing.id);
    try {
      const payload = {
        livreur_id: editing.id,
        create_package_url: settingsForm.create_package_url.trim() || null,
        create_package_method: settingsForm.create_package_method.trim().toUpperCase() || "POST",
        create_package_headers: parseJson("Headers", settingsForm.create_package_headers),
        create_package_mapping: parseJson("Mapping create package", settingsForm.create_package_mapping),
        auth_config: parseJson("Authentication", settingsForm.auth_config),
        api_operations: parseJsonArray("Payloads API", settingsForm.api_operations),
        validation_rules: parseJson("Validation", settingsForm.validation_rules),
        status_mapping: parseJson("Mapping status", settingsForm.status_mapping),
        webhook_updates_current_status: settingsForm.webhook_updates_current_status,
        webhook_status_field: settingsForm.webhook_status_field.trim() || "status",
        webhook_tracking_field: settingsForm.webhook_tracking_field.trim() || "trackingID",
        polling_enabled: settingsForm.polling_enabled,
        polling_interval_minutes: Number(settingsForm.polling_interval_minutes) || 15,
        polling_status_url: settingsForm.polling_status_url.trim() || null,
        polling_status_method: settingsForm.polling_status_method.trim().toUpperCase() || "GET",
        polling_status_headers: parseJson("Polling headers", settingsForm.polling_status_headers),
        polling_status_payload_mapping: parseJson("Polling payload", settingsForm.polling_status_payload_mapping),
        polling_tracking_field: settingsForm.polling_tracking_field.trim() || "trackingID",
        polling_status_field: settingsForm.polling_status_field.trim() || "status",
        polling_message_field: settingsForm.polling_message_field.trim() || "message",
        rate_limit_per_second: Number((settingsForm as any).rate_limit_per_second) || 5,
        is_active: settingsForm.is_active,
      };
      const { error } = await db.from("livreur_api_settings").upsert(payload, { onConflict: "livreur_id" });
      if (error) throw error;
      toast.success("Paramètres livreur enregistrés");
      setEditing(null);
      await load();
    } catch (e: any) {
      toast.error(e.message || "Erreur");
    } finally {
      setSavingId(null);
    }
  };

  const masked = (t: string | null) => t ? `${t.slice(0, 6)}${"•".repeat(20)}${t.slice(-4)}` : "—";

  return (
    <>
      <Card className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Livreur</TableHead>
              <TableHead>Hubs assignés</TableHead>
              <TableHead>API activée</TableHead>
              <TableHead>API Token</TableHead>
              <TableHead>Paramètres</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {livreurs.length === 0 ? (
              <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Aucun livreur</TableCell></TableRow>
            ) : livreurs.map((l) => {
              const assigned = hubsOf(l.id);
              return (
                <TableRow key={l.id}>
                  <TableCell>
                    <div className="font-medium">{l.full_name || l.username}</div>
                    <div className="text-xs text-muted-foreground">{l.username}</div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap items-center gap-1.5">
                      {assigned.length === 0 && <span className="text-sm text-muted-foreground">Aucun</span>}
                      {assigned.map((hid) => {
                        const h = hubs.find((x) => x.id === hid);
                        return <Badge key={hid} variant="secondary">{h?.name ?? `#${hid}`}</Badge>;
                      })}
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" size="sm" disabled={savingId === l.id}>Modifier <ChevronDown className="h-3 w-3 ml-1" /></Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-64 p-2 max-h-72 overflow-y-auto" align="start">
                          <div className="text-xs font-medium px-2 py-1 text-muted-foreground">Sélectionner les hubs</div>
                          {hubs.length === 0 && <div className="text-sm p-2 text-muted-foreground">Aucun hub</div>}
                          {hubs.map((h) => {
                            const owner = hubAssignedTo(h.id);
                            const isMine = owner === l.id;
                            const takenByOther = !!owner && !isMine;
                            return (
                              <label key={h.id} className={`flex items-center gap-2 px-2 py-1.5 rounded text-sm hover:bg-accent cursor-pointer ${takenByOther ? "opacity-50" : ""}`}>
                                <Checkbox checked={isMine} disabled={takenByOther || savingId === l.id} onCheckedChange={() => toggleHubForLivreur(l.id, h.id, isMine)} />
                                <span className="flex-1">{h.name}</span>
                                {takenByOther && <span className="text-xs text-muted-foreground">pris</span>}
                              </label>
                            );
                          })}
                        </PopoverContent>
                      </Popover>
                    </div>
                  </TableCell>
                  <TableCell><Switch checked={l.api_enabled} onCheckedChange={(v) => toggleApi(l, v)} /></TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Input readOnly className="font-mono text-xs h-8 w-64" value={show.has(l.id) ? (l.api_token || "—") : masked(l.api_token)} />
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { const n = new Set(show); n.has(l.id) ? n.delete(l.id) : n.add(l.id); setShow(n); }}>
                        {show.has(l.id) ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => regenToken(l)}><RefreshCw className="h-4 w-4 mr-1" /> Générer</Button>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Button variant="outline" size="sm" onClick={() => setEditing(l)}>
                      <SlidersHorizontal className="h-4 w-4 mr-1" /> Configurer
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Card>

      <Dialog open={!!editing} onOpenChange={(v) => !v && setEditing(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Paramètres API — {editing?.full_name || editing?.username}</DialogTitle></DialogHeader>
          <div className="grid gap-4 lg:grid-cols-2">
            <Card className="p-4 space-y-3">
              <h3 className="font-semibold">Create a package</h3>
              <div><Label>URL POST</Label><Input value={settingsForm.create_package_url} onChange={(e) => setSettingsForm({ ...settingsForm, create_package_url: e.target.value })} placeholder="https://..." /></div>
              <div><Label>Méthode</Label><Input value={settingsForm.create_package_method} onChange={(e) => setSettingsForm({ ...settingsForm, create_package_method: e.target.value })} /></div>
              <div><Label>Headers JSON</Label><Textarea rows={5} className="font-mono text-xs" value={settingsForm.create_package_headers} onChange={(e) => setSettingsForm({ ...settingsForm, create_package_headers: e.target.value })} /></div>
              <div><Label>Payload mapping JSON</Label><Textarea rows={10} className="font-mono text-xs" value={settingsForm.create_package_mapping} onChange={(e) => setSettingsForm({ ...settingsForm, create_package_mapping: e.target.value })} /></div>
            </Card>
            <Card className="p-4 space-y-3">
              <h3 className="font-semibold">Authentication & Payloads</h3>
              <div><Label>Authentication JSON</Label><Textarea rows={10} className="font-mono text-xs" value={settingsForm.auth_config} onChange={(e) => setSettingsForm({ ...settingsForm, auth_config: e.target.value })} /></div>
              <div><Label>Payloads API JSON array</Label><Textarea rows={10} className="font-mono text-xs" value={settingsForm.api_operations} onChange={(e) => setSettingsForm({ ...settingsForm, api_operations: e.target.value })} /></div>
              <div><Label>Rate limit / seconde</Label><Input type="number" min={0.1} step={0.1} value={settingsForm.rate_limit_per_second} onChange={(e) => setSettingsForm({ ...settingsForm, rate_limit_per_second: Number(e.target.value) })} /></div>
            </Card>
            <Card className="p-4 space-y-3">
              <h3 className="font-semibold">Validation & Webhook</h3>
              <div><Label>Validation JSON</Label><Textarea rows={7} className="font-mono text-xs" value={settingsForm.validation_rules} onChange={(e) => setSettingsForm({ ...settingsForm, validation_rules: e.target.value })} /></div>
              <div><Label>Status mapping JSON</Label><Textarea rows={7} className="font-mono text-xs" value={settingsForm.status_mapping} onChange={(e) => setSettingsForm({ ...settingsForm, status_mapping: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Champ status webhook</Label><Input value={settingsForm.webhook_status_field} onChange={(e) => setSettingsForm({ ...settingsForm, webhook_status_field: e.target.value })} /></div>
                <div><Label>Champ tracking webhook</Label><Input value={settingsForm.webhook_tracking_field} onChange={(e) => setSettingsForm({ ...settingsForm, webhook_tracking_field: e.target.value })} /></div>
              </div>
              <label className="flex items-center gap-2 rounded-md border border-border p-3 text-sm"><Switch checked={settingsForm.webhook_updates_current_status} onCheckedChange={(v) => setSettingsForm({ ...settingsForm, webhook_updates_current_status: v })} /> Webhook met à jour le statut actuel</label>
              <label className="flex items-center gap-2 rounded-md border border-border p-3 text-sm"><Switch checked={settingsForm.is_active} onCheckedChange={(v) => setSettingsForm({ ...settingsForm, is_active: v })} /> Paramètres actifs</label>
            </Card>
            <Card className="p-4 space-y-3">
              <h3 className="font-semibold">Polling statut</h3>
              <label className="flex items-center gap-2 rounded-md border border-border p-3 text-sm"><Switch checked={settingsForm.polling_enabled} onCheckedChange={(v) => setSettingsForm({ ...settingsForm, polling_enabled: v })} /> Activer polling</label>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Intervalle minutes</Label><Input type="number" min={1} value={settingsForm.polling_interval_minutes} onChange={(e) => setSettingsForm({ ...settingsForm, polling_interval_minutes: Number(e.target.value) })} /></div>
                <div><Label>Méthode</Label><Input value={settingsForm.polling_status_method} onChange={(e) => setSettingsForm({ ...settingsForm, polling_status_method: e.target.value })} /></div>
              </div>
              <div><Label>URL statut</Label><Input value={settingsForm.polling_status_url} onChange={(e) => setSettingsForm({ ...settingsForm, polling_status_url: e.target.value })} placeholder="https://..." /></div>
              <div><Label>Headers polling JSON</Label><Textarea rows={4} className="font-mono text-xs" value={settingsForm.polling_status_headers} onChange={(e) => setSettingsForm({ ...settingsForm, polling_status_headers: e.target.value })} /></div>
              <div><Label>Payload polling JSON</Label><Textarea rows={5} className="font-mono text-xs" value={settingsForm.polling_status_payload_mapping} onChange={(e) => setSettingsForm({ ...settingsForm, polling_status_payload_mapping: e.target.value })} /></div>
              <div className="grid grid-cols-3 gap-3">
                <div><Label>Champ tracking</Label><Input value={settingsForm.polling_tracking_field} onChange={(e) => setSettingsForm({ ...settingsForm, polling_tracking_field: e.target.value })} /></div>
                <div><Label>Champ status</Label><Input value={settingsForm.polling_status_field} onChange={(e) => setSettingsForm({ ...settingsForm, polling_status_field: e.target.value })} /></div>
                <div><Label>Champ message</Label><Input value={settingsForm.polling_message_field} onChange={(e) => setSettingsForm({ ...settingsForm, polling_message_field: e.target.value })} /></div>
              </div>
            </Card>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setEditing(null)}>Annuler</Button>
            <Button type="button" onClick={saveSettings} disabled={savingId === editing?.id}>{savingId === editing?.id ? "..." : "Enregistrer"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default AdminLivreurs;
