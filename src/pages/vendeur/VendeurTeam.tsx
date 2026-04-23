import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus } from "lucide-react";
import { toast } from "sonner";

interface Agent { id: string; username: string; full_name: string | null; phone: string | null; cin: string | null; is_active: boolean; }

const VendeurTeam = () => {
  const { user } = useAuth();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ username: "", email: "", password: "", full_name: "", phone: "", cin: "" });

  const load = () => {
    if (!user) return;
    supabase.from("profiles").select("id, username, full_name, phone, cin, is_active")
      .eq("agent_of", user.id).order("created_at", { ascending: false })
      .then(({ data }) => setAgents((data ?? []) as Agent[]));
  };

  useEffect(load, [user]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting || !user) return;
    setSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke("admin-create-user", {
        body: {
          email: form.email,
          password: form.password,
          username: form.username.toLowerCase().trim(),
          full_name: form.full_name,
          phone: form.phone,
          cin: form.cin,
          role: "agent",
          agent_of: user.id,
          is_active: true,
        },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      toast.success("Agent créé");
      setOpen(false);
      setForm({ username: "", email: "", password: "", full_name: "", phone: "", cin: "" });
      load();
    } catch (e: any) {
      toast.error(e.message || "Erreur");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Équipe</h2>
        <Button onClick={() => setOpen(true)}><Plus className="h-4 w-4 mr-1" /> Ajouter un agent</Button>
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
            </TableRow>
          </TableHeader>
          <TableBody>
            {agents.length === 0 ? (
              <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Aucun agent</TableCell></TableRow>
            ) : agents.map((a) => (
              <TableRow key={a.id}>
                <TableCell className="font-medium">{a.full_name || "—"}</TableCell>
                <TableCell>{a.username}</TableCell>
                <TableCell>{a.phone || "—"}</TableCell>
                <TableCell>{a.cin || "—"}</TableCell>
                <TableCell>{a.is_active ? "Actif" : "Inactif"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nouvel agent</DialogTitle></DialogHeader>
          <form onSubmit={submit} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Username *</Label><Input required value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} /></div>
              <div><Label>Email *</Label><Input required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
            </div>
            <div><Label>Mot de passe *</Label><Input required type="password" minLength={6} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></div>
            <div><Label>Nom complet *</Label><Input required value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Téléphone</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
              <div><Label>CIN</Label><Input value={form.cin} onChange={(e) => setForm({ ...form, cin: e.target.value })} /></div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Annuler</Button>
              <Button type="submit" disabled={submitting}>{submitting ? "..." : "Créer"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default VendeurTeam;
