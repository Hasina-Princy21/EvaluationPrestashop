# Modification de `src/api/productService.ts`

Ce fichier documente les modifications apportées aux types TypeScript de `productService.ts` pour supporter le filtrage multicritère.

## Description du changement
Le type TypeScript `Product` a été enrichi pour inclure les propriétés nécessaires à la filtration par catégorie par défaut et aux associations de catégories :

```typescript
export type Product = {
    id: number;
    name: string;
    description?: string;
    price: string; // Le prix est une chaîne dans la réponse de l'API
    quantity?: number;
    id_default_image?: string;
    id_tax_rules_group?: string;
    date_add?: string;
    id_category_default?: string | number; // ID de la catégorie par défaut
    associations?: {
        categories?: Array<{ id: string | number }>; // Catégories associées au produit
    };
}
```

## Rôle dans le projet
Ces champs permettent de filtrer les produits en vérifiant soit leur catégorie principale (`id_category_default`), soit l'ensemble des catégories auxquelles ils sont rattachés.
