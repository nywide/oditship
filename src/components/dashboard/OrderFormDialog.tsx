import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { AlertCircle, Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";

export interface OrderFormValues {
  id?: number;
  customer_name: string;
  customer_phone: string;
  customer_address: string;
  customer_city: string;
  product_name: string;
  order_value: number | "";
  open_package: boolean;
  comment: string;
}

const GENERIC_SYSTEM_ERROR = "Un problème système est survenu. Veuillez contacter le support.";
const REQUIRED_FIELD_ERROR = "Ce champ est obligatoire.";

type FieldName = keyof OrderFormValues;

const FIELD_LABEL_PREFIXES: Partial<Record<FieldName, string>> = {
  customer_name: "Nom client",
  customer_phone: "Téléphone",
  customer_address: "Adresse",
  customer_city: "Ville",
  product_name: "Produit",
  order_value: "Prix",
};

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  initial?: Partial<OrderFormValues> | null;
  vendeurId: string;
  agentId?: string | null;
  onSaved: () => void;
}

const empty: OrderFormValues = {
  customer_name: "",
  customer_phone: "",
  customer_address: "",
  customer_city: "",
  product_name: "",
  order_value: "",
  open_package: false,
  comment: "",
};

export const OrderFormDialog = ({ open, onOpenChange, initial, vendeurId, agentId, onSaved }: Props) => {
  const [values, setValues] = useState<OrderFormValues>(empty);
  const [cities, setCities] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [cityOpen, setCityOpen] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<FieldName, string>>>({});
  const editing = Boolean(initial?.id);

  const clearError = (field: FieldName) => {
    setFormError(null);
    setFieldErrors((current) => {
      if (!current[field]) return current;
      const next = { ...current };
      delete next[field];
      return next;
    });
  };

  const fieldMessage = (field: FieldName, message: string) => {
    const prefix = FIELD_LABEL_PREFIXES[field];
    return prefix ? message.replace(new RegExp(`^${prefix}\\s*:\\s*`, "i"), "") : message;
  };

  useEffect(() => {
    if (open) {
      const init = { ...empty, ...(initial ?? {}) } as OrderFormValues;
      // If editing, keep numeric value; otherwise empty string for placeholder UX
      if (initial?.id && typeof init.order_value === "number") {
        // keep
      } else if (!initial?.id) {
        init.order_value = "";
      }
      setValues(init);
      setFormError(null);
      setFieldErrors({});
      supabase.functions.invoke("order-preflight", { body: { action: "list_cities" } }).then(({ data, error }) => {
        if (error || (data as any)?.error) {
          setCities([]);
          setFormError(GENERIC_SYSTEM_ERROR);
          return;
        }
        setCities(((data as any)?.cities ?? []) as string[]);
      });
    }
  }, [open, initial]);

  const filteredCities = useMemo(() => cities, [cities]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setFormError(null);
    setFieldErrors({});
    const requiredErrors: Partial<Record<FieldName, string>> = {};
    if (!values.customer_city) requiredErrors.customer_city = REQUIRED_FIELD_ERROR;
    if (!values.customer_name.trim()) requiredErrors.customer_name = REQUIRED_FIELD_ERROR;
    if (!values.customer_phone.trim()) requiredErrors.customer_phone = REQUIRED_FIELD_ERROR;
    if (!values.customer_address.trim()) requiredErrors.customer_address = REQUIRED_FIELD_ERROR;
    if (!values.product_name.trim()) requiredErrors.product_name = REQUIRED_FIELD_ERROR;
    if (values.order_value === "") requiredErrors.order_value = REQUIRED_FIELD_ERROR;
    if (Object.keys(requiredErrors).length > 0) {
      setFieldErrors(requiredErrors);
      return;
    }
    const priceNum = typeof values.order_value === "number" ? values.order_value : parseFloat(String(values.order_value));
    if (!Number.isFinite(priceNum)) {
      setFieldErrors({ order_value: "Le prix est invalide." });
      return;
    }
    setSubmitting(true);
    try {
      if (!editing) {
        const { data: preflight, error: preflightError } = await supabase.functions.invoke("order-preflight", {
          body: { city: values.customer_city, order: { ...values, order_value: priceNum } },
        });
        if (preflightError || (preflight as any)?.error) {
          const message = (preflight as any)?.error || GENERIC_SYSTEM_ERROR;
          const safeMessage = (preflight as any)?.code === "VALIDATION_ERROR" ? message : GENERIC_SYSTEM_ERROR;
          const field = (preflight as any)?.field as FieldName | undefined;
          if (field && field in empty) setFieldErrors({ [field]: fieldMessage(field, safeMessage) });
          else setFormError(safeMessage);
          return;
        }
      }

      if (editing && initial?.id) {
        const { error } = await supabase.from("orders").update({
          customer_name: values.customer_name,
          customer_phone: values.customer_phone,
          customer_address: values.customer_address,
          customer_city: values.customer_city,
          product_name: values.product_name,
          order_value: priceNum,
          open_package: values.open_package,
          comment: values.comment || null,
        }).eq("id", initial.id);
        if (error) throw error;
        toast.success("Commande mise à jour");
      } else {
        const { error } = await supabase.from("orders").insert({
          vendeur_id: vendeurId,
          agent_id: agentId ?? null,
          customer_name: values.customer_name,
          customer_phone: values.customer_phone,
          customer_address: values.customer_address,
          customer_city: values.customer_city,
          product_name: values.product_name,
          order_value: priceNum,
          open_package: values.open_package,
          comment: values.comment || null,
          status: "Crée",
        });
        if (error) throw error;
        toast.success("Commande créée");
      }
      onOpenChange(false);
      onSaved();
    } catch {
      setFormError(GENERIC_SYSTEM_ERROR);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editing ? "Modifier la commande" : "Nouvelle commande"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <div>
            <Label>Ville *</Label>
            <Popover open={cityOpen} onOpenChange={setCityOpen} modal>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  role="combobox"
                  className={cn("w-full justify-between font-normal", !values.customer_city && "text-muted-foreground")}
                >
                  {values.customer_city || "Choisir une ville..."}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start" sideOffset={4}>
                <Command>
                  <CommandInput placeholder="Rechercher une ville..." />
                  <CommandList className="max-h-[260px] overflow-y-auto overscroll-contain">
                    <CommandEmpty>Aucune ville trouvée</CommandEmpty>
                    <CommandGroup>
                      {filteredCities.map((c) => (
                        <CommandItem
                          key={c}
                          value={c}
                          onSelect={() => {
                            setValues({ ...values, customer_city: c });
                            setFormError(null);
                            setCityOpen(false);
                          }}
                        >
                          <Check className={cn("mr-2 h-4 w-4", values.customer_city === c ? "opacity-100" : "opacity-0")} />
                          {c}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
            {values.customer_city && (preflightLoading || resolvedLivreur) && (
              <p className="mt-1 text-xs text-muted-foreground">
                {preflightLoading ? "Vérification du livreur..." : cityChecked && resolvedLivreur ? `Livreur: ${resolvedLivreur}` : null}
              </p>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Nom client *</Label>
              <Input required value={values.customer_name} onChange={(e) => { setValues({ ...values, customer_name: e.target.value }); setFormError(null); }} />
            </div>
            <div>
              <Label>Téléphone * (10 chiffres)</Label>
              <Input
                required
                inputMode="numeric"
                value={values.customer_phone}
                onChange={(e) => { setValues({ ...values, customer_phone: e.target.value.replace(/\D/g, "") }); setFormError(null); }}
              />
            </div>
          </div>
          <div>
            <Label>Adresse *</Label>
            <Input required value={values.customer_address} onChange={(e) => { setValues({ ...values, customer_address: e.target.value }); setFormError(null); }} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Produit *</Label>
              <Input required value={values.product_name} onChange={(e) => { setValues({ ...values, product_name: e.target.value }); setFormError(null); }} />
            </div>
            <div>
              <Label>Prix (MAD) *</Label>
              <Input
                required
                type="number"
                min={0}
                step="0.01"
                placeholder="0.00"
                value={values.order_value === "" ? "" : values.order_value}
                onChange={(e) => {
                  const v = e.target.value;
                  setValues({ ...values, order_value: v === "" ? "" : parseFloat(v) });
                  setFormError(null);
                }}
              />
            </div>
          </div>
          <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/5 p-3">
            <Checkbox id="open_package" checked={values.open_package} onCheckedChange={(v) => setValues({ ...values, open_package: !!v })} className="mt-0.5" />
            <Label htmlFor="open_package" className="cursor-pointer text-destructive font-medium leading-tight">
              N'est pas autorisé à ouvrir le colis
            </Label>
          </div>
          <div>
            <Label>Commentaire</Label>
            <Textarea rows={2} value={values.comment} onChange={(e) => setValues({ ...values, comment: e.target.value })} />
          </div>
          {formError && (
            <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <p>{formError}</p>
            </div>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
            <Button type="submit" disabled={submitting || !values.customer_city}>
              {submitting ? "..." : editing ? "Enregistrer" : "Créer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
