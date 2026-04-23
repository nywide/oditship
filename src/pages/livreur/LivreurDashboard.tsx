import { Outlet } from "react-router-dom";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Package, Code2 } from "lucide-react";

const LivreurDashboard = () => (
  <DashboardLayout
    title="Livreur"
    nav={[
      { to: "/dashboard/livreur/colis", label: "Colis", icon: <Package className="h-4 w-4" /> },
      { to: "/dashboard/livreur/doc-api", label: "Doc API", icon: <Code2 className="h-4 w-4" /> },
    ]}
  />
);

export default LivreurDashboard;
