import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Logo } from "@/components/Logo";
import { useNavigate } from "react-router-dom";
import { Construction } from "lucide-react";

const DashboardPlaceholder = () => {
  const { role, profile, signOut } = useAuth();
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-mesh flex items-center justify-center p-4">
      <Card className="max-w-lg w-full shadow-elegant">
        <CardContent className="p-10 text-center">
          <Logo showTagline className="justify-center mb-6" />
          <Construction className="h-12 w-12 text-accent mx-auto mb-4" />
          <h1 className="text-2xl font-extrabold mb-2">Bienvenue {profile?.full_name ?? ""}</h1>
          <p className="text-muted-foreground mb-1">Rôle : <strong className="text-foreground">{role ?? "—"}</strong></p>
          <p className="text-sm text-muted-foreground mb-6">
            Le tableau de bord pour ce rôle sera disponible prochainement.
            Les rôles déjà actifs : <strong>Vendeur, Agent, Administrateur, Livreur</strong>.
          </p>
          <div className="flex gap-2 justify-center">
            <Button variant="outline" onClick={() => navigate("/")}>Retour à l'accueil</Button>
            <Button onClick={async () => { await signOut(); navigate("/login"); }}>Se déconnecter</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default DashboardPlaceholder;
