const Terms = () => (
  <div className="container py-16 md:py-24 max-w-3xl">
    <p className="text-accent text-sm font-bold uppercase tracking-wider mb-3">Légal</p>
    <h1 className="text-4xl md:text-5xl font-extrabold mb-8">Conditions générales d'utilisation</h1>

    <div className="prose prose-lg max-w-none text-muted-foreground space-y-6 leading-relaxed">
      <section>
        <h2 className="text-foreground text-2xl font-bold mb-2">1. Objet</h2>
        <p>
          Les présentes conditions générales régissent l'utilisation de la plateforme ODiT, exploitée par
          ODiT SARL, société de droit marocain, ci-après dénommée « ODiT ».
        </p>
      </section>

      <section>
        <h2 className="text-foreground text-2xl font-bold mb-2">2. Service</h2>
        <p>
          ODiT met à disposition de ses utilisateurs vendeurs une plateforme permettant la création, le suivi et
          la gestion d'expéditions de colis sur le territoire marocain, avec ou sans paiement à la livraison.
        </p>
      </section>

      <section>
        <h2 className="text-foreground text-2xl font-bold mb-2">3. Inscription</h2>
        <p>
          L'inscription en tant que vendeur est gratuite et nécessite la fourniture d'informations exactes
          (nom, prénom, téléphone, CIN). L'utilisateur s'engage à maintenir ces informations à jour.
        </p>
      </section>

      <section>
        <h2 className="text-foreground text-2xl font-bold mb-2">4. Tarification</h2>
        <p>
          Les tarifs de livraison sont consultables sur la page « Tarifs » de la plateforme. Aucun frais
          de packaging n'est appliqué. Des frais de refus et d'annulation peuvent s'appliquer selon les
          conditions affichées.
        </p>
      </section>

      <section>
        <h2 className="text-foreground text-2xl font-bold mb-2">5. Responsabilités</h2>
        <p>
          ODiT s'engage à mettre en œuvre tous les moyens raisonnables pour assurer la livraison des colis
          dans les délais annoncés. Les vendeurs sont responsables de l'exactitude des informations
          communiquées (adresse, téléphone, valeur).
        </p>
      </section>

      <section>
        <h2 className="text-foreground text-2xl font-bold mb-2">6. Données personnelles</h2>
        <p>
          ODiT collecte et traite les données personnelles conformément à la loi 09-08 marocaine relative
          à la protection des personnes physiques à l'égard du traitement des données à caractère personnel.
        </p>
      </section>

      <section>
        <h2 className="text-foreground text-2xl font-bold mb-2">7. Modification des conditions</h2>
        <p>
          ODiT se réserve le droit de modifier les présentes conditions à tout moment. Les utilisateurs
          seront informés des modifications substantielles par email.
        </p>
      </section>

      <p className="text-sm italic mt-12">Document à valeur informative, à compléter par votre conseiller juridique avant publication.</p>
    </div>
  </div>
);

export default Terms;
