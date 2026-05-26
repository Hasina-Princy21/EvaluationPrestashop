# Affichage de la quantité en stock sur la fiche produit

## Fichiers modifiés

1. **`src/api/stock_availableService.ts`** :
   - Ajout de la méthode `getByProductId(productId: number)` pour récupérer les données de stock (disponibles et filtrées par `id_product` de l'API web service Prestashop).
   - Cette méthode utilise `api.get` avec le paramètre `?filter[id_product]=${productId}&display=full` et retourne le premier stock trouvé correspondant.

2. **`src/frontoffice/pages/ficheProduct.tsx`** :
   - **Importation** : Ajout de l'import `StockAvailableService` depuis `../../api/stock_availableService`.
   - **State React** : Ajout du state `availableStock` qui garde en mémoire la quantité en stock disponible pour le produit affiché.
   - **`useEffect`** : Mise à jour de la fonction `fetchProduct` en `fetchProductAndStock` afin de lancer la requête récupérant le stock immédiatement après la récupération du produit. La valeur récupérée alimente le state `availableStock`.
   - **Interface Utilisateur (UI)** :
     - Ajout de l'affichage textuel `<p className="product-stock">En stock : {availableStock}</p>` juste sous le prix (affiche « Rupture de stock » si <= 0).
     - Modification de la balise `<input type="number">` de la quantité d'ajout au panier. Ajout de la limite `max` définie sur la quantité en stock disponible de manière dynamique pour ne pas dépasser le stock réel.
     - Mise à jour de l'événement `onChange` sur l'input pour empêcher la sélection d'une quantité supérieure au stock via la saisie manuelle.
     - Désactivation de l'ajout au panier (bouton "Ajouter au panier") si le stock est égal ou inférieur à 0.