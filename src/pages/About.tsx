const About = () => (
  <div className="container py-16 md:py-24 max-w-3xl">
    <p className="text-accent text-sm font-bold uppercase tracking-wider mb-3">À propos</p>
    <h1 className="text-4xl md:text-5xl font-extrabold mb-6">L'histoire de ODiT</h1>
    <div className="prose prose-lg max-w-none text-muted-foreground space-y-4 leading-relaxed">
      <p>
        ODiT est née de l'expérience directe d'entrepreneurs marocains du e-commerce qui constataient
        un manque criant de solutions logistiques modernes, transparentes et adaptées au cash-on-delivery.
      </p>
      <p>
        Notre mission : <strong className="text-foreground">connecter chaque vendeur marocain à ses clients</strong>,
        partout au Maroc, avec une plateforme technologique qui rend la livraison aussi simple
        qu'un clic.
      </p>
      <p>
        Nous opérons un réseau de hubs régionaux couvrant plus de 250 villes, avec des partenaires
        livreurs locaux soigneusement sélectionnés. Chaque colis est tracé du ramassage jusqu'à la
        remise au destinataire.
      </p>
      <p className="text-foreground font-semibold">
        Notre devise est notre programme : <em>only deliver it.</em>
      </p>
    </div>

    <div className="mt-12 grid sm:grid-cols-3 gap-6">
      {[
        { v: "2024", l: "Année de fondation" },
        { v: "12", l: "Hubs régionaux" },
        { v: "100%", l: "Capital marocain" },
      ].map((s) => (
        <div key={s.l} className="rounded-2xl bg-primary-soft p-6 border border-primary/10">
          <p className="text-3xl font-extrabold text-primary">{s.v}</p>
          <p className="text-sm text-muted-foreground mt-1">{s.l}</p>
        </div>
      ))}
    </div>
  </div>
);

export default About;
