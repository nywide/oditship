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
import { Check, ChevronsUpDown } from "lucide-react";
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

const countProductCharacters = (value: string) => value.replace(/[^\p{L}\p{N}]/gu, "").length;

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
  const editing = Boolean(initial?.id);

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
      supabase.from("cities").select("name").order("name").then(({ data }) => {
        setCities((data ?? []).map((c) => c.name));
      });
    }
  }, [open, initial]);

  const filteredCities = useMemo(() => cities, [cities]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    if (!values.customer_city) return toast.error("Choisissez une ville");
    if (values.customer_name.trim().length < 2) return toast.error("Le nom doit contenir au moins 2 caractères");
    if (countProductCharacters(values.product_name) < 3) return toast.error("Le produit doit contenir au moins 3 lettres ou chiffres");
    if (values.customer_address.trim().length < 2) return toast.error("L'adresse doit contenir au moins 2 caractères");
    const phoneDigits = values.customer_phone.replace(/\D/g, "");
    if (phoneDigits.length !== 10) return toast.error("Le téléphone doit contenir exactement 10 chiffres");
    const priceNum = typeof values.order_value === "number" ? values.order_value : parseFloat(String(values.order_value));
    if (!priceNum || priceNum <= 0) return toast.error("Le prix doit être supérieur à 0");
    setSubmitting(true);
    try {
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
    } catch (err: any) {
      toast.error(err.message || "Erreur");
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
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Nom client *</Label>
              <Input required minLength={2} value={values.customer_name} onChange={(e) => setValues({ ...values, customer_name: e.target.value })} />
            </div>
            <div>
              <Label>Téléphone * (10 chiffres)</Label>
              <Input
                required
                inputMode="numeric"
                pattern="[0-9]{10}"
                maxLength={10}
                value={values.customer_phone}
                onChange={(e) => setValues({ ...values, customer_phone: e.target.value.replace(/\D/g, "").slice(0, 10) })}
              />
            </div>
          </div>
          <div>
            <Label>Adresse *</Label>
            <Input required minLength={2} value={values.customer_address} onChange={(e) => setValues({ ...values, customer_address: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Produit *</Label>
              <Input required minLength={3} value={values.product_name} onChange={(e) => setValues({ ...values, product_name: e.target.value })} />
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
