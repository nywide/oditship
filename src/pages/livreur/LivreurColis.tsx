import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusBadge } from "@/components/StatusBadge";
import { Printer } from "lucide-react";
import { printSticker } from "@/lib/printSticker";

const LivreurColis = () => {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.from("orders").select("*").order("created_at", { ascending: false })
      .then(({ data }) => { setOrders(data ?? []); setLoading(false); });
  }, []);

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">Mes colis</h2>
      <Card className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tracking</TableHead>
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
              <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Chargement...</TableCell></TableRow>
            ) : orders.length === 0 ? (
              <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Aucun colis assigné</TableCell></TableRow>
            ) : orders.map((o) => (
              <TableRow key={o.id}>
                <TableCell className="font-mono text-xs">{o.external_tracking_number || o.tracking_number || `ODiT-${o.id}`}</TableCell>
                <TableCell><div className="font-medium">{o.customer_name}</div><div className="text-xs text-muted-foreground">{o.product_name}</div></TableCell>
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
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
};

export default LivreurColis;
