# Remplacement de la liste déroulante par des boutons d'action (OrderManagement)

Conformément à la consigne demandant d'« Ajouter un bouton 'annuler' et 'livrer' dans la liste des commandes », nous avons remplacé l'ancien menu déroulant (`<select>`) par de véritables boutons cliquables.

## Fichiers modifiés
- `src/backoffice/pages/OrderManagement.tsx`
- `src/backoffice/pages/OrderManagement.css`

## Ce qui a été changé

### 1. Structure (React/TSX)
Nous avons supprimé l'élément `<select>` qui listait les statuts. À la place, nous avons ajouté deux boutons explicites :
- Un bouton **Livrer** (qui envoie le statut `5`).
- Un bouton **Annuler** (qui envoie le statut `6`).

La logique de désactivation (`disabled`) a été conservée et adaptée :
- Si la commande est déjà "Livrée" (statut `5`), **les deux boutons sont désactivés**, car un produit livré ne peut plus changer d'état.
- Si la commande est "Annulée" (statut `6`), le bouton "Annuler" est désactivé mais "Livrer" reste actif au cas où l'on voudrait annuler l'annulation et livrer la commande.

### 2. Design (CSS)
Le style des anciens éléments liés au `<select>` (comme `.dropdown-state-X`) a été remplacé par des classes de boutons :
- `.btn-action` : base de style (padding, bordures arrondies, effet de survol).
- `.btn-deliver` : couleurs vertes pour la livraison.
- `.btn-cancel` : couleurs rouges pour l'annulation.

> [!TIP]
> Cette approche améliore l'ergonomie (un clic de moins) et répond strictement à l'intitulé de l'évaluation demandant l'intégration de "boutons".
