import { Navigate, useLocation } from "react-router-dom";
import { useAuth, AppRole } from "@/contexts/AuthContext";
import { Loader2 } from "lucide-react";

interface Props {
  children: React.ReactNode;
  allowedRoles?: AppRole[];
  agentPage?: string;
}

export const ProtectedRoute = ({ children, allowedRoles, agentPage }: Props) => {
  const { user, role, profile, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" state={{ from: location }} replace />;

  if (profile?.is_active === false) return <Navigate to="/login" replace />;

  if (allowedRoles && role && !allowedRoles.includes(role)) {
    return <Navigate to="/dashboard" replace />;
  }

  const isAgent = role === "agent" || profile?.agent_of != null;
  const agentPages = (profile?.agent_pages ?? null) as Record<string, boolean> | null;
  if (agentPage && isAgent && agentPages && agentPages[agentPage] !== true) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};
