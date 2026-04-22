import { Link } from "react-router-dom";
import { Logo } from "./Logo";
import { Mail, MapPin, Phone } from "lucide-react";

export const SiteFooter = () => {
  return (
    <footer className="bg-sidebar text-sidebar-foreground mt-20">
      <div className="container py-14 grid gap-10 md:grid-cols-4">
        <div className="space-y-3">
          <Logo variant="light" showTagline />
          <p className="text-sm text-sidebar-foreground/70 max-w-xs">
            Plateforme marocaine de livraison spécialisée dans le e-commerce et le paiement à la livraison.
          </p>
        </div>
        <div>
          <h4 className="font-semibold mb-3 text-sm uppercase tracking-wider text-sidebar-foreground/90">Navigation</h4>
          <ul className="space-y-2 text-sm text-sidebar-foreground/70">
            <li><Link to="/" className="hover:text-accent transition-colors">Accueil</Link></li>
            <li><Link to="/pricing" className="hover:text-accent transition-colors">Tarifs</Link></li>
            <li><Link to="/about" className="hover:text-accent transition-colors">À propos</Link></li>
            <li><Link to="/contact" className="hover:text-accent transition-colors">Contact</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="font-semibold mb-3 text-sm uppercase tracking-wider text-sidebar-foreground/90">Compte</h4>
          <ul className="space-y-2 text-sm text-sidebar-foreground/70">
            <li><Link to="/login" className="hover:text-accent transition-colors">Connexion</Link></li>
            <li><Link to="/signup" className="hover:text-accent transition-colors">Inscription</Link></li>
            <li><Link to="/terms" className="hover:text-accent transition-colors">Conditions générales</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="font-semibold mb-3 text-sm uppercase tracking-wider text-sidebar-foreground/90">Contact</h4>
          <ul className="space-y-2 text-sm text-sidebar-foreground/70">
            <li className="flex items-start gap-2"><MapPin className="h-4 w-4 mt-0.5 shrink-0" /> Casablanca, Maroc</li>
            <li className="flex items-center gap-2"><Phone className="h-4 w-4 shrink-0" /> +212 5 22 00 00 00</li>
            <li className="flex items-center gap-2"><Mail className="h-4 w-4 shrink-0" /> contact@odit.ma</li>
          </ul>
        </div>
      </div>
      <div className="border-t border-sidebar-border">
        <div className="container py-5 flex flex-col md:flex-row gap-2 items-center justify-between text-xs text-sidebar-foreground/60">
          <p>© {new Date().getFullYear()} ODiT — only deliver it. Tous droits réservés.</p>
          <p>Made in Morocco 🇲🇦</p>
        </div>
      </div>
    </footer>
  );
};
