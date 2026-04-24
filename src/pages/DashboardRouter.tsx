import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2 } from "lucide-react";

const DashboardRouter = () => {
  const { role, loading, user } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  let basePath = "/dashboard/placeholder";
  switch (role) {
    case "vendeur":
    case "agent":
      basePath = "/dashboard/vendeur/colis";
      break;
    case "administrateur":
    case "superviseur":
      basePath = "/dashboard/administrateur/colis";
      break;
    case "livreur":
      basePath = "/dashboard/livreur/colis";
      break;
    case "ramassoire":
      basePath = "/dashboard/ramassoire/colis";
      break;
    default:
      basePath = "/dashboard/placeholder";
  }

  return <Navigate to={basePath} replace />;
};

export default DashboardRouter;
