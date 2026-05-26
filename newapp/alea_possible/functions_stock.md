# Fonctions pour la gestion des stocks de produits

Voici une liste des fonctions nécessaires pour gérer les stocks des produits via l'API (basé sur le service `stock_availableService.ts`). 

## 1. Récupérer tous les stocks disponibles
Cette fonction permet de récupérer la liste complète des stocks de tous les produits (et de leurs déclinaisons).

```typescript
// Retourne un tableau d'objets contenant les informations de stock (id, id_product, quantity, etc.)
const fetchAllStocks = async () => {
    try {
        const stocks = await StockAvailableService.getAll();
        console.log("Liste des stocks :", stocks);
        return stocks;
    } catch (error) {
        console.error("Erreur lors de la récupération des stocks :", error);
        throw error;
    }
};
```

## 2. Récupérer le stock d'un produit spécifique
Utile pour obtenir l'état du stock d'un produit connaissant son identifiant (`id_product`).

```typescript
const fetchStockByProductId = async (productId: number) => {
    try {
        const stockData = await StockAvailableService.getByProductId(productId);
        if (stockData) {
            console.log(`Le produit ${productId} a ${stockData.quantity} en stock.`);
        } else {
            console.log(`Aucun stock trouvé pour le produit ${productId}`);
        }
        return stockData;
    } catch (error) {
        console.error(`Erreur pour le produit ${productId}:`, error);
        throw error;
    }
};
```

## 3. Mettre à jour la quantité en stock d'un produit (Diminution / Augmentation)
Cette fonction récupère l'entrée du stock, modifie sa quantité et envoie une requête de mise à jour (PUT) au serveur.

```typescript
const updateProductStock = async (stockId: number, currentQuantity: number, quantityChange: number) => {
    try {
        // 1. Récupérer l'entrée de stock existante pour conserver ses autres propriétés
        const existingStock = await StockAvailableService.getById(stockId);
        
        if (!existingStock) throw new Error("Entrée de stock introuvable");

        // 2. Calculer la nouvelle quantité
        const newQuantity = currentQuantity + quantityChange; 
        
        // 3. Préparer les données à mettre à jour
        const stockPayload = {
            id: stockId,
            id_product: existingStock.id_product,
            id_product_attribute: existingStock.id_product_attribute,
            quantity: newQuantity,
            id_shop: existingStock.id_shop,
            id_shop_group: existingStock.id_shop_group,
            out_of_stock: existingStock.out_of_stock,
            depends_on_stock: existingStock.depends_on_stock,
        };

        // 4. Utiliser la méthode de mise à jour appropriée de l'API (ex: StockAvailableService.update)
        const updatedStock = await StockAvailableService.update(stockId, stockPayload);
        console.log("Stock mis à jour avec succès :", updatedStock);
        return updatedStock;
    } catch (error) {
        console.error("Erreur lors de la mise à jour du stock :", error);
        throw error;
    }
};
```

## 4. Retirer des stocks lors d'une commande (Décrémentation)
Fonction spécialisée directement pour retirer une quantité X du stock, couramment utilisée lors du passage ou de la validation d'une commande.

```typescript
const removeStockForOrder = async (productId: number, quantityToRemove: number) => {
    try {
        // Étape 1 : Obtenir l'objet stock pour ce produit
        const stockData = await fetchStockByProductId(productId);
        
        if (!stockData) {
            throw new Error(`Aucun stock configuré pour le produit ${productId}.`);
        }
        
        if (stockData.quantity < quantityToRemove) {
            throw new Error(`Stock insuffisant pour le produit ${productId}. Quantité disponible: ${stockData.quantity}`);
        }

        // Étape 2 : Mettre à jour le stock en retirant la quantité
        const updated = await updateProductStock(stockData.id, stockData.quantity, -quantityToRemove);
        console.log(`Opération réussie. Stock restant: ${updated.quantity}`);
        
        return updated;
    } catch (error) {
        console.error("Erreur lors de la déduction de stock des commandes:", error);
        throw error;
    }
};
```

## 5. Analyser tous les stocks et trouver les produits en rupture (Out of Stock)
Utile pour construire un rapport des produits nécessitant un réapprovisionnement.

```typescript
const findOutOfStockProducts = async () => {
    try {
        const stocks = await fetchAllStocks();
        if (!stocks) return [];
        
        // On filtre sur les quantités <= 0
        const outOfStock = stocks.filter((stock: any) => parseInt(stock.quantity, 10) <= 0);
        console.log(`${outOfStock.length} déclinaisons de produits sont en rupture de stock.`);
        
        return outOfStock;
    } catch (error) {
        console.error("Erreur lors de l'analyse des ruptures de stock :", error);
        throw error;
    }
};
```
