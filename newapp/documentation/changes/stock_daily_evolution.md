# Tableau d'évolution journalière du stock

## Changement
- Ajout d’un tableau d’évolution journalière dans la page stock du backoffice.
- Le tableau affiche l’ouverture, les entrées, les sorties, le net et la clôture pour chaque jour.

## Méthode
- L’évolution est calculée pour le produit sélectionné sur les 7 derniers jours.
- Les entrées proviennent du journal local des ajouts manuels stockés dans `localStorage`.
- Les sorties proviennent des commandes au statut `Livré` via `OrderService.getAll()` et les lignes de commande associées.
- Le tableau est reconstruit à partir du stock courant, ce qui donne une lecture opérationnelle cohérente dans le backoffice.