import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/Logo";
import { toast } from "sonner";

const ResetPassword = () => {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [hasRecovery, setHasRecovery] = useState(false);

  useEffect(() => {
    // Recovery link puts type=recovery in URL hash
    if (window.location.hash.includes("type=recovery")) setHasRecovery(true);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) {
      toast.error("Les mots de passe ne correspondent pas.");
      return;
    }
    const { error } = await supabase.auth.updateUser({ password });
    if (error) toast.error(error.message);
    else {
      toast.success("Mot de passe mis à jour");
      navigate("/login");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-mesh p-4">
      <div className="w-full max-w-md">
        <div className="flex justify-center mb-8"><Logo showTagline /></div>
        <Card className="shadow-elegant">
          <CardContent className="p-8">
            <h1 className="text-2xl font-extrabold mb-1">Nouveau mot de passe</h1>
            {!hasRecovery ? (
              <p className="text-sm text-muted-foreground mt-4">
                Ouvrez le lien de réinitialisation depuis votre email pour continuer.
              </p>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4 mt-6">
                <div>
                  <Label htmlFor="pw">Nouveau mot de passe</Label>
                  <Input id="pw" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} className="mt-1.5" />
                </div>
                <div>
                  <Label htmlFor="pw2">Confirmer</Label>
                  <Input id="pw2" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required minLength={6} className="mt-1.5" />
                </div>
                <Button type="submit" className="w-full">Mettre à jour</Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ResetPassword;
