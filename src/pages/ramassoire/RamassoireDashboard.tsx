import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusBadge } from "@/components/StatusBadge";
import { Package, PackageCheck } from "lucide-react";
import { Outlet, Routes, Route, Navigate } from "react-router-dom";
import { toast } from "sonner";

const RamassoireList = () => {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    supabase.from("orders").select("*")
      .in("status", ["Confirmé", "Pickup"])
      .order("created_at", { ascending: false })
      .then(({ data }) => { setOrders(data ?? []); setLoading(false); });
  };
  useEffect(load, []);

  const pickup = async (id: number) => {
    const { error } = await supabase.from("orders").update({ status: "Ramassé" }).eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success("Colis ramassé"); load(); }
  };

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">Colis à ramasser</h2>
      <Card className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tracking</TableHead>
              <TableHead>Client</TableHead>
              <TableHead>Ville</TableHead>
              <TableHead>Adresse</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Chargement...</TableCell></TableRow>
            ) : orders.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Aucun colis à ramasser</TableCell></TableRow>
            ) : orders.map((o) => (
              <TableRow key={o.id}>
                <TableCell className="font-mono text-xs">{o.external_tracking_number || o.tracking_number || `ODiT-${o.id}`}</TableCell>
                <TableCell><div className="font-medium">{o.customer_name}</div><div className="text-xs text-muted-foreground">{o.product_name}</div></TableCell>
                <TableCell>{o.customer_city}</TableCell>
                <TableCell className="text-sm">{o.customer_address}</TableCell>
                <TableCell><StatusBadge status={o.status} /></TableCell>
                <TableCell className="text-right">
                  <Button size="sm" onClick={() => pickup(o.id)}>
                    <PackageCheck className="h-4 w-4 mr-1" /> Ramasser
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
};

const RamassoireDashboard = () => (
  <DashboardLayout
    title="Ramassoire"
    nav={[{ to: "/dashboard/ramassoire/colis", label: "Colis", icon: <Package className="h-4 w-4" /> }]}
  />
);

export { RamassoireList };
export default RamassoireDashboard;
