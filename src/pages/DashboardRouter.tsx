import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2 } from "lucide-react";

const DashboardRouter = () => {
  const { role, loading, user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading) return;
    if (!user) { navigate("/login", { replace: true }); return; }
    switch (role) {
      case "vendeur":
      case "agent":
        navigate("/dashboard/vendeur/colis", { replace: true }); break;
      case "administrateur":
      case "superviseur":
        navigate("/dashboard/administrateur/colis", { replace: true }); break;
      case "livreur":
        navigate("/dashboard/livreur/colis", { replace: true }); break;
      case "ramassoire":
        navigate("/dashboard/ramassoire/colis", { replace: true }); break;
      default:
        navigate("/dashboard/placeholder", { replace: true });
    }
  }, [role, loading, user, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
};

export default DashboardRouter;
