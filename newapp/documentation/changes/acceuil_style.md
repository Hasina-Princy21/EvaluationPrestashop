# Modification de `src/frontoffice/pages/acceuil.css`

Ce fichier documente l'implémentation de la charte graphique et de la réactivité du composant de recherche et de filtres.

## Styles ajoutés
1. **Mise en page des Filtres** (`.search-filter-container`, `.search-filter-row`) :
   - Fond blanc avec des ombres légères et des bordures douces.
   - Utilisation de CSS Grid pour aligner de façon adaptative les champs sur une ligne sur les grands écrans, et empilés sur les écrans mobiles.
2. **Contrôles de Saisie** (`.filter-input`, `.filter-select`) :
   - Coins arrondis (`border-radius: 8px`).
   - Transitions fluides sur les propriétés `border-color`, `box-shadow` et `background-color` lors du survol (`hover`) ou de la mise au point (`focus`).
3. **Bouton de Réinitialisation** (`.btn-reset-filters`) :
   - Style neutre élégant, avec retour haptique visuel (`transform: translateY(1px)` au clic).
4. **Message d'Erreur** (`.no-products-message`) :
   - Bordure en pointillés, texte centré et marges généreuses pour signaler joliment l'absence de résultats.
5. **Grille de Produits** (`.product-list`) :
   - Adaptation du nombre de colonnes de la grille de produits (4 colonnes sur grand écran, 3 colonnes sur tablette, et responsive fluide sur mobile).
