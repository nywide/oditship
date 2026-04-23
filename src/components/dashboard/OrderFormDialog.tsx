import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface OrderFormValues {
  id?: number;
  customer_name: string;
  customer_phone: string;
  customer_address: string;
  customer_city: string;
  product_name: string;
  order_value: number;
  open_package: boolean;
  comment: string;
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  initial?: Partial<OrderFormValues> | null;
  vendeurId: string;
  onSaved: () => void;
}

const empty: OrderFormValues = {
  customer_name: "",
  customer_phone: "",
  customer_address: "",
  customer_city: "",
  product_name: "",
  order_value: 0,
  open_package: false,
  comment: "",
};

export const OrderFormDialog = ({ open, onOpenChange, initial, vendeurId, onSaved }: Props) => {
  const [values, setValues] = useState<OrderFormValues>(empty);
  const [cities, setCities] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const editing = Boolean(initial?.id);

  useEffect(() => {
    if (open) {
      setValues({ ...empty, ...(initial ?? {}) } as OrderFormValues);
      supabase.from("cities").select("name").order("name").then(({ data }) => {
        setCities((data ?? []).map((c) => c.name));
      });
    }
  }, [open, initial]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    try {
      if (editing && initial?.id) {
        const { error } = await supabase.from("orders").update({
          customer_name: values.customer_name,
          customer_phone: values.customer_phone,
          customer_address: values.customer_address,
          customer_city: values.customer_city,
          product_name: values.product_name,
          order_value: values.order_value,
          open_package: values.open_package,
          comment: values.comment || null,
        }).eq("id", initial.id);
        if (error) throw error;
        toast.success("Commande mise à jour");
      } else {
        const { error } = await supabase.from("orders").insert({
          vendeur_id: vendeurId,
          customer_name: values.customer_name,
          customer_phone: values.customer_phone,
          customer_address: values.customer_address,
          customer_city: values.customer_city,
          product_name: values.product_name,
          order_value: values.order_value,
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
            <Select value={values.customer_city} onValueChange={(v) => setValues({ ...values, customer_city: v })}>
              <SelectTrigger><SelectValue placeholder="Choisir une ville" /></SelectTrigger>
              <SelectContent className="max-h-72">
                {cities.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Nom client *</Label>
              <Input required value={values.customer_name} onChange={(e) => setValues({ ...values, customer_name: e.target.value })} />
            </div>
            <div>
              <Label>Téléphone *</Label>
              <Input required value={values.customer_phone} onChange={(e) => setValues({ ...values, customer_phone: e.target.value })} />
            </div>
          </div>
          <div>
            <Label>Adresse *</Label>
            <Input required value={values.customer_address} onChange={(e) => setValues({ ...values, customer_address: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Produit *</Label>
              <Input required value={values.product_name} onChange={(e) => setValues({ ...values, product_name: e.target.value })} />
            </div>
            <div>
              <Label>Prix (MAD) *</Label>
              <Input required type="number" min={0} step="0.01" value={values.order_value}
                onChange={(e) => setValues({ ...values, order_value: parseFloat(e.target.value) || 0 })} />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox id="open_package" checked={values.open_package} onCheckedChange={(v) => setValues({ ...values, open_package: !!v })} />
            <Label htmlFor="open_package" className="cursor-pointer">Autoriser l'ouverture du colis</Label>
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
