import { DashboardLayout } from "@/components/DashboardLayout";
import { Package, Receipt, BarChart3, Users } from "lucide-react";

const VendeurDashboard = () => (
  <DashboardLayout
    title="Vendeur"
    nav={[
      { to: "/dashboard/vendeur/colis", label: "Colis", icon: <Package className="h-4 w-4" />, permKey: "colis" },
      { to: "/dashboard/vendeur/facturation", label: "Facturation", icon: <Receipt className="h-4 w-4" />, permKey: "facturation" },
      { to: "/dashboard/vendeur/graphique", label: "Graphique", icon: <BarChart3 className="h-4 w-4" />, permKey: "graphique" },
      { to: "/dashboard/vendeur/team", label: "Team", icon: <Users className="h-4 w-4" />, permKey: "team" },
    ]}
  />
);

export default VendeurDashboard;
