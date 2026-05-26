# Modification de la page de connexion (FrontOffice)

Conformément à la consigne demandant de "Changer la page d’accueil par défaut, par une page qui affiche la liste des utilisateurs existants. On peut choisir avec quel utilisateur on veut se connecter. rajouter une option 'utilisateur anonyme'", nous avons repensé la page de connexion du FrontOffice.

## Fichiers modifiés
- `src/frontoffice/pages/login.tsx`
- `src/frontoffice/pages/login.css`

## Ce qui a été changé

### 1. Remplacement du formulaire par une sélection d'utilisateurs
- L'ancien formulaire avec champs **Email** et **Mot de passe** a été entièrement supprimé.
- Au chargement du composant, nous effectuons désormais un appel à `CustomerService.getAll()` pour récupérer la liste complète des clients existants dans la base de données.
- Les clients sont affichés sous forme de cartes cliquables (`<button className="user-card">`).
- Cliquer sur un utilisateur déclenche la fonction `handleLogin` qui connecte automatiquement l'utilisateur (en gardant la logique de synchronisation du panier existante).

### 2. Ajout de l'option "Utilisateur Anonyme"
- Une carte spécifique "Utilisateur Anonyme" a été ajoutée en haut de la liste.
- Un clic sur cette carte déclenche la fonction `handleAnonymousLogin` qui nettoie le `customerId` du `localStorage` (s'il y en avait un) et redirige vers l'accueil (`/front`), permettant ainsi une navigation sans compte.

### 3. Styles et Ergonomie (CSS)
- De nouvelles règles CSS ont été ajoutées dans `login.css` pour présenter les utilisateurs sous forme de liste défilante (`.user-list`), avec des avatars générés à partir de leurs initiales (`.user-avatar`) et des effets de survol interactifs (`.user-card:hover`) pour rendre la sélection intuitive.

> [!NOTE]
> La synchronisation complexe du panier entre un utilisateur déconnecté et connecté a été intégralement préservée dans la nouvelle logique de clic de connexion.
