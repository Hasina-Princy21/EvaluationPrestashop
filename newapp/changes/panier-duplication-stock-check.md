# Duplication des commandes (Historique)

## Contexte
La duplication ne se fait pas sur les produits individuels dans le panier, mais sur l'ensemble d'une commande. L'utilisateur peut y préciser le nombre de fois qu'il souhaite dupliquer la commande.

## Modifications realisees
- Nettoyage du panier: suppression des boutons et de la logique de duplication des produits unitaires.
- Ajout d'un bouton "Dupliquer la commande" et d'un champ "Fois" (valeur par défaut: 1) dans l'historique des commandes (`commandes.tsx`).
- Création d'une page "Fiche Commande" (`ficheCommande.tsx`) pour afficher les détails d'une commande, ses produits, et proposer le même formulaire de duplication.

## Comportement concret
- L'utilisateur saisit le nombre de duplications souhaitées (par défaut 1) et clique sur "Dupliquer la commande" (depuis la liste ou le détail).
- Les produits de l'ancienne commande sont multiples par le nombre saisi et ajoutés au panier.
- L'utilisateur est redirigé vers le panier.
