# Gestion des Commandes (Backoffice)

## Logique Métier
Tableau de bord logistique. Permet aux administrateurs de voir toutes les transactions des clients, de changer le statut logistique des commandes (Expédiée, Livrée, Annulée) et de gérer le suivi.

## Interfaces & Types Communs
```typescript
export interface Order {
  id: number;
  id_customer: number;
  total_paid: number;
  current_state: number; // ID du statut
  date_add: string;
}

// Etats types (ex: 2 = Paiement accepté, 3 = En cours de préparation)
export interface OrderState {
  id: number;
  name: string;
  color: string;
}
```

## Fonctions Principales
*   **`updateOrderStatus(orderId, newState)`** : Met à jour le flux via PATCH
```typescript
const updateOrderStatus = async (orderId: number, newStateId: number) => {
  setIsUpdating(true);
  try {
    // API Call pour changer le statut via orderService.ts
    await orderService.updateState(orderId, newStateId);
    
    // Mise à jour de l'UI en local, évite de recharger toutes les commandes
    setOrders(orders.map(o => 
      o.id === orderId ? { ...o, current_state: newStateId } : o
    ));
  } catch (err) {
    console.error("Échec de la mise à jour", err);
  } finally {
    setIsUpdating(false);
  }
};
```
