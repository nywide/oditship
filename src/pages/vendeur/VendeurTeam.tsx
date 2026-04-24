import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Pencil } from "lucide-react";
import { toast } from "sonner";

interface Agent {
  id: string;
  username: string;
  full_name: string | null;
  phone: string | null;
  cin: string | null;
  is_active: boolean;
  agent_pages: Record<string, boolean> | null;
}

const PAGES = [
  { key: "colis", label: "Colis" },
  { key: "facturation", label: "Facturation" },
  { key: "graphique", label: "Graphique" },
  { key: "team", label: "Team" },
];

const VendeurTeam = () => {
  const { user } = useAuth();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState<Agent | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [createForm, setCreateForm] = useState({
    username: "", email: "", password: "", full_name: "", phone: "", cin: "", is_active: true,
    pages: { colis: true, facturation: true, graphique: true, team: false } as Record<string, boolean>,
  });
  const [editForm, setEditForm] = useState({
    email: "", password: "", full_name: "", phone: "", cin: "", is_active: true,
    pages: { colis: true, facturation: true, graphique: true, team: false } as Record<string, boolean>,
  });

  const load = () => {
    if (!user) return;
    supabase.from("profiles").select("id, username, full_name, phone, cin, is_active, agent_pages")
      .eq("agent_of", user.id).order("created_at", { ascending: false })
      .then(({ data }) => setAgents((data ?? []) as Agent[]));
  };

  useEffect(load, [user]);

  const submitCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting || !user) return;
    setSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke("admin-create-user", {
        body: {
          email: createForm.email, password: createForm.password,
          username: createForm.username.toLowerCase().trim(),
          full_name: createForm.full_name, phone: createForm.phone, cin: createForm.cin,
          role: "agent", agent_of: user.id, is_active: createForm.is_active,
          agent_pages: createForm.pages,
        },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      toast.success("Agent créé");
      setCreateOpen(false);
      setCreateForm({
        username: "", email: "", password: "", full_name: "", phone: "", cin: "", is_active: true,
        pages: { colis: true, facturation: true, graphique: true, team: false },
      });
      load();
    } catch (e: any) { toast.error(e.message || "Erreur"); }
    finally { setSubmitting(false); }
  };

  const openEdit = (a: Agent) => {
    setEditing(a);
    setEditForm({
      email: "", password: "",
      full_name: a.full_name ?? "", phone: a.phone ?? "", cin: a.cin ?? "",
      is_active: a.is_active,
      pages: { colis: true, facturation: true, graphique: true, team: false, ...(a.agent_pages ?? {}) },
    });
    setEditOpen(true);
  };

  const submitEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting || !editing) return;
    setSubmitting(true);
    try {
      const body: any = {
        user_id: editing.id,
        full_name: editForm.full_name, phone: editForm.phone, cin: editForm.cin,
        is_active: editForm.is_active,
        agent_pages: editForm.pages,
      };
      if (editForm.email) body.email = editForm.email;
      if (editForm.password) body.password = editForm.password;
      const { data, error } = await supabase.functions.invoke("admin-update-user", { body });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      toast.success("Agent mis à jour");
      setEditOpen(false);
      load();
    } catch (e: any) { toast.error(e.message || "Erreur"); }
    finally { setSubmitting(false); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Équipe</h2>
        <Button onClick={() => setCreateOpen(true)}><Plus className="h-4 w-4 mr-1" /> Ajouter un agent</Button>
      </div>

      <Card className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nom complet</TableHead>
              <TableHead>Username</TableHead>
              <TableHead>Téléphone</TableHead>
              <TableHead>CIN</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {agents.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Aucun agent</TableCell></TableRow>
            ) : agents.map((a) => (
              <TableRow key={a.id}>
                <TableCell className="font-medium">{a.full_name || "—"}</TableCell>
                <TableCell>{a.username}</TableCell>
                <TableCell>{a.phone || "—"}</TableCell>
                <TableCell>{a.cin || "—"}</TableCell>
                <TableCell>{a.is_active ? "Actif" : "Inactif"}</TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="icon" onClick={() => openEdit(a)}><Pencil className="h-4 w-4" /></Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      {/* Create */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nouvel agent</DialogTitle></DialogHeader>
          <form onSubmit={submitCreate} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Username *</Label><Input required value={createForm.username} onChange={(e) => setCreateForm({ ...createForm, username: e.target.value })} /></div>
              <div><Label>Email *</Label><Input required type="email" value={createForm.email} onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })} /></div>
            </div>
            <div><Label>Mot de passe *</Label><Input required type="password" minLength={6} value={createForm.password} onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })} /></div>
            <div><Label>Nom complet *</Label><Input required value={createForm.full_name} onChange={(e) => setCreateForm({ ...createForm, full_name: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Téléphone</Label><Input value={createForm.phone} onChange={(e) => setCreateForm({ ...createForm, phone: e.target.value })} /></div>
              <div><Label>CIN</Label><Input value={createForm.cin} onChange={(e) => setCreateForm({ ...createForm, cin: e.target.value })} /></div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>Annuler</Button>
              <Button type="submit" disabled={submitting}>{submitting ? "..." : "Créer"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Modifier l'agent {editing?.username}</DialogTitle></DialogHeader>
          <form onSubmit={submitEdit} className="space-y-3">
            <div><Label>Username</Label><Input readOnly value={editing?.username ?? ""} className="bg-muted" /></div>
            <div><Label>Email (laisser vide pour garder)</Label><Input type="email" value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} /></div>
            <div><Label>Nouveau mot de passe (optionnel)</Label><Input type="password" minLength={6} value={editForm.password} onChange={(e) => setEditForm({ ...editForm, password: e.target.value })} /></div>
            <div><Label>Nom complet</Label><Input value={editForm.full_name} onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Téléphone</Label><Input value={editForm.phone} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} /></div>
              <div><Label>CIN</Label><Input value={editForm.cin} onChange={(e) => setEditForm({ ...editForm, cin: e.target.value })} /></div>
            </div>
            <div className="flex items-center gap-2">
              <Switch id="active" checked={editForm.is_active} onCheckedChange={(v) => setEditForm({ ...editForm, is_active: v })} />
              <Label htmlFor="active">Compte actif</Label>
            </div>
            <div>
              <Label>Pages autorisées</Label>
              <div className="grid grid-cols-2 gap-2 mt-2">
                {PAGES.map((p) => (
                  <label key={p.key} className="flex items-center gap-2 text-sm cursor-pointer">
                    <Checkbox
                      checked={editForm.pages[p.key] !== false}
                      onCheckedChange={(v) => setEditForm({ ...editForm, pages: { ...editForm.pages, [p.key]: !!v } })}
                    />
                    {p.label}
                  </label>
                ))}
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditOpen(false)}>Annuler</Button>
              <Button type="submit" disabled={submitting}>{submitting ? "..." : "Enregistrer"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default VendeurTeam;
