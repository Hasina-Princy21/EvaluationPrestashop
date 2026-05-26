# Restruction de Changement de Statut des Commandes

Cette documentation décrit la récente modification effectuée dans l'interface d'administration pour la gestion des statuts de commande.

## Objectif

L'objectif de cette modification est de sécuriser le processus de traitement des commandes en empêchant toute modification ultérieure du statut d'une commande une fois qu'elle a été marquée comme **Livrée**. Seuls les statuts des commandes "Paiement accepté" et "Annulée" peuvent être modifiés.

## Fichier Modifié
`src/backoffice/pages/OrderManagement.tsx`

## Détail des Changements

La liste déroulante permettant de sélectionner le statut de la commande a été modifiée. Nous avons ajouté une condition à la propriété `disabled` du menu déroulant (le `select`) pour le verrouiller automatiquement si l'état actuel (`ord.current_state`) de la commande est égal à 5 (qui correspond au statut "Livré").

### Diff

```diff
- <select
-   value={ord.current_state}
-   disabled={actionLoading === ord.id}
-   onChange={(e) => handleStatusChange(ord.id, parseInt(e.target.value, 10))}
-   className={`status-dropdown dropdown-state-${ord.current_state}`}
- >
+ <select
+   value={ord.current_state}
+   disabled={actionLoading === ord.id || ord.current_state === 5}
+   onChange={(e) => handleStatusChange(ord.id, parseInt(e.target.value, 10))}
+   className={`status-dropdown dropdown-state-${ord.current_state}`}
+ >
```

> [!NOTE]
> Cette règle garantit l'intégrité des données de livraison car aucun retour en arrière accidentel du statut d'une commande finalisée n'est possible depuis cette interface.
