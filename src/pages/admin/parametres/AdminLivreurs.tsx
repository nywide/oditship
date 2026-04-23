import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Eye, EyeOff, RefreshCw } from "lucide-react";
import { toast } from "sonner";

interface Livreur { id: string; username: string; full_name: string | null; api_enabled: boolean; api_token: string | null; }
interface Hub { id: number; name: string; }
interface HubLivreur { hub_id: number; livreur_id: string; }

const generateToken = () => {
  const arr = new Uint8Array(24);
  crypto.getRandomValues(arr);
  return Array.from(arr).map((b) => b.toString(16).padStart(2, "0")).join("");
};

const AdminLivreurs = () => {
  const [livreurs, setLivreurs] = useState<Livreur[]>([]);
  const [hubs, setHubs] = useState<Hub[]>([]);
  const [hubLivreurs, setHubLivreurs] = useState<HubLivreur[]>([]);
  const [show, setShow] = useState<Set<string>>(new Set());

  const load = async () => {
    const [p, h, hl] = await Promise.all([
      supabase.from("profiles").select("id, username, full_name, api_enabled, api_token").eq("role", "livreur").order("username"),
      supabase.from("hubs").select("id, name").order("name"),
      supabase.from("hub_livreur").select("hub_id, livreur_id"),
    ]);
    setLivreurs((p.data ?? []) as Livreur[]);
    setHubs((h.data ?? []) as Hub[]);
    setHubLivreurs((hl.data ?? []) as HubLivreur[]);
  };
  useEffect(() => { load(); }, []);

  const hubOf = (livreurId: string) => hubLivreurs.find((x) => x.livreur_id === livreurId)?.hub_id;
  const assignedHubIds = new Set(hubLivreurs.map((x) => x.hub_id));

  const setHub = async (livreurId: string, hubIdStr: string) => {
    const hubId = hubIdStr === "none" ? null : parseInt(hubIdStr);
    // remove any existing for this livreur or hub
    await supabase.from("hub_livreur").delete().eq("livreur_id", livreurId);
    if (hubId) {
      await supabase.from("hub_livreur").delete().eq("hub_id", hubId);
      const { error } = await supabase.from("hub_livreur").insert({ livreur_id: livreurId, hub_id: hubId });
      if (error) return toast.error(error.message);
    }
    toast.success("Hub mis à jour");
    load();
  };

  const toggleApi = async (l: Livreur, v: boolean) => {
    const { error } = await supabase.from("profiles").update({ api_enabled: v }).eq("id", l.id);
    if (error) toast.error(error.message);
    else { toast.success(v ? "API activée" : "API désactivée"); load(); }
  };

  const regenToken = async (l: Livreur) => {
    const t = generateToken();
    const { error } = await supabase.from("profiles").update({ api_token: t }).eq("id", l.id);
    if (error) toast.error(error.message);
    else { toast.success("Token régénéré"); load(); }
  };

  const masked = (t: string | null) => t ? `${t.slice(0, 6)}${"•".repeat(20)}${t.slice(-4)}` : "—";

  return (
    <Card className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Livreur</TableHead>
            <TableHead>Hub assigné</TableHead>
            <TableHead>API activée</TableHead>
            <TableHead>API Token</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {livreurs.length === 0 ? (
            <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">Aucun livreur</TableCell></TableRow>
          ) : livreurs.map((l) => {
            const currentHub = hubOf(l.id);
            return (
              <TableRow key={l.id}>
                <TableCell>
                  <div className="font-medium">{l.full_name || l.username}</div>
                  <div className="text-xs text-muted-foreground">{l.username}</div>
                </TableCell>
                <TableCell>
                  <Select value={currentHub ? String(currentHub) : "none"} onValueChange={(v) => setHub(l.id, v)}>
                    <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Aucun</SelectItem>
                      {hubs.filter((h) => !assignedHubIds.has(h.id) || h.id === currentHub).map((h) => (
                        <SelectItem key={h.id} value={String(h.id)}>{h.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell>
                  <Switch checked={l.api_enabled} onCheckedChange={(v) => toggleApi(l, v)} />
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Input readOnly className="font-mono text-xs h-8 w-64" value={show.has(l.id) ? (l.api_token || "—") : masked(l.api_token)} />
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => {
                      const n = new Set(show); n.has(l.id) ? n.delete(l.id) : n.add(l.id); setShow(n);
                    }}>
                      {show.has(l.id) ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => regenToken(l)}>
                      <RefreshCw className="h-4 w-4 mr-1" /> Générer
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </Card>
  );
};

export default AdminLivreurs;
