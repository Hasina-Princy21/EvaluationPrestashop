# Modification de `src/frontoffice/pages/acceuil.tsx`

Ce fichier documente l'implémentation de la logique et de l'interface de recherche multicritère sur la page d'accueil.

## Critères implémentés
1. **Recherche par Nom** : Filtrage insensible à la casse de la chaîne saisie dans le nom du produit.
2. **Filtrage par Catégorie** : Sélection d'une catégorie dans un sélecteur hiérarchique.
3. **Intervalle de Prix** : Filtrage dynamique des produits avec des champs pour les prix minimum et maximum.

## Détails techniques
- **Chargement des catégories** : Appel à `CategoryService.getAll()` dans `useEffect` pour récupérer toutes les catégories actives.
- **Arbre Hiérarchique** : Implémentation d'une fonction récursive `buildCategoryTree` pour structurer et indenter les sous-catégories (ex: `— ` pour chaque niveau de profondeur) afin de faciliter la lecture dans le menu déroulant.
- **Filtrage en temps réel** : Utilisation d'un filtrage en mémoire (`products.filter(...)`) pour assurer une réactivité instantanée à chaque frappe ou sélection.
- **Bouton Réinitialiser** : Fonction `handleResetFilters` pour vider tous les critères d'un coup.
- **Gestion des cas vides** : Affichage d'un message convivial si aucun produit ne correspond aux critères.
