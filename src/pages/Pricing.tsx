import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, ChevronLeft, ChevronRight } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface Rule {
  city: string;
  delivery_fee: number;
  refusal_fee: number;
  annulation_fee: number;
}

const PAGE_SIZE = 20;

const Pricing = () => {
  const [rules, setRules] = useState<Rule[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("pricing_rules")
        .select("city, delivery_fee, refusal_fee, annulation_fee")
        .is("vendeur_id", null)
        .order("city");
      setRules(data ?? []);
      setLoading(false);
    })();
  }, []);

  const filtered = useMemo(
    () => rules.filter((r) => r.city.toLowerCase().includes(search.toLowerCase())),
    [rules, search]
  );

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const slice = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  return (
    <div className="container py-12 md:py-20">
      <div className="max-w-2xl mb-10">
        <p className="text-accent text-sm font-bold uppercase tracking-wider mb-3">Tarification</p>
        <h1 className="text-4xl md:text-5xl font-extrabold mb-4">Tarifs par ville</h1>
        <p className="text-muted-foreground text-lg">
          Tous les tarifs sont en MAD, hors TVA. Aucun frais de packaging. Tarifs personnalisés disponibles sur demande pour les gros volumes.
        </p>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="p-4 border-b border-border flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                placeholder="Rechercher une ville..."
                className="pl-9"
              />
            </div>
            <p className="text-sm text-muted-foreground">{filtered.length} villes</p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-secondary/60">
                <tr className="text-left">
                  <th className="px-4 py-3 font-semibold">Ville</th>
                  <th className="px-4 py-3 font-semibold text-right">Frais de livraison</th>
                  <th className="px-4 py-3 font-semibold text-right">Frais de refus</th>
                  <th className="px-4 py-3 font-semibold text-right">Frais d'annulation</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array.from({ length: 8 }).map((_, i) => (
                    <tr key={i} className="border-t border-border">
                      <td className="px-4 py-3"><Skeleton className="h-4 w-32" /></td>
                      <td className="px-4 py-3"><Skeleton className="h-4 w-16 ml-auto" /></td>
                      <td className="px-4 py-3"><Skeleton className="h-4 w-16 ml-auto" /></td>
                      <td className="px-4 py-3"><Skeleton className="h-4 w-16 ml-auto" /></td>
                    </tr>
                  ))
                ) : slice.length === 0 ? (
                  <tr><td colSpan={4} className="px-4 py-12 text-center text-muted-foreground">Aucune ville trouvée.</td></tr>
                ) : slice.map((r) => (
                  <tr key={r.city} className="border-t border-border hover:bg-secondary/40 transition-colors">
                    <td className="px-4 py-3 capitalize font-medium">{r.city}</td>
                    <td className="px-4 py-3 text-right font-mono">{Number(r.delivery_fee).toFixed(2)} MAD</td>
                    <td className="px-4 py-3 text-right font-mono">{Number(r.refusal_fee).toFixed(2)} MAD</td>
                    <td className="px-4 py-3 text-right font-mono">{Number(r.annulation_fee).toFixed(2)} MAD</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="p-4 border-t border-border flex items-center justify-between">
            <p className="text-sm text-muted-foreground">Page {currentPage} sur {totalPages}</p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={currentPage === 1}>
                <ChevronLeft className="h-4 w-4" /> Précédent
              </Button>
              <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>
                Suivant <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Pricing;
