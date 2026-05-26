# Historique des Commandes (Frontoffice)

## Logique Métier
Permettre au client connecté de consulter l'historique de ses achats. Cette page doit rassurer le client sur l'état d'avancement de ses commandes (en préparation, expédié, livré) et centraliser ses factures.

## Interfaces & Types Communs
*   `Order` : Contient l'identifiant de la commande, la date, le statut actuel, et le montant total.
*   `Customer` : L'utilisateur actuellement connecté dont on tire l'ID pour le filtrage.

## Fonctions Principales
*   **`fetchCustomerOrders(customerId)`** : Interroge `orderService.ts` pour ramener toutes les commandes appartenant spécifiquement au client connecté.
*   **`formatDate()` / `formatPrice()`** : Fonctions utilitaires de formatage pour l'affichage propre des dates de création et des devises.
*   **Navigation** : Fonctions de redirection (ex: `goToOrder(orderId)`) vers la `ficheCommande` détaillée pour voir les articles de la commande sélectionnée.
