# Ajout du bouton "Payer" et condition de livraison

Conformément à la consigne demandant que « quand un statut est annulé il doit être payé pour être livré après », nous avons ajouté une nouvelle étape logique dans la gestion des statuts de commande.

## Fichiers modifiés
- `src/backoffice/pages/OrderManagement.tsx`
- `src/backoffice/pages/OrderManagement.css`

## Ce qui a été changé

### 1. Ajout du bouton "Payer"
Nous avons ajouté un nouveau bouton **Payer** à côté de "Livrer" et "Annuler". 
- Ce bouton permet de faire passer une commande au statut **Paiement accepté** (statut `2`).
- Il est activé pour les commandes annulées (statut `6`) ou en attente, et désactivé si la commande est déjà payée ou livrée.

### 2. Logique de livraison modifiée
Le bouton **Livrer** a été modifié pour respecter la règle :
```tsx
disabled={actionLoading === ord.id || ord.current_state === 5 || ord.current_state === 6}
```
- **Si une commande est "Annulée" (`6`)**, le bouton "Livrer" est désormais **grisé (désactivé)**. 
- Pour la livrer, l'administrateur doit d'abord cliquer sur **Payer**. Une fois la commande passée au statut "Paiement accepté" (`2`), le statut de la commande n'est plus "Annulé", et le bouton "Livrer" redevient cliquable. 

### 3. Design
Le bouton "Payer" a reçu la classe CSS `.btn-pay` avec une couleur bleue pour le distinguer des actions de livraison (vert) et d'annulation (rouge).
