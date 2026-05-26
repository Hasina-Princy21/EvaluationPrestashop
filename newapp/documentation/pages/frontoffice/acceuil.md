# Accueil (Frontoffice)

## Logique Métier
La page d'accueil est la vitrine de la boutique. Elle présente le catalogue de produits (ou les nouveautés/catégories) aux clients. Son rôle est de faciliter la découverte des articles et d'inciter à l'achat via un accès rapide aux fiches produits.

## Interfaces & Types Communs
*   `Product`: Représente les informations du produit (id, nom, prix, image, stock, etc.).
*   `Category`: Informations des catégories si un filtre est présent.

## Fonctions Principales
*   **`fetchProducts()`** : Fonction asynchrone appelant `productService.ts` pour récupérer la liste des produits depuis l'API PrestaShop, souvent avec pagination ou limites.
*   **`handleActionAddCart()`** *(Optionnel)* : Permet l'ajout rapide au panier si la fonctionnalité est exposée directement sur l'accueil.
*   **Rendus interactifs** : Gestion des grilles de produits (composant `ProductCard.tsx`), des sliders ou du filtrage.
