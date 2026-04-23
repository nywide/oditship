import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Plus, Pencil, Trash2, Search } from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface City { id: number; name: string; }

const AdminCities = () => {
  const [cities, setCities] = useState<City[]>([]);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<City | null>(null);
  const [name, setName] = useState("");
  const [deleting, setDeleting] = useState<City | null>(null);

  const load = () => supabase.from("cities").select("*").order("name").then(({ data }) => setCities((data ?? []) as City[]));
  useEffect(() => { load(); }, []);

  const filtered = useMemo(() =>
    cities.filter((c) => c.name.toLowerCase().includes(search.toLowerCase())),
  [cities, search]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    if (editing) {
      const oldName = editing.name;
      const { error } = await supabase.from("cities").update({ name: trimmed }).eq("id", editing.id);
      if (error) return toast.error(error.message);
      // update pricing_rules rows
      await supabase.from("pricing_rules").update({ city: trimmed }).eq("city", oldName);
      await supabase.from("hub_cities").update({ city_name: trimmed }).eq("city_name", oldName);
      toast.success("Ville mise à jour");
    } else {
      const { error } = await supabase.from("cities").insert({ name: trimmed });
      if (error) return toast.error(error.message);
      // pricing_rules row created via handle_new_city trigger
      toast.success("Ville ajoutée");
    }
    setOpen(false); setName(""); setEditing(null); load();
  };

  const doDelete = async () => {
    if (!deleting) return;
    await supabase.from("hub_cities").delete().eq("city_name", deleting.name);
    await supabase.from("pricing_rules").delete().eq("city", deleting.name);
    const { error } = await supabase.from("cities").delete().eq("id", deleting.id);
    if (error) toast.error(error.message);
    else toast.success("Ville supprimée");
    setDeleting(null); load();
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Rechercher une ville" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="text-sm text-muted-foreground">{filtered.length} / {cities.length} villes</div>
        <Button onClick={() => { setEditing(null); setName(""); setOpen(true); }}>
          <Plus className="h-4 w-4 mr-1" /> Ajouter
        </Button>
      </div>

      <Card className="p-3">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 max-h-[60vh] overflow-y-auto">
          {filtered.map((c) => (
            <div key={c.id} className="flex items-center justify-between border border-border rounded-md px-3 py-2">
              <span className="text-sm truncate">{c.name}</span>
              <div className="flex gap-1">
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setEditing(c); setName(c.name); setOpen(true); }}>
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setDeleting(c)}>
                  <Trash2 className="h-3.5 w-3.5 text-destructive" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? "Modifier la ville" : "Nouvelle ville"}</DialogTitle></DialogHeader>
          <form onSubmit={submit} className="space-y-3">
            <div><Label>Nom *</Label><Input required value={name} onChange={(e) => setName(e.target.value)} autoFocus /></div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Annuler</Button>
              <Button type="submit">{editing ? "Enregistrer" : "Ajouter"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleting} onOpenChange={(v) => !v && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer "{deleting?.name}" ?</AlertDialogTitle>
            <AlertDialogDescription>
              La ville sera supprimée ainsi que ses règles tarifaires et associations aux hubs.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={doDelete} className="bg-destructive">Supprimer</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AdminCities;
