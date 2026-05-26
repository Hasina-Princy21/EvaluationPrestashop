# Affichage Détaillé par Jour (Statistiques)

Conformément au document d'évaluation (J4), nous avons ajouté le tableau d'affichage détaillé par jour dans le tableau de bord des statistiques.

## Fichiers modifiés
- `src/backoffice/pages/Statistics.tsx`

## Ce qui a été changé

### 1. Agrégation des données quotidiennes
Dans la fonction `fetchData()` qui récupère les commandes depuis l'API PrestaShop, nous avons ajouté une nouvelle logique (étape 4) qui boucle sur toutes les commandes valides :
- Nous regroupons les commandes par date (`date_add` convertie en format `JJ/MM/AAAA`).
- Pour chaque jour, nous incrémentons le **nombre de commandes passées**.
- Nous additionnons également le **montant généré** (`total_paid_tax_excl`) pour avoir le revenu hors taxes du jour.
- Les données sont ensuite triées de la date la plus récente à la plus ancienne.

### 2. Ajout de la section "Détails par Jour"
Sous le tableau des catégories, nous avons ajouté un nouveau tableau (`<div className="statistics-section">`) qui affiche :
- La Date.
- Le Nombre de commandes passées ce jour-là.
- Le Montant généré (HT) en euros.

Ce tableau s'intègre parfaitement avec le design existant (classes CSS `statistics-table`).
