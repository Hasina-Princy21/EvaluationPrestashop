# Panier (Frontoffice)

## Logique Métier
Étape intermédiaire et cruciale avant le paiement. Le système calcule les montants totaux, permet de modifier les quantités, de retirer des produits et affiche les récapitulatifs. Métier : Transformation du panier virtuel en Entité "Commande" (Order) dans la base PrestaShop.

## Interfaces & Types Communs
```typescript
// Représente une ligne produit dans le panier
export interface CartItem {
  product: Product;
  quantity: number;
}

// Format attendu par notre backend pour créer la commande
export interface OrderPayload {
  id_customer: number;
  id_address_delivery: number;
  current_state: number; 
  product_list: { id: number; quantity: number }[];
}
```

## Fonctions Principales
*   **`updateQuantity()`** : Met à jour sans dépasser le stock.
```typescript
// Exemple de vérification du stock avant modification
const updateQuantity = (productId: number, newQuantity: number) => {
  const item = cartItems.find(i => i.product.id === productId);
  if (item && newQuantity <= item.product.stock) {
    setCartItems(cartItems.map(i => 
      i.product.id === productId ? { ...i, quantity: newQuantity } : i
    ));
  }
};
```
*   **`computeTotals()`** : Calcul des montants.
```typescript
// Calcul des totaux
const computeTotals = () => {
  const total = cartItems.reduce((acc, item) => acc + (item.product.price * item.quantity), 0);
  setTotalAmount(total);
};
```
