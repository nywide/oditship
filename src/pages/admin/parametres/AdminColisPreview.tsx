import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { COLIS_PREVIEW_SETTING_KEY, colisPreviewFieldOptions, defaultColisPreviewSettings, normalizeColisPreviewSettings, renderColisTemplate, sanitizeColisHtml, sortedVisibleFields, type ColisPreviewLocation, type ColisPreviewSettings } from "@/lib/colisPreview";
import { Save } from "lucide-react";
import { toast } from "sonner";

const db = supabase as any;
const locations: ColisPreviewLocation[] = ["main", "details", "timeline"];
const sample = { customer_name: "Client Exemple", customer_phone: "0600000000", customer_city: "Casablanca", customer_address: "Rue principale", product_name: "Sample product", order_value: 249, status: "Pickup", tracking: "2G76937042673", external_tracking_number: "2G76937042673", comment: "Fragile", status_note: "Client asked for evening delivery", postponed_date: "2026-04-30T10:00:00Z", scheduled_date: "2026-05-01T11:00:00Z", created_at: new Date().toISOString(), vendeur: "Demo Seller", livreur: "Driver Demo", support: "Support", history_status: "Reporté", history_message: "Status updated from webhook", history_actor: "Driver Demo", history_date: new Date().toISOString() };

const AdminColisPreview = () => {
  const [settings, setSettings] = useState<ColisPreviewSettings>(defaultColisPreviewSettings);
  const [active, setActive] = useState<ColisPreviewLocation>("main");
  const [saving, setSaving] = useState(false);
  const section = settings[active];
  const previewHtml = useMemo(() => sanitizeColisHtml(`<style>${renderColisTemplate(section.css, sample)}</style>${renderColisTemplate(section.html, sample)}`), [section]);

  useEffect(() => {
    db.from("app_settings").select("value").eq("key", COLIS_PREVIEW_SETTING_KEY).maybeSingle()
      .then(({ data }: any) => setSettings(normalizeColisPreviewSettings(data?.value)));
  }, []);

  const updateSection = (patch: Partial<typeof section>) => setSettings((current) => ({ ...current, [active]: { ...current[active], ...patch } }));
  const updateField = (key: string, patch: Record<string, unknown>) => updateSection({ fields: section.fields.map((field) => field.key === key ? { ...field, ...patch } : field) });
  const save = async () => {
    setSaving(true);
    const { data: userData } = await supabase.auth.getUser();
    const { error } = await db.from("app_settings").upsert({ key: COLIS_PREVIEW_SETTING_KEY, value: settings, updated_by: userData.user?.id ?? null }, { onConflict: "key" });
    setSaving(false);
    if (error) toast.error(error.message); else toast.success("Colis preview saved");
  };

  return <div className="grid gap-4 xl:grid-cols-[1fr_420px]">
    <Card className="p-4">
      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div><h3 className="font-semibold">Edit preview colis</h3><p className="text-sm text-muted-foreground">Control what appears in the main order row, order details, and activity chronology.</p></div>
        <Button onClick={save} disabled={saving}><Save className="mr-1 h-4 w-4" />{saving ? "Saving..." : "Save"}</Button>
      </div>
      <div className="mb-4 grid gap-2 sm:grid-cols-3">
        {locations.map((item) => <Button key={item} variant={active === item ? "default" : "outline"} onClick={() => setActive(item)}>{settings[item].title}</Button>)}
      </div>
      <div className="space-y-4">
        <label className="flex items-center justify-between rounded-md border border-border p-3 text-sm"><span>Use custom HTML/CSS for this area</span><Switch checked={section.useCustomHtml} onCheckedChange={(useCustomHtml) => updateSection({ useCustomHtml })} /></label>
        <div className="rounded-md border border-border p-3">
          <div className="mb-3 grid grid-cols-[1fr_96px_112px_72px] gap-2 text-xs font-medium text-muted-foreground"><span>Field</span><span>Visible</span><span>Slot</span><span>Order</span></div>
          {section.fields.map((field) => <div key={field.key} className="grid grid-cols-[1fr_96px_112px_72px] items-center gap-2 border-t border-border py-2">
            <span className="text-sm font-medium">{field.label}</span>
            <Switch checked={field.visible} onCheckedChange={(visible) => updateField(field.key, { visible })} />
            <Select value={field.slot} onValueChange={(slot) => updateField(field.key, { slot })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="primary">Primary</SelectItem><SelectItem value="secondary">Secondary</SelectItem><SelectItem value="meta">Meta</SelectItem></SelectContent></Select>
            <Input type="number" min={1} value={field.position} onChange={(e) => updateField(field.key, { position: Number(e.target.value) || 1 })} />
          </div>)}
        </div>
        <div className="grid gap-3 lg:grid-cols-2">
          <div className="space-y-2"><Label>HTML template</Label><Textarea className="min-h-44 font-mono text-xs" value={section.html} onChange={(e) => updateSection({ html: e.target.value })} /></div>
          <div className="space-y-2"><Label>CSS</Label><Textarea className="min-h-44 font-mono text-xs" value={section.css} onChange={(e) => updateSection({ css: e.target.value })} /></div>
        </div>
        <p className="text-xs text-muted-foreground">Available variables: {colisPreviewFieldOptions.map((field) => `{{${field.key}}}`).join(" ")}</p>
      </div>
    </Card>
    <Card className="p-4">
      <h4 className="mb-3 font-semibold">Preview</h4>
      {section.useCustomHtml ? <div className="rounded-md border border-border p-3" dangerouslySetInnerHTML={{ __html: previewHtml }} /> : <div className="space-y-2 rounded-md border border-border p-3">
        {(["primary", "secondary", "meta"] as const).map((slot) => <div key={slot} className="flex flex-wrap gap-2">
          {sortedVisibleFields(section, slot).map((field) => <span key={field.key} className={slot === "primary" ? "font-semibold" : "rounded-md bg-muted px-2 py-1 text-sm text-muted-foreground"}>{renderColisTemplate(`{{${field.key}}}`, sample)}</span>)}
        </div>)}
      </div>}
    </Card>
  </div>;
};

export default AdminColisPreview;