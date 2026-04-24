Voici le plan pour corriger/ajouter les fonctionnalités du module Team côté Vendeur sans toucher aux autres rôles sauf les fonctions backend réutilisées.

1. Ajouter la suppression d’un agent dans Team
- Ajouter un bouton Supprimer dans la colonne Actions de `VendeurTeam`.
- Ajouter une confirmation avant suppression.
- Adapter la fonction backend `delete-user` pour autoriser aussi un vendeur à supprimer uniquement ses propres agents (`profiles.agent_of = vendeur connecté`).
- Garder l’autorisation admin existante intacte.
- Après suppression, recharger la liste des agents.

2. Ajouter “Login as agent” côté vendeur
- Ajouter un bouton “Se connecter en tant que” dans la colonne Actions, à côté de Modifier/Supprimer.
- Adapter `get-impersonation-token` pour autoriser un vendeur à impersonate uniquement ses propres agents.
- Réutiliser la page `/impersonate` existante pour ouvrir l’agent dans un nouvel onglet, comme côté administrateur.
- Empêcher toute connexion vers un compte qui n’est pas un agent appartenant au vendeur.

3. Ajouter les permissions de visibilité des données pour Colis et Graphique
- Étendre `agent_pages` pour stocker non seulement les pages autorisées, mais aussi le mode de visibilité :
  - `colis: true/false`
  - `colis_scope: "all" | "own"`
  - `graphique: true/false`
  - `graphique_scope: "all" | "own"`
  - `facturation: true/false` reste comme aujourd’hui, sans option supplémentaire.
- Dans le popup Ajouter/Modifier agent, afficher sous Colis et Graphique un choix clair :
  - “Toutes les commandes du vendeur”
  - “Seulement les commandes créées par cet agent”
- Dans le tableau Team, afficher les permissions de manière lisible, par exemple :
  - `Colis: Tous` ou `Colis: Agent`
  - `Graphique: Tous` ou `Graphique: Agent`
  - `Facturation`

4. Appliquer réellement la visibilité dans les pages agent
- Dans `VendeurColis`, si l’utilisateur connecté est un agent :
  - si `colis_scope = "all"`, il voit les commandes du vendeur comme actuellement ;
  - si `colis_scope = "own"`, il voit uniquement les commandes où `agent_id = user.id`.
- Dans `VendeurGraphique`, appliquer la même logique :
  - `graphique_scope = "all"` : statistiques de toutes les commandes du vendeur ;
  - `graphique_scope = "own"` : statistiques uniquement des commandes créées par l’agent.
- Pour un vendeur normal, rien ne change : il voit toutes ses données.

5. Sécurité et compatibilité
- Les anciennes permissions existantes sans `*_scope` continueront à fonctionner avec `all` par défaut, pour ne pas casser les agents déjà créés.
- Les routes protégées restent basées sur `colis`, `facturation`, `graphique`.
- La page Team ne sera toujours pas proposée comme permission agent.
- Aucun changement prévu sur Facturation, comme demandé.

Détails techniques
- Fichiers frontend prévus :
  - `src/pages/vendeur/VendeurTeam.tsx`
  - `src/pages/vendeur/VendeurColis.tsx`
  - `src/pages/vendeur/VendeurGraphique.tsx`
- Fonctions backend prévues :
  - `supabase/functions/delete-user/index.ts`
  - `supabase/functions/get-impersonation-token/index.ts`
- Pas besoin de nouvelle table : on utilisera la colonne existante `profiles.agent_pages`.