# Authentification Client (Frontoffice)

## Logique Métier
Gérer l'accès aux zones sécurisées (historique de commandes, compte) et attribuer le futur panier à un compte client. Le processus s'assure que les identifiants correspondent aux clients enregistrés dans PrestaShop.

## Interfaces & Types Communs
*   `LoginCredentials` : Interface pour le payload (email, mot de passe).
*   `Customer` : Données de session retournées après validation.

## Fonctions Principales
*   **`handleLogin(event)`** : Stoppe la soumission par défaut du formulaire (onSubmit), construit l'objet de données, et l'envoie à l'API via `customerService.ts` ou `frontLogin.ts`.
*   **`setAuth()`** : Dans le store (`frontLogin.ts`), enregistre le token de session ou les infos `Customer` dans le `localStorage` ou l'état global.
*   **`handleError(message)`** : Affiche les retours API à l'utilisateur (mot de passe invalide, compte inexistant).
