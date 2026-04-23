import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Plus, Pencil, UserX, UserCheck } from "lucide-react";
import { toast } from "sonner";

const ROLES = [
  "superviseur","administrateur","vendeur","agent","ramassoire","magasinier",
  "support","suivi","comptable","livreur","commercial","gestion_retour",
];

interface ProfileRow {
  id: string;
  username: string;
  full_name: string | null;
  phone: string | null;
  cin: string | null;
  role: string;
  is_active: boolean;
  created_at: string;
}

const emptyForm = { username: "", email: "", password: "", full_name: "", phone: "", cin: "", role: "vendeur", is_active: true };

const AdminUtilisateurs = () => {
  const { user } = useAuth();
  const [rows, setRows] = useState<ProfileRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ProfileRow | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);

  const load = () => {
    setLoading(true);
    supabase.from("profiles").select("*").order("created_at", { ascending: false })
      .then(({ data }) => { setRows((data ?? []) as ProfileRow[]); setLoading(false); });
  };
  useEffect(load, []);

  const openCreate = () => { setEditing(null); setForm(emptyForm); setOpen(true); };
  const openEdit = (r: ProfileRow) => {
    setEditing(r);
    setForm({ ...emptyForm, username: r.username, full_name: r.full_name ?? "", phone: r.phone ?? "", cin: r.cin ?? "", role: r.role, is_active: r.is_active });
    setOpen(true);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    try {
      if (editing) {
        const { error } = await supabase.from("profiles").update({
          full_name: form.full_name || null,
          phone: form.phone || null,
          cin: form.cin || null,
          role: form.role,
          is_active: form.is_active,
        }).eq("id", editing.id);
        if (error) throw error;
        // Sync user_roles: remove old, add new
        await supabase.from("user_roles").delete().eq("user_id", editing.id);
        await supabase.from("user_roles").insert({ user_id: editing.id, role: form.role as any });
        toast.success("Utilisateur mis à jour");
      } else {
        const { data, error } = await supabase.functions.invoke("admin-create-user", {
          body: {
            email: form.email, password: form.password, username: form.username.toLowerCase().trim(),
            full_name: form.full_name, phone: form.phone, cin: form.cin, role: form.role, is_active: form.is_active,
          },
        });
        if (error) throw error;
        if ((data as any)?.error) throw new Error((data as any).error);
        toast.success("Utilisateur créé");
      }
      setOpen(false);
      load();
    } catch (e: any) {
      toast.error(e.message || "Erreur");
    } finally {
      setSubmitting(false);
    }
  };

  const toggleActive = async (r: ProfileRow) => {
    if (r.id === user?.id) return toast.error("Vous ne pouvez pas désactiver votre propre compte");
    const { error } = await supabase.from("profiles").update({ is_active: !r.is_active }).eq("id", r.id);
    if (error) toast.error(error.message);
    else { toast.success(r.is_active ? "Désactivé" : "Activé"); load(); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Utilisateurs</h2>
        <Button onClick={openCreate}><Plus className="h-4 w-4 mr-1" /> Créer</Button>
      </div>

      <Card className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Username</TableHead>
              <TableHead>Nom complet</TableHead>
              <TableHead>Téléphone</TableHead>
              <TableHead>Rôle</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead>Créé le</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Chargement...</TableCell></TableRow>
            ) : rows.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="font-medium">{r.username}</TableCell>
                <TableCell>{r.full_name || "—"}</TableCell>
                <TableCell>{r.phone || "—"}</TableCell>
                <TableCell><span className="capitalize">{r.role}</span></TableCell>
                <TableCell>
                  <span className={r.is_active ? "text-success" : "text-muted-foreground"}>
                    {r.is_active ? "Actif" : "Inactif"}
                  </span>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">{new Date(r.created_at).toLocaleDateString("fr-FR")}</TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="icon" onClick={() => openEdit(r)}><Pencil className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="icon" onClick={() => toggleActive(r)} disabled={r.id === user?.id}>
                    {r.is_active ? <UserX className="h-4 w-4 text-destructive" /> : <UserCheck className="h-4 w-4 text-success" />}
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? "Modifier l'utilisateur" : "Nouvel utilisateur"}</DialogTitle></DialogHeader>
          <form onSubmit={submit} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Username *</Label>
                <Input required disabled={!!editing} value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} />
              </div>
              <div>
                <Label>Email *</Label>
                <Input required disabled={!!editing} type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder={editing ? "(non modifiable)" : ""} />
              </div>
            </div>
            {!editing && (
              <div><Label>Mot de passe *</Label><Input required type="password" minLength={6} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></div>
            )}
            <div><Label>Nom complet</Label><Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Téléphone</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
              <div><Label>CIN</Label><Input value={form.cin} onChange={(e) => setForm({ ...form, cin: e.target.value })} /></div>
            </div>
            <div>
              <Label>Rôle *</Label>
              <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ROLES.map((r) => <SelectItem key={r} value={r} className="capitalize">{r}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <Switch id="is_active" checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} />
              <Label htmlFor="is_active">Actif</Label>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Annuler</Button>
              <Button type="submit" disabled={submitting}>{submitting ? "..." : editing ? "Enregistrer" : "Créer"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminUtilisateurs;
