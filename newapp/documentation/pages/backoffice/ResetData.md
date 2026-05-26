# Remise à Zéro des Données (Backoffice)

## Logique Métier
Action administrative critique permettant de purger les tables lors du passage d'un environnement de test à la production, ou pour nettoyer une base de test. Supprime commandes, clients, ou catalogue de produits (souvent via un script spécifique côté serveur ou des webservices).

## Interfaces & Types Communs
*   Aucune interface entité spécifique, mais dépend de signaux booléens (`isTruncating`, `success`).

## Fonctions Principales
*   **`showConfirmModal()`** : Impératif pour une action destructrice. Oblige l'admin à confirmer (souvent en tapant un mot clé).
*   **`executeFactoryReset()`** : Série ordonnée d'appels API (ex: DELETE `/api/orders`, puis `/api/customers`, etc.) car il existe des contraintes de clés étrangères.
*   **Gestion de l'État** : Feedback clair (Success/Error blocks) pour informer de la libération de la base.
