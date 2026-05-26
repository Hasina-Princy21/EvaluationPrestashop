# Ajout d'une Réduction aux Produits

Si l'on vous demande d'ajouter une fonctionnalité de **réduction** (discount/promotion) aux produits, voici l'analyse complète de ce qu'il faut modifier dans le projet.

## 1. Ce qu'il faut changer et OÙ

### A. Les Modèles / Types TypeScript
*   **Fichiers :** `src/api/productService.ts` (ou tout fichier déclarant l'interface `Product`).
*   **Quoi :** Ajouter les propriétés relatives aux réductions pour refléter les données envoyées par l'API (ex: de PrestaShop).

### B. L'Interface Frontoffice (UI)
*   **Fichiers :** 
    *   `src/frontoffice/components/ProductCard.tsx` (Carte aperçu du produit)
    *   `src/frontoffice/pages/ficheProduit.tsx` (ou équivalent pour la page de détail)
*   **Quoi :** Modifier l'affichage du prix. Afficher le prix d'origine barré, le prix final en évidence, et potentiellement un macaron/badge (ex: "-20%").

### C. Le Panier et la Logique de Paiement
*   **Fichiers :** 
    *   `src/frontoffice/pages/panier.tsx` (Page panier actuelle)
    *   Le gestionnaire d'état du panier (Zustand, Redux, ou le Context - ex: `src/api/stores/...`).
*   **Quoi :** S'assurer que le calcul du total du panier se base sur le **prix réduit**, et non sur le prix initial. 

### D. La Création de Commande
*   **Fichier :** `src/api/orderService.ts`
*   **Quoi :** Vérifier que la payload envoyée lors de la création de la commande transmet bien le nouveau prix unitaire pour éviter une incohérence avec le backend.

---

## 2. COMMENT faire ces changements

### Étape 1 : Mettre à jour l'interface Produit
```typescript
export interface Product {
    // ... autres champs existants (id, name, price, etc.)
    price: number; 
    has_discount?: boolean;
    reduction_type?: 'amount' | 'percentage';
    reduction_value?: number;
    price_final?: number; // le prix que le client paie réellement
}
```

### Étape 2 : Adapter le service de récupération (API)
Dans `productService.ts`, lors du formatage des données depuis PrestaShop, assurez-vous de calculer ou de mapper correctement la réduction.
```typescript
const calculateFinalPrice = (price: number, type?: string, value?: number) => {
    if (!type || !value) return price;
    return type === 'percentage' 
        ? price - (price * (value / 100))
        : price - value;
};
```

### Étape 3 : Modifier le rendu visuel (UI)
Dans `ProductCard.tsx` ou la fiche produit :
```tsx
<div className="price-container">
    {product.has_discount ? (
        <>
            <span className="price-old" style={{ textDecoration: 'line-through' }}>
                {product.price.toFixed(2)} €
            </span>
            <span className="price-new discount">
                {product.price_final.toFixed(2)} €
            </span>
            <span className="badge">
                {product.reduction_type === 'percentage' 
                    ? `-${product.reduction_value}%` 
                    : `-${product.reduction_value}€`}
            </span>
        </>
    ) : (
        <span className="price-normal">{product.price.toFixed(2)} €</span>
    )}
</div>
```

### Étape 4 : Mettre à jour les calculs du panier (`panier.tsx`)
Remplacer toutes les occurrences de `item.product.price` par `item.product.price_final` lors de la somme des produits :
```typescript
const totalCart = cartItems.reduce((acc, item) => 
    acc + (item.product.price_final ?? item.product.price) * item.quantity, 0
);
```

---

## 3. POURQUOI procéder ainsi ?

1. **Cohérence des données (Single Source of Truth) :** En typant correctement la réduction dès l'API (dans `Product`), vous êtes assuré que toutes les pages (Listes, Détails, Panier) afficheront la même information.
2. **Exactitude factuelle et comptable :** Si le panier additionnait les prix de base au lieu des prix réduits, le client paierait le montant fort, ce qui génère des erreurs de transaction (PrestaShop s'attendra à un montant moindre).
3. **Expérience utilisateur (UX) :** L'acheteur a besoin de voir clairement son avantage promotionnel (l'ancien prix barré et le badge) pour inciter à l'achat, et comprendre d'où vient le montant de sa commande finale.
