import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusBadge } from "@/components/StatusBadge";
import { ORDER_STATUSES } from "@/lib/orderStatus";
import { OrderFormDialog, OrderFormValues } from "@/components/dashboard/OrderFormDialog";
import { printSticker } from "@/lib/printSticker";
import { Pencil, Trash2, CheckCircle2, Send, Printer, RefreshCw, Plus, Search } from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Order {
  id: number;
  vendeur_id: string;
  customer_name: string;
  customer_phone: string;
  customer_address: string;
  customer_city: string;
  product_name: string;
  order_value: number;
  open_package: boolean;
  comment: string | null;
  status: string;
  tracking_number: string | null;
  external_tracking_number: string | null;
  api_sync_status: string | null;
  api_sync_error: string | null;
  agent_id: string | null;
  created_at: string;
}

const VendeurColis = () => {
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [cityFilter, setCityFilter] = useState<string>("all");
  const [agentFilter, setAgentFilter] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Partial<OrderFormValues> | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [sendingId, setSendingId] = useState<number | null>(null);

  const [agents, setAgents] = useState<{ id: string; full_name: string | null; username: string }[]>([]);

  const load = async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("orders")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    setOrders((data ?? []) as Order[]);
    setLoading(false);
  };

  useEffect(() => {
    load();
    if (user) {
      supabase.from("profiles").select("id, full_name, username").eq("agent_of", user.id)
        .then(({ data }) => setAgents(data ?? []));
    }
  }, [user]);

  const cities = useMemo(() => Array.from(new Set(orders.map((o) => o.customer_city))).sort(), [orders]);

  const filtered = useMemo(() => {
    return orders.filter((o) => {
      if (statusFilter !== "all" && o.status !== statusFilter) return false;
      if (cityFilter !== "all" && o.customer_city !== cityFilter) return false;
      if (agentFilter !== "all" && o.agent_id !== agentFilter) return false;
      if (dateFrom && new Date(o.created_at) < new Date(dateFrom)) return false;
      if (dateTo && new Date(o.created_at) > new Date(dateTo + "T23:59:59")) return false;
      if (search) {
        const s = search.toLowerCase();
        if (!o.customer_name.toLowerCase().includes(s) && !o.customer_phone.includes(search)) return false;
      }
      return true;
    });
  }, [orders, statusFilter, cityFilter, agentFilter, dateFrom, dateTo, search]);

  const confirmOrder = async (id: number) => {
    const { error } = await supabase.from("orders").update({ status: "Confirmé" }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Commande confirmée");
    load();
  };

  const deleteOrder = async () => {
    if (!deleteId) return;
    const { error } = await supabase.from("orders").delete().eq("id", deleteId);
    if (error) toast.error(error.message);
    else toast.success("Commande supprimée");
    setDeleteId(null);
    load();
  };

  const sendToDelivery = async (id: number) => {
    setSendingId(id);
    try {
      const { data, error } = await supabase.functions.invoke("olivraison-create-order", {
        body: { order_id: id },
      });
      if (error) throw error;
      toast.success(data?.mode === "olivraison" ? "Envoyé via Olivraison" : "Envoyé au livreur");
      load();
    } catch (e: any) {
      toast.error(e?.context?.body || e.message || "Échec de l'envoi");
      load();
    } finally {
      setSendingId(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-2xl font-bold">Mes commandes</h2>
        <Button onClick={() => { setEditing(null); setFormOpen(true); }}>
          <Plus className="h-4 w-4 mr-1" /> Nouvelle commande
        </Button>
      </div>

      <Card className="p-4 space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-3">
          <div className="lg:col-span-2 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input className="pl-9" placeholder="Rechercher (nom ou téléphone)" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger><SelectValue placeholder="Statut" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous statuts</SelectItem>
              {ORDER_STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={cityFilter} onValueChange={setCityFilter}>
            <SelectTrigger><SelectValue placeholder="Ville" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes villes</SelectItem>
              {cities.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={agentFilter} onValueChange={setAgentFilter}>
            <SelectTrigger><SelectValue placeholder="Agent" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous agents</SelectItem>
              {agents.map((a) => <SelectItem key={a.id} value={a.id}>{a.full_name || a.username}</SelectItem>)}
            </SelectContent>
          </Select>
          <div className="flex gap-2">
            <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
            <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
          </div>
        </div>
      </Card>

      <Card className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Client</TableHead>
              <TableHead>Ville</TableHead>
              <TableHead>Téléphone</TableHead>
              <TableHead>Prix</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Chargement...</TableCell></TableRow>
            ) : filtered.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Aucune commande</TableCell></TableRow>
            ) : filtered.map((o) => (
              <TableRow key={o.id}>
                <TableCell>
                  <div className="font-medium">{o.customer_name}</div>
                  <div className="text-xs text-muted-foreground">{o.product_name}</div>
                </TableCell>
                <TableCell>{o.customer_city}</TableCell>
                <TableCell className="font-mono text-sm">{o.customer_phone}</TableCell>
                <TableCell className="font-semibold">{Number(o.order_value).toFixed(2)} MAD</TableCell>
                <TableCell>
                  <StatusBadge status={o.status} />
                  {o.api_sync_status === "failed" && (
                    <div className="text-xs text-destructive mt-1 max-w-[180px] truncate" title={o.api_sync_error || ""}>
                      {o.api_sync_error}
                    </div>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    {o.status === "Crée" && (
                      <>
                        <Button variant="ghost" size="icon" onClick={() => { setEditing({ ...o, comment: o.comment ?? "" }); setFormOpen(true); }}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => setDeleteId(o.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                        <Button size="sm" onClick={() => confirmOrder(o.id)}>
                          <CheckCircle2 className="h-4 w-4 mr-1" /> Confirmer
                        </Button>
                      </>
                    )}
                    {o.status === "Confirmé" && (
                      <Button size="sm" onClick={() => sendToDelivery(o.id)} disabled={sendingId === o.id}>
                        {o.api_sync_status === "failed" ? <RefreshCw className="h-4 w-4 mr-1" /> : <Send className="h-4 w-4 mr-1" />}
                        {o.api_sync_status === "failed" ? "Réessayer" : "Envoyer"}
                      </Button>
                    )}
                    {o.status === "Pickup" && (
                      <Button variant="outline" size="sm" onClick={() => printSticker(o)}>
                        <Printer className="h-4 w-4 mr-1" /> Sticker
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      {user && (
        <OrderFormDialog
          open={formOpen}
          onOpenChange={setFormOpen}
          initial={editing}
          vendeurId={user.id}
          onSaved={load}
        />
      )}

      <AlertDialog open={deleteId !== null} onOpenChange={(v) => !v && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer la commande ?</AlertDialogTitle>
            <AlertDialogDescription>Cette action est irréversible.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={deleteOrder} className="bg-destructive">Supprimer</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default VendeurColis;
