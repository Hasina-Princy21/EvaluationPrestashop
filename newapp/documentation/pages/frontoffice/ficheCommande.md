# Détail de Commande (Frontoffice)

## Logique Métier
Afficher les détails exhaustifs d'une commande spécifique passée par le client. Cela inclut le récapitulatif des produits commandés, les éventuelles déclinaisons, les totaux (avec/sans TVA), l'adresse de livraison et le statut.

## Interfaces & Types Communs
*   `OrderDetails` / `OrderRow` : Définition des lignes de la commande (produit acheté, quantité, prix unitaire).
*   `Address` : Récupérée via `addressService.ts` pour afficher où la commande a été ou sera livrée.

## Fonctions Principales
*   **`fetchOrderDetails(orderId)`** : Appelle l'API (via `orderService.ts`) pour récupérer la grappe de données liées à l'identifiant de la commande présent dans l'URL.
*   **`calculateTotal()`** : Vérification ou affichage du sous-total, frais de port, et total final TTC.
*   **`reorder()`** *(Optionnel)* : Logique permettant d'ajouter à nouveau tous ces articles au panier (duplication de panier).
