# Fiche Produit (Frontoffice)

## Logique Métier
Page fondamentale de conversion. Elle détaille un article spécifique, affichant ses photos, sa description complète, ses caractéristiques et ses déclinaisons (tailles, couleurs). Son but métier est de valider le choix de l'utilisateur et de permettre l'ajout au panier.

## Interfaces & Types Communs
```typescript
export interface ProductDetails {
  id: number;
  description: string;
  price: number;
}

export interface Combination {
  id_product_attribute: number; // ex: ID pour Taille M + Rouge
  quantity: number; // Stock spécifique à cette combinaison
}
```

## Fonctions Principales
*   **`fetchProduct(id)` / `fetchCombinations(id)`** : Chargement des données au montage.
```typescript
useEffect(() => {
  const loadData = async () => {
    // Parallélisation des requêtes
    const [prodData, combData] = await Promise.all([
      productService.getProductById(id),
      productService.getCombinations(id)
    ]);
    setProduct(prodData);
    setCombinations(combData);
  };
  loadData();
}, [id]);
```
*   **`addToCart(product, quantity, combination)`** :
```typescript
const handleAddToCart = () => {
  if (selectedCombination && selectedCombination.quantity >= quantity) {
    // On appelle l'action du state global (Zustand, Context, etc)
    addToCart(product, quantity, selectedCombination.id_product_attribute);
  }
};
```
