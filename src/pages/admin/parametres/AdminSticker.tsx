import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { defaultStickerTemplate, stickerElements, type StickerElementKey, type StickerTemplate } from "@/lib/printSticker";
import { RotateCcw, Save } from "lucide-react";
import { toast } from "sonner";

const textFields = [
  ["brand_title", "Titre"], ["brand_subtitle", "Sous-titre"], ["sender_label", "Libellé expéditeur"], ["sender_name", "Nom expéditeur"],
  ["phone_label", "Libellé téléphone"], ["date_label", "Libellé date"], ["recipient_label", "Libellé destinataire"], ["city_label", "Libellé ville"],
  ["address_label", "Libellé adresse"], ["hub_label", "Libellé hub"], ["qr_label", "Libellé QR"], ["tracking_label", "Libellé suivi"],
  ["product_label", "Libellé produit"], ["open_package_allowed", "Texte ouverture autorisée"], ["open_package_denied", "Texte ouverture refusée"],
  ["comment_label", "Libellé commentaire"], ["currency", "Devise"],
] as const;

const elementLabels: Record<StickerElementKey, string> = {
  brand: "Logo / marque", sender: "Expéditeur", recipient: "Destinataire", phone: "Téléphone", city: "Ville", address: "Adresse",
  qr: "QR", tracking: "Numéro suivi", barcode: "Barcode", product: "Produit", open: "Ouverture", comment: "Commentaire", price: "Prix", date: "Date",
};

const num = (template: StickerTemplate, key: string) => Number(template[key] ?? defaultStickerTemplate[key] ?? 0);

const AdminSticker = () => {
  const [template, setTemplate] = useState<StickerTemplate>(defaultStickerTemplate);
  const [saving, setSaving] = useState(false);
  const [selectedElement, setSelectedElement] = useState<StickerElementKey>("brand");

  useEffect(() => {
    (supabase as any).from("app_settings").select("value").eq("key", "sticker_template").maybeSingle()
      .then(({ data }: any) => setTemplate({ ...defaultStickerTemplate, ...(data?.value ?? {}) }));
  }, []);

  const update = (key: string, value: string | boolean | number) => setTemplate((current) => ({ ...current, [key]: value }));
  const reset = () => setTemplate(defaultStickerTemplate);
  const save = async () => {
    setSaving(true);
    const { data: userData } = await supabase.auth.getUser();
    const { error } = await (supabase as any).from("app_settings").upsert({ key: "sticker_template", value: template, updated_by: userData.user?.id ?? null }, { onConflict: "key" });
    setSaving(false);
    if (error) toast.error(error.message); else toast.success("Sticker sauvegardé");
  };

  return (
    <Card className="p-4">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div><h3 className="font-semibold">Sticker thermique carré</h3><p className="text-sm text-muted-foreground">Modifier textes, taille 1:1, positions et dimensions avant impression thermique.</p></div>
        <div className="flex gap-2"><Button variant="outline" onClick={reset}><RotateCcw className="mr-1 h-4 w-4" />Réinitialiser</Button><Button onClick={save} disabled={saving}><Save className="mr-1 h-4 w-4" />{saving ? "..." : "Sauvegarder"}</Button></div>
      </div>
      <div className="mb-4 grid gap-3 md:grid-cols-4">
        {[ ["size_mm", "Taille papier mm", 40, 120], ["margin_mm", "Marge imprimante mm", 0, 10], ["border_mm", "Bordure mm", 0, 2], ["font_scale", "Échelle textes", 0.6, 1.6] ].map(([key, label, min, max]) => (
          <div key={String(key)} className="space-y-2 rounded-md border border-border p-3"><Label>{String(label)}</Label><Input type="number" step="0.1" min={Number(min)} max={Number(max)} value={num(template, String(key))} onChange={(e) => update(String(key), Number(e.target.value))} /><Slider min={Number(min)} max={Number(max)} step={0.1} value={[num(template, String(key))]} onValueChange={([v]) => update(String(key), v)} /></div>
        ))}
      </div>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {textFields.map(([key, label]) => (
          <div key={key} className="space-y-1.5"><Label>{label}</Label><Input value={String(template[key] ?? "")} onChange={(e) => update(key, e.target.value)} /></div>
        ))}
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-[220px_1fr]">
        <div className="space-y-2 rounded-md border border-border p-3">
          <Label>Élément à positionner</Label>
          <div className="grid gap-1">
            {stickerElements.map((key) => <Button key={key} type="button" variant={selectedElement === key ? "default" : "ghost"} className="justify-start" onClick={() => setSelectedElement(key)}>{elementLabels[key]}</Button>)}
          </div>
        </div>
        <div className="grid gap-3 rounded-md border border-border p-3 md:grid-cols-5">
          {[["x", "Position X"], ["y", "Position Y"], ["w", "Largeur"], ["h", "Hauteur"], ["font", "Police"]].map(([suffix, label]) => {
            const key = `${selectedElement}_${suffix}`;
            return <div key={key} className="space-y-2"><Label>{label}</Label><Input type="number" step="0.1" value={num(template, key)} onChange={(e) => update(key, Number(e.target.value))} /><Slider min={0} max={suffix === "font" ? 18 : 100} step={0.1} value={[num(template, key)]} onValueChange={([v]) => update(key, v)} /></div>;
          })}
        </div>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        {["show_border", "show_qr", "show_barcode"].map((key) => (
          <label key={key} className="flex items-center justify-between gap-3 rounded-md border border-border p-3 text-sm">
            <span>{key === "show_border" ? "Afficher bordure" : key === "show_qr" ? "Afficher QR" : "Afficher barcode"}</span>
            <Switch checked={template[key] !== false} onCheckedChange={(value) => update(key, value)} />
          </label>
        ))}
      </div>
    </Card>
  );
};

export default AdminSticker;