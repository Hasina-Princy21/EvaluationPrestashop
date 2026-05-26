## Correction : mise à jour des totaux de commande (updateTotals)

**Date:** 24/05/2026

**Résumé:**
- Problème observé : la validation de commande depuis le panier créait des commandes avec des totaux à 0.00 (ex. commandes #560/#561). Les requêtes PUT destinées à forcer les totaux retournaient des erreurs 400.

**Cause racine:**
- PrestaShop refusait la mise à jour car certaines valeurs requises étaient absentes ou mal formées dans le XML envoyé (ex. `id_address_delivery` manquant, puis `module` manquant). De plus, la forme JSON renvoyée par PrestaShop peut envelopper les valeurs (CDATA/objets), rendant l'extraction d'IDs fragile.

**Changments appliqués:**
- Rendre `OrderService.updateTotals` plus robuste :
  - Extraction résiliente des IDs (gère chaînes, objets, CDATA, champs imbriqués).
  - Accepte maintenant un paramètre `context` optionnel fourni par l'appelant (permet de passer `id_address_delivery`, `id_cart`, `id_customer`, etc.).
  - Construit un XML complet pour le PUT incluant `module`, `payment`, `current_state`, `id_shop_group`, `id_shop`, `secure_key`, `round_mode`, `round_type`, etc.
  - Ajout d'un `console.debug('OrderService.updateTotals XML:', xmlPayload)` avant l'appel PUT pour faciliter le debug.
- Appelant (panier) : `src/frontoffice/pages/panier.tsx` — après création de la commande, passe maintenant les IDs connus (adresse, cart, customer, carrier) à `updateTotals`.

**Fichiers modifiés:**
- [src/api/orderService.ts](src/api/orderService.ts)
- [src/frontoffice/pages/panier.tsx](src/frontoffice/pages/panier.tsx)

**Test effectué:**
- Build production OK (`npm run build` a terminé sans erreurs).
- Requête PUT manuelle testée pour la commande #564 : réponse 200 OK et `total_paid` mis à jour (ex. `256.154483`).

**Comment tester localement:**
1. Lancer le dev server : `npm run dev` (app disponible, ex. http://localhost:5174/).
2. Dans l'app : ajouter un produit → Panier → Passer la commande.
3. Ouvrir DevTools → Console/Network et vérifier : POST `/api/orders` puis PUT `/api/orders/{id}` (200) et `total_paid` non nul.

**Remarque:**
- Si vous avez des cas spécifiques (import massif, commandes existantes #560/#561), je peux appliquer un script pour réparer les totaux sur plusieurs commandes en utilisant `OrderService.updateTotals` avec les IDs corrects.
