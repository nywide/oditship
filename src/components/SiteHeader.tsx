import { useEffect, useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { Logo } from "./Logo";
import { Button } from "@/components/ui/button";
import { Menu, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

const links = [
  { to: "/", label: "Accueil" },
  { to: "/pricing", label: "Tarifs" },
  { to: "/about", label: "À propos" },
  { to: "/contact", label: "Contact" },
];

export const SiteHeader = () => {
  const [open, setOpen] = useState(false);
  const [authed, setAuthed] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setAuthed(!!data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setAuthed(!!s));
    return () => sub.subscription.unsubscribe();
  }, []);

  return (
    <header className="sticky top-0 z-50 border-b border-border/40 bg-background/80 backdrop-blur-xl">
      <div className="container flex h-16 items-center justify-between">
        <Link to="/" aria-label="ODiT — Accueil">
          <Logo />
        </Link>

        <nav className="hidden md:flex items-center gap-1">
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              end={l.to === "/"}
              className={({ isActive }) =>
                cn(
                  "px-4 py-2 text-sm font-medium rounded-md transition-colors",
                  isActive ? "text-primary bg-primary-soft" : "text-foreground/70 hover:text-foreground hover:bg-secondary"
                )
              }
            >
              {l.label}
            </NavLink>
          ))}
        </nav>

        <div className="hidden md:flex items-center gap-2">
          {authed ? (
            <Button onClick={() => navigate("/dashboard")} className="bg-primary hover:bg-primary/90">Tableau de bord</Button>
          ) : (
            <>
              <Button variant="ghost" onClick={() => navigate("/login")}>Connexion</Button>
              <Button onClick={() => navigate("/signup")} className="bg-accent hover:bg-accent/90 text-accent-foreground">Inscription</Button>
            </>
          )}
        </div>

        <button className="md:hidden p-2" onClick={() => setOpen((v) => !v)} aria-label="Menu">
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {open && (
        <div className="md:hidden border-t border-border bg-background">
          <nav className="container py-4 flex flex-col gap-1">
            {links.map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                end={l.to === "/"}
                onClick={() => setOpen(false)}
                className={({ isActive }) =>
                  cn(
                    "px-4 py-3 text-sm font-medium rounded-md",
                    isActive ? "text-primary bg-primary-soft" : "text-foreground/80 hover:bg-secondary"
                  )
                }
              >
                {l.label}
              </NavLink>
            ))}
            <div className="flex flex-col gap-2 pt-3 border-t border-border mt-2">
              {authed ? (
                <Button onClick={() => { setOpen(false); navigate("/dashboard"); }}>Tableau de bord</Button>
              ) : (
                <>
                  <Button variant="outline" onClick={() => { setOpen(false); navigate("/login"); }}>Connexion</Button>
                  <Button onClick={() => { setOpen(false); navigate("/signup"); }} className="bg-accent hover:bg-accent/90 text-accent-foreground">Inscription</Button>
                </>
              )}
            </div>
          </nav>
        </div>
      )}
    </header>
  );
};
