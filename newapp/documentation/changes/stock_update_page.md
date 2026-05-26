# Ajout de la page de gestion du stock produit

## Changement
- Création de la page `src/backoffice/pages/stockUpdate.tsx` pour ajouter du stock à un produit depuis le backoffice.
- Ajout du style dédié dans `src/backoffice/pages/stockUpdate.css`.
- Ajout de l’entrée de navigation dans `src/backoffice/components/Sidebar.tsx`.
- Ajout de la route sécurisée `/backoffice/stock` dans `src/App.tsx`.

## Méthode
- La page charge la liste des produits via `ProductService.getProducts()`.
- Le stock courant est récupéré via `StockAvailableService.getByProductAndAttribute(productId, 0)`.
- Lors de l’ajout, la quantité est validée comme positive, puis le stock est mis à jour avec `StockAvailableService.update()` ou `StockAvailableService.create()` si la ligne n’existe pas.
- Chaque ajout manuel est enregistré dans un journal local pour permettre l’affichage de l’évolution journalière.
