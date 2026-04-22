import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Truck, Banknote, MapPin, Headphones, Package, ArrowRight, Zap } from "lucide-react";

const services = [
  { icon: MapPin, title: "Couverture nationale", desc: "Plus de 250 villes desservies à travers tout le Royaume." },
  { icon: Banknote, title: "Cash on Delivery", desc: "Paiement à la livraison sécurisé. Vos clients paient à la réception." },
  { icon: Package, title: "Suivi (bientôt)", desc: "Suivez chaque colis en temps réel sur la plateforme ODiT." },
  { icon: Headphones, title: "Support dédié", desc: "Une équipe locale à votre écoute du lundi au samedi." },
];

const stats = [
  { value: "250+", label: "Villes desservies" },
  { value: "12", label: "Hubs régionaux" },
  { value: "24-48h", label: "Délai de livraison" },
  { value: "0 MAD", label: "Frais d'inscription" },
];

const Home = () => {
  return (
    <>
      {/* HERO */}
      <section className="relative overflow-hidden bg-mesh">
        <div className="container py-20 md:py-32 relative">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary-soft border border-primary/10 text-primary text-xs font-semibold mb-6">
              <Zap className="h-3.5 w-3.5" />
              Nouvelle génération de livraison au Maroc
            </div>
            <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-balance mb-6">
              <span className="text-foreground">La livraison au Maroc,</span>
              <br />
              <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                réinventée.
              </span>
            </h1>
            <p className="text-xl md:text-2xl text-muted-foreground font-medium mb-3">
              <span className="font-bold text-foreground">only deliver it.</span>
            </p>
            <p className="text-lg text-muted-foreground max-w-2xl mb-10 leading-relaxed">
              ODiT connecte les e-commerçants marocains à leurs clients grâce à un réseau national de livraison
              spécialisé dans le paiement à la livraison.
            </p>
            <div className="flex flex-wrap gap-4">
              <Button asChild size="lg" className="bg-accent hover:bg-accent/90 text-accent-foreground shadow-accent-glow">
                <Link to="/signup">
                  Commencer gratuitement <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link to="/pricing">Voir les tarifs</Link>
              </Button>
            </div>
          </div>

          {/* Floating stat card */}
          <div className="hidden lg:block absolute right-0 top-1/2 -translate-y-1/2 w-72 bg-card rounded-2xl shadow-elegant p-6 border border-border">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-10 w-10 rounded-full bg-primary flex items-center justify-center">
                <Truck className="h-5 w-5 text-primary-foreground" />
              </div>
              <div>
                <p className="text-sm font-semibold">Colis #ODiT-7K2X</p>
                <p className="text-xs text-muted-foreground">Casablanca → Fès</p>
              </div>
            </div>
            <div className="space-y-2">
              {["Crée", "Confirmé", "Pickup", "Transit"].map((s, i) => (
                <div key={s} className={`flex items-center gap-2 text-xs ${i < 3 ? "text-foreground" : "text-muted-foreground"}`}>
                  <div className={`h-2 w-2 rounded-full ${i < 3 ? "bg-accent" : "bg-muted"}`} />
                  {s}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* STATS */}
      <section className="border-y border-border bg-card">
        <div className="container py-10 grid grid-cols-2 md:grid-cols-4 gap-8">
          {stats.map((s) => (
            <div key={s.label} className="text-center">
              <p className="text-3xl md:text-4xl font-extrabold text-primary">{s.value}</p>
              <p className="text-sm text-muted-foreground mt-1">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* SERVICES */}
      <section className="container py-20">
        <div className="max-w-2xl mb-12">
          <p className="text-accent text-sm font-bold uppercase tracking-wider mb-3">Nos services</p>
          <h2 className="text-3xl md:text-5xl font-extrabold mb-4">Tout ce qu'il faut pour livrer.</h2>
          <p className="text-muted-foreground text-lg">
            Une plateforme complète pensée pour les vendeurs e-commerce marocains.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {services.map((s) => (
            <Card key={s.title} className="border-border/60 hover:shadow-elegant hover:border-primary/30 transition-all group">
              <CardContent className="p-6">
                <div className="h-12 w-12 rounded-xl bg-primary-soft flex items-center justify-center mb-4 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                  <s.icon className="h-6 w-6 text-primary group-hover:text-primary-foreground" />
                </div>
                <h3 className="font-bold text-lg mb-2">{s.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{s.desc}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* ABOUT TEASER */}
      <section className="bg-secondary/50 border-y border-border">
        <div className="container py-20 grid md:grid-cols-2 gap-12 items-center">
          <div>
            <p className="text-accent text-sm font-bold uppercase tracking-wider mb-3">À propos de ODiT</p>
            <h2 className="text-3xl md:text-4xl font-extrabold mb-4">Une équipe marocaine, une mission claire.</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              ODiT est née d'un constat simple : le e-commerce marocain mérite mieux que des solutions de livraison
              lentes et opaques. Nous construisons une plateforme tech-first, transparente et locale.
            </p>
            <p className="text-muted-foreground leading-relaxed mb-6">
              De la création du colis jusqu'à la remise au client, tout passe par un seul tableau de bord.
              Pas de surprise, pas de frais cachés.
            </p>
            <Button asChild variant="outline">
              <Link to="/about">En savoir plus <ArrowRight className="ml-2 h-4 w-4" /></Link>
            </Button>
          </div>
          <div className="relative">
            <div className="bg-hero-gradient rounded-3xl p-10 text-primary-foreground shadow-elegant">
              <Truck className="h-12 w-12 text-accent mb-4" />
              <p className="text-3xl font-extrabold mb-2">only deliver it.</p>
              <p className="text-primary-foreground/80">
                Notre seule promesse. Et nous la tenons, jour après jour.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="container py-24 text-center">
        <h2 className="text-3xl md:text-5xl font-extrabold mb-4">Prêt à livrer mieux ?</h2>
        <p className="text-muted-foreground text-lg mb-8 max-w-xl mx-auto">
          Inscrivez-vous gratuitement et commencez à expédier vos colis dès aujourd'hui.
        </p>
        <Button asChild size="lg" className="bg-accent hover:bg-accent/90 text-accent-foreground shadow-accent-glow">
          <Link to="/signup">
            Créer mon compte vendeur <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </section>
    </>
  );
};

export default Home;
