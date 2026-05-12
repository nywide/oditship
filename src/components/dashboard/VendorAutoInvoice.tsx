import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Timer } from "lucide-react";
import { toast } from "sonner";

const db = supabase as any;

const DAYS = [
  { v: 1, l: "Lun" }, { v: 2, l: "Mar" }, { v: 3, l: "Mer" },
  { v: 4, l: "Jeu" }, { v: 5, l: "Ven" }, { v: 6, l: "Sam" }, { v: 0, l: "Dim" },
];

export interface AutoInvoiceConfig {
  enabled: boolean;
  schedule_mode: "daily" | "weekly";
  days_of_week: number[];
  hour: number;
  minute: number;
}

const DEFAULT: AutoInvoiceConfig = {
  enabled: false, schedule_mode: "daily", days_of_week: [1], hour: 9, minute: 0,
};

interface Props { vendeurId: string; }

const VendorAutoInvoice = ({ vendeurId }: Props) => {
  const [override, setOverride] = useState(false);
  const [cfg, setCfg] = useState<AutoInvoiceConfig>(DEFAULT);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    db.from("profiles").select("auto_invoice_config").eq("id", vendeurId).maybeSingle()
      .then(({ data }: any) => {
        const c = data?.auto_invoice_config as AutoInvoiceConfig | null;
        if (c) { setOverride(true); setCfg({ ...DEFAULT, ...c }); }
        setLoaded(true);
      });
  }, [vendeurId]);

  const save = async (next: AutoInvoiceConfig | null) => {
    const { error } = await db.from("profiles").update({ auto_invoice_config: next }).eq("id", vendeurId);
    if (error) return toast.error(error.message);
    toast.success("Génération automatique enregistrée");
  };

  const toggleOverride = async (v: boolean) => {
    setOverride(v);
    if (!v) await save(null);
    else await save(cfg);
  };

  const update = async (patch: Partial<AutoInvoiceConfig>) => {
    const next = { ...cfg, ...patch };
    setCfg(next);
    if (override) await save(next);
  };

  if (!loaded) return null;
  return (
    <Card className="p-3 space-y-3">
      <div className="flex items-center gap-2">
        <Timer className="h-4 w-4 text-primary" />
        <span className="font-medium text-sm">Génération automatique personnalisée</span>
        <Switch className="ml-auto" checked={override} onCheckedChange={toggleOverride} />
      </div>
      {!override && (
        <p className="text-xs text-muted-foreground">
          Les paramètres globaux de Facturation seront utilisés pour ce vendeur.
        </p>
      )}
      {override && (
        <>
          <div className="flex items-center gap-2 text-sm">
            <span>Activée</span>
            <Switch checked={cfg.enabled} onCheckedChange={(v) => update({ enabled: v })} />
          </div>
          <RadioGroup className="flex gap-4" value={cfg.schedule_mode} onValueChange={(v) => update({ schedule_mode: v as any })}>
            <label className="flex items-center gap-2 text-sm"><RadioGroupItem value="daily" /> Tous les jours</label>
            <label className="flex items-center gap-2 text-sm"><RadioGroupItem value="weekly" /> Jours spécifiques</label>
          </RadioGroup>
          {cfg.schedule_mode === "weekly" && (
            <div className="flex flex-wrap gap-2">
              {DAYS.map((d) => {
                const checked = cfg.days_of_week.includes(d.v);
                return (
                  <label key={d.v} className="flex items-center gap-1 text-sm border rounded px-2 py-1 cursor-pointer">
                    <Checkbox checked={checked} onCheckedChange={(c) => {
                      const next = c ? [...cfg.days_of_week, d.v] : cfg.days_of_week.filter((x) => x !== d.v);
                      update({ days_of_week: next });
                    }} />
                    {d.l}
                  </label>
                );
              })}
            </div>
          )}
          <div className="flex items-center gap-2 text-sm">
            <span>Heure :</span>
            <Input type="number" min={0} max={23} className="h-8 w-16" value={cfg.hour}
              onChange={(e) => update({ hour: Math.max(0, Math.min(23, Number(e.target.value))) })} />
            <span>:</span>
            <Input type="number" min={0} max={59} className="h-8 w-16" value={cfg.minute}
              onChange={(e) => update({ minute: Math.max(0, Math.min(59, Number(e.target.value))) })} />
          </div>
        </>
      )}
    </Card>
  );
};

export default VendorAutoInvoice;
