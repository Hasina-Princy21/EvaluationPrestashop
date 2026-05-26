# Journal des Modifications - Backoffice & Imports

Historique des changements apportés à l'application pour implémenter la Sidebar, la réinitialisation globale, l'importation de fichiers (CSV/ZIP) avec rollback et la gestion des commandes.

---

## 1. Composant Sidebar & Mise en Page Globale
- **Création du composant :** `src/backoffice/components/Sidebar.tsx`
  - Fournit une barre latérale de navigation fixe pour le panneau d'administration.
  - Liens inclus : Tableau de bord (`/backoffice`), Import des données (`/backoffice/import`), Reset Data (`/backoffice/resetdata`), Gestion de commande (`/backoffice/orders`).
  - Intègre les icônes vectorielles SVG pour un rendu premium et propre sans dépendances d'icônes externes.
  - Comprend le bouton de Déconnexion réinitialisant le store Zustand d'authentification.
- **Feuille de styles :** `src/backoffice/components/Sidebar.css`
  - Design sombre premium inspiré des tableaux de bord SaaS modernes (couleur de fond `#111827`, lueurs dégradées au survol, état actif brillant).
- **Layout :** `src/backoffice/components/BackofficeLayout.tsx` et `BackofficeLayout.css`
  - Agence la Sidebar et la zone de contenu principal fluide avec la sortie de routage `<Outlet />`.

---

## 2. Page de Réinitialisation Globale (Page B)
- **Création de la page :** `src/backoffice/pages/ResetData.tsx` et `ResetData.css`
  - Fournit un tableau de contrôle avec un bouton d'action principal rouge et un badge d'avertissement clignotant.
  - Modale de confirmation intégrée pour éviter les clics accidentels.
  - Affiche un panneau d'étapes dynamiques avec indicateurs d'état individuels (inactif, en cours, succès, erreur).
  - Appelle les méthodes `.resetData()` de tous les services PrestaShop (commandes, paniers, produits, catégories, clients, adresses, fournisseurs).

---

## 3. Page d'Importation Globale (Page C)
- **Création de la page :** `src/backoffice/pages/Import.tsx` et `Import.css`
  - Intègre deux champs de configuration modifiables par l'administrateur :
    - `Séparateur de champs CSV` (Valeur par défaut : `;`)
    - `Séparateur de champs à valeurs multiples` (Valeur par défaut : `,`)
  - Quatre zones de glisser-déposer / sélection de fichiers pour les CSV produits, déclinaisons, commandes, et l'archive ZIP d'images.
  - **Moteur d'importation asynchrone :**
    - Extrait les images binaires de l'archive ZIP en utilisant `jszip`.
    - Analyse les fichiers CSV ligne par ligne en utilisant `papaparse`.
    - Crée les catégories si elles n'existent pas.
    - Crée les produits, calcule le prix unitaire HT (avec conversion dynamique de la taxe), affecte le prix d'achat/fournisseur et téléverse la bonne image du ZIP d'après la référence du produit.
    - Résout et crée les attributs de déclinaison (groupes d'options de produits et valeurs d'options) s'ils n'existent pas, puis associe les déclinaisons créées avec le bon impact de prix et configure leur stock initial.
    - Crée les clients, génère des adresses de livraison/facturation et crée les paniers associés aux commandes.
    - Enregistre les commandes avec le statut correspondant : défaut `Paiement accepté` (ID 2), `Livré` (ID 5), ou `Annulé` (ID 6).
    - **Mouvement de stock à la livraison :** Déduis automatiquement la quantité disponible pour chaque article commandé si le statut de la commande importée est `Livré` (ID 5).
  - **Sécurité et Rollback Transactionnel :**
    - L'ensemble du processus tourne dans un bloc `try-catch` robuste.
    - Si une quelconque erreur de connexion, de validation ou de parsing survient durant l'import, le système affiche l'erreur, stoppe immédiatement le processus, et déclenche une réinitialisation automatique complète (Rollback) via les services de reset de données pour laisser la base PrestaShop 100% saine et propre.
  - **Terminal en direct :** Intègre une console de journalisation développeur en direct pour suivre chaque action de l'API en temps réel.

---

## 4. Page de Gestion des Commandes
- **Création de la page :** `src/backoffice/pages/OrderManagement.tsx` et `OrderManagement.css`
  - Tableau d'administration listant toutes les commandes PrestaShop avec tri décroissant par ID.
  - Affiche les détails complets : ID, référence, nom/e-mail du client, date d'ajout, méthode de paiement, total réglé et statut.
  - Comprend des filtres dynamiques (barre de recherche en temps réel et sélection par statut).
  - Menu déroulant interactif pour changer le statut de la commande vers : `Paiement accepté` (ID 2), `Livré` (ID 5), ou `Annulé` (ID 6).
  - **Logique intelligente de gestion des stocks :**
    - Transition vers "Livré" (depuis un autre statut) -> Décrémente automatiquement les stocks disponibles dans PrestaShop.
    - Annulation d'une commande précédemment livrée (transition depuis "Livré" vers un autre statut) -> Ré-incrémente et restaure automatiquement les stocks dans PrestaShop pour éviter les pertes d'inventaire.

---

## 5. Mises à jour de Routage et de Processus existants
- **Modification de routage :** `src/App.tsx`
  - Importe les nouvelles pages et layouts.
  - Structure les routes enfants pour `/backoffice` pour hériter du `BackofficeLayout` sécurisé par le `ProtectedRoute`.
- **Défaut de validation du panier :** `src/frontoffice/pages/panier.tsx`
  - Ajout de la propriété `current_state: 2` lors de la validation du panier pour que les commandes créées par le client passent par défaut au statut `Paiement accepté` (ID 2).
- **Extension API Produits :** `src/api/productService.ts`
  - Étend le payload de création et le générateur de document XML pour supporter les nœuds `<wholesale_price>`, `<product_type>` et `<available_date>`.
