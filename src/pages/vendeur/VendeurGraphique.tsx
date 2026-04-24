import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ORDER_STATUSES, statusColor, statusLabel } from "@/lib/orderStatus";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { TrendingUp, ShoppingBag } from "lucide-react";

const VendeurGraphique = () => {
  const { user, profile } = useAuth();
  const [orders, setOrders] = useState<{ status: string; order_value: number }[]>([]);
  const isAgent = profile?.agent_of != null;
  const agentPages = (profile?.agent_pages ?? {}) as Record<string, boolean | string>;
  const graphiqueScope = agentPages.graphique_scope === "own" ? "own" : "all";

  useEffect(() => {
    if (!user) return;
    let query = supabase.from("orders").select("status, order_value");
    if (isAgent && graphiqueScope === "own") query = query.eq("agent_id", user.id);
    query.then(({ data }) => setOrders((data ?? []) as any));
  }, [user, isAgent, graphiqueScope]);

  const totalValue = useMemo(() => orders.reduce((a, b) => a + Number(b.order_value || 0), 0), [orders]);
  const totalCount = orders.length;

  const breakdown = useMemo(() => {
    return ORDER_STATUSES.map((s) => {
      const count = orders.filter((o) => o.status === s).length;
      const pct = totalCount ? (count / totalCount) * 100 : 0;
      return { status: s, count, pct, color: statusColor(s).hex };
    });
  }, [orders, totalCount]);

  const chartData = breakdown.filter((b) => b.count > 0);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-6 flex items-center gap-4">
            <div className="h-12 w-12 rounded-lg bg-primary-soft flex items-center justify-center">
              <TrendingUp className="h-6 w-6 text-primary" />
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Chiffre d'Affaires</div>
              <div className="text-2xl font-bold">{totalValue.toFixed(2)} MAD</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 flex items-center gap-4">
            <div className="h-12 w-12 rounded-lg bg-accent-soft flex items-center justify-center">
              <ShoppingBag className="h-6 w-6 text-accent" />
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Total Commandes</div>
              <div className="text-2xl font-bold">{totalCount}</div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle className="text-lg">Répartition par statut</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2">
              {breakdown.map((b) => (
                <div key={b.status} className="flex items-center gap-3">
                  <span className="h-3 w-3 rounded-full" style={{ backgroundColor: b.color }} />
                  <span className="flex-1 text-sm">{statusLabel(b.status)}</span>
                  <span className="text-sm font-semibold w-12 text-right">{b.count}</span>
                  <span className="text-xs text-muted-foreground w-14 text-right">{b.pct.toFixed(1)}%</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-lg">Graphique</CardTitle></CardHeader>
          <CardContent>
            {chartData.length === 0 ? (
              <div className="h-72 flex items-center justify-center text-muted-foreground">Aucune donnée</div>
            ) : (
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={chartData} dataKey="count" nameKey="status" cx="50%" cy="50%" outerRadius={90} label>
                      {chartData.map((d) => <Cell key={d.status} fill={d.color} />)}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default VendeurGraphique;
