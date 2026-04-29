import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { defaultStickerTemplate } from "@/lib/printSticker";
import { Save } from "lucide-react";
import { toast } from "sonner";

type Template = Record<string, string | boolean>;

const textFields = [
  ["brand_title", "Titre"], ["brand_subtitle", "Sous-titre"], ["sender_label", "Libellé expéditeur"], ["sender_name", "Nom expéditeur"],
  ["phone_label", "Libellé téléphone"], ["date_label", "Libellé date"], ["recipient_label", "Libellé destinataire"], ["city_label", "Libellé ville"],
  ["address_label", "Libellé adresse"], ["hub_label", "Libellé hub"], ["qr_label", "Libellé QR"], ["tracking_label", "Libellé suivi"],
  ["product_label", "Libellé produit"], ["open_package_allowed", "Texte ouverture autorisée"], ["open_package_denied", "Texte ouverture refusée"],
  ["comment_label", "Libellé commentaire"], ["currency", "Devise"],
] as const;

const AdminSticker = () => {
  const [template, setTemplate] = useState<Template>(defaultStickerTemplate);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (supabase as any).from("app_settings").select("value").eq("key", "sticker_template").maybeSingle()
      .then(({ data }: any) => setTemplate({ ...defaultStickerTemplate, ...(data?.value ?? {}) }));
  }, []);

  const update = (key: string, value: string | boolean) => setTemplate((current) => ({ ...current, [key]: value }));
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
        <div><h3 className="font-semibold">Sticker</h3><p className="text-sm text-muted-foreground">Modifier les textes et options visibles dans le sticker imprimé.</p></div>
        <Button onClick={save} disabled={saving}><Save className="mr-1 h-4 w-4" />{saving ? "..." : "Sauvegarder"}</Button>
      </div>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {textFields.map(([key, label]) => (
          <div key={key} className="space-y-1.5"><Label>{label}</Label><Input value={String(template[key] ?? "")} onChange={(e) => update(key, e.target.value)} /></div>
        ))}
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