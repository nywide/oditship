import { Fragment, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusBadge } from "@/components/StatusBadge";
import { OrderDetailsPanel } from "@/components/dashboard/OrderDetailsPanel";
import { ORDER_STATUSES } from "@/lib/orderStatus";
import { Button } from "@/components/ui/button";
import { ChevronDown, Printer, Search } from "lucide-react";
import { printSticker } from "@/lib/printSticker";
import { cn } from "@/lib/utils";

interface Order {
  id: number;
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
  created_at: string;
  vendeur_id: string;
}

interface Vendeur { id: string; username: string; full_name: string | null; }

const AdminColis = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [vendeurs, setVendeurs] = useState<Vendeur[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [vendeurFilter, setVendeurFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [expandedOrderId, setExpandedOrderId] = useState<number | null>(null);

  useEffect(() => {
    Promise.all([
      supabase.from("orders").select("*").order("created_at", { ascending: false }),
      supabase.from("profiles").select("id, username, full_name").eq("role", "vendeur").order("username"),
    ]).then(([o, v]) => {
      setOrders((o.data ?? []) as Order[]);
      setVendeurs((v.data ?? []) as Vendeur[]);
      setLoading(false);
    });
  }, []);

  const vendeurMap = useMemo(() => {
    const m: Record<string, string> = {};
    vendeurs.forEach((v) => { m[v.id] = v.full_name || v.username; });
    return m;
  }, [vendeurs]);

  const filtered = useMemo(() => orders.filter((o) => {
    if (statusFilter !== "all" && o.status !== statusFilter) return false;
    if (vendeurFilter !== "all" && o.vendeur_id !== vendeurFilter) return false;
    if (dateFrom) {
      if (new Date(o.created_at) < new Date(dateFrom)) return false;
    }
    if (dateTo) {
      const end = new Date(dateTo); end.setHours(23, 59, 59, 999);
      if (new Date(o.created_at) > end) return false;
    }
    if (search.trim()) {
      const s = search.trim().toLowerCase();
      const tracking = (o.tracking_number || o.external_tracking_number || "").toLowerCase();
      if (
        !o.customer_name.toLowerCase().includes(s) &&
        !o.customer_phone.toLowerCase().includes(s) &&
        !o.customer_city.toLowerCase().includes(s) &&
        !tracking.includes(s)
      ) return false;
    }
    return true;
  }), [orders, statusFilter, vendeurFilter, search, dateFrom, dateTo]);

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">Toutes les commandes</h2>

      <Card className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
          <div className="relative lg:col-span-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Tracking, téléphone, ville, nom..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger><SelectValue placeholder="Statut" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous statuts</SelectItem>
              {ORDER_STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={vendeurFilter} onValueChange={setVendeurFilter}>
            <SelectTrigger><SelectValue placeholder="Vendeur" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous vendeurs</SelectItem>
              {vendeurs.map((v) => (
                <SelectItem key={v.id} value={v.id}>{v.full_name || v.username}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="grid grid-cols-2 gap-2">
            <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} title="Du" />
            <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} title="Au" />
          </div>
        </div>
      </Card>

      <Card className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Client</TableHead>
              <TableHead>Vendeur</TableHead>
              <TableHead>Ville</TableHead>
              <TableHead>Téléphone</TableHead>
              <TableHead>Prix</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Chargement...</TableCell></TableRow>
            ) : filtered.length === 0 ? (
              <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Aucune commande</TableCell></TableRow>
            ) : filtered.map((o) => (
              <Fragment key={o.id}>
              <TableRow>
                <TableCell><div className="font-medium">{o.customer_name}</div><div className="text-xs text-muted-foreground">{o.product_name}</div></TableCell>
                <TableCell className="text-sm">{vendeurMap[o.vendeur_id] || "—"}</TableCell>
                <TableCell>{o.customer_city}</TableCell>
                <TableCell className="font-mono text-sm">{o.customer_phone}</TableCell>
                <TableCell className="font-semibold">{Number(o.order_value).toFixed(2)} MAD</TableCell>
                <TableCell><StatusBadge status={o.status} /></TableCell>
                <TableCell className="text-right">
                  {o.status === "Pickup" && (
                    <Button variant="outline" size="sm" onClick={() => printSticker(o)}>
                      <Printer className="h-4 w-4 mr-1" /> Sticker
                    </Button>
                  )}
                  <Button variant="ghost" size="icon" onClick={() => setExpandedOrderId(expandedOrderId === o.id ? null : o.id)} aria-label="Voir détails">
                    <ChevronDown className={cn("h-4 w-4 transition-transform", expandedOrderId === o.id && "rotate-180")} />
                  </Button>
                </TableCell>
              </TableRow>
              {expandedOrderId === o.id && (
                <TableRow>
                  <TableCell colSpan={7} className="bg-muted/20 p-0">
                    <OrderDetailsPanel order={o} />
                  </TableCell>
                </TableRow>
              )}
              </Fragment>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
};

export default AdminColis;
