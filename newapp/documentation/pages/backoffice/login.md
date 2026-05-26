# Authenfication Admin (Backoffice)

## Logique Métier
Validation stricte des droits d'accès à la zone d'administration. Restreint le contrôle de la boutique, le chiffre d'affaires et la modification de données aux utilisateurs possédant des droits configurés (Admins purs).

## Interfaces & Types Communs
*   `AdminCredentials` : Payload spécifique, souvent lié à une clé API tierce ou un token JWT de management, différent de celui du frontoffice.

## Fonctions Principales
*   **`handleAdminLogin(credentials)`** : Envoie les données au service d'authentification (`authStore.ts`).
*   **`generateToken()` / `setSession()`** : Consigne le token sécurisé et redirige vers le composant parent protégé `ProtectedRoute.tsx` qui laissera transparaître le layout du Backoffice.
*   **`checkPermissions()`** : Vérification asynchrone des droits sur certaines tables sensibles de l'API.
