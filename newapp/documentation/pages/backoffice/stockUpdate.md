# Mise à Jour du Stock (Backoffice)

## Logique Métier
Synchronise l'inventaire physique avec l'inventaire numérique. Cette page permet à un magasinier ou un admin de faire des entrées/sorties de stock individuelles ou en masse sans toucher aux détails textuels du produit.

## Interfaces & Types Communs
```typescript
export interface StockAvailable {
  id_stock_available: number;
  id_product: number;
  id_product_attribute: number; // 0 si produit simple sans déclinaison
  quantity: number;
}
```

## Fonctions Principales
*   **`handleQuantityAdjustment(stockId, modifier)`** :
```typescript
// Ajustement local avant la sauvegarde pour un effet React "optimistique"
const handleQuantityAdjustment = (stockId: number, adjustment: number) => {
  setStocks(prevStocks => prevStocks.map(stock => 
    stock.id_stock_available === stockId 
      ? { ...stock, quantity: stock.quantity + adjustment } 
      : stock
  ));
};
```
*   **`saveStock(stockItem)`** :
```typescript
const saveStock = async (stockItem: StockAvailable) => {
  try {
    // Appel PUT nécessitant le payload final
    await stock_availableService.updateQuantity(
        stockItem.id_stock_available, 
        stockItem.quantity
    );
    toast.success("Stock mis à jour avec succès");
  } catch (error) {
    toast.error("Erreur de synchro avec PrestaShop");
  }
};
```
