# Démarche : Changement de la logique de duplication (Panier vers Commandes)

Ce document retrace les étapes techniques réalisées pour implémenter la duplication d'une commande entière, en remplacement de la duplication produit par produit dans le panier.

## 1. Nettoyage du Panier (`src/frontoffice/pages/panier.tsx`)
- **Suppression des états liés à la duplication** : `duplicationCounts`, `duplicatedQuantities`, `duplicationCheck`, `showDuplicationCheck`.
- **Retrait des fonctions de duplication et de validation** : Suppression de `handleDuplicateProduct` et de `handlePreCheckout` (qui vérifiait le stock avant de valider la duplication).
- **Modification de l'interface utilisateur (JSX)** : Retrait du champ input pour le nombre de duplications individuelles, suppression du tableau modal/pop-up de validation de stock pour les duplications. Le panier est redevenu un simple afficheur de produits avec mise à jour des quantités classiques.

## 2. Ajout de la fonction de duplication dans l'historique (`src/frontoffice/pages/commandes.tsx`)
- **Gestion de l'état** : Ajout d'un état `duplicationCounts` pour gérer dynamiquement le multiplicateur (nombre de fois qu'on souhaite dupliquer la commande).
- **Logique d'ajout au panier (`handleDuplicateOrder`)** :
  - Extraction du panier existant depuis le `localStorage`.
  - Parcours des données `order.associations?.order_rows` retournées par l'API PrestaShop.
  - S'il y a déjà le même produit dans le panier, on incrémente sa quantité par `(quantité commandée * nombre_de_fois)`. Sinon, on l'ajoute comme nouvel article.
  - Sauvegarde du panier dans le `localStorage` et redirection vers `/front/panier`.
- **Mise à jour graphique** : Ajout des boutons "Voir les détails" et "Dupliquer la commande", ce dernier étant précédé d'un champ `<input type="number">` pour définir la valeur (par défaut 1).

**Code ajouté :**
```tsx
const [duplicationCounts, setDuplicationCounts] = useState<Record<number, number>>({});

const handleDuplicateOrder = (order: any) => {
    const count = duplicationCounts[order.id] ?? 1;
    if (count < 1) return;

    const cart = JSON.parse(localStorage.getItem('cart') || '[]');
    let rows = order.associations?.order_rows || [];
    if (!Array.isArray(rows)) {
        rows = [rows];
    }
    if (rows.length === 0) {
        alert("Aucun produit à dupliquer dans cette commande.");
        return;
    }
    
    let targetCart = [...cart];

    rows.forEach((row: any) => {
        const prodId = parseInt(row.product_id, 10);
        const qty = parseInt(row.product_quantity, 10) * count; // multiplication par le nombre demandé
        const price = parseFloat(row.unit_price_tax_incl);
        const name = row.product_name;

        const existingItem = targetCart.find((item: any) => item.id === prodId);
        if (existingItem) {
            existingItem.quantity += qty;
        } else {
            targetCart.push({ id: prodId, name: name, price: price, quantity: qty });
        }
    });

    localStorage.setItem('cart', JSON.stringify(targetCart));
    alert(`La commande a été dupliquée ${count} fois dans votre panier.`);
    navigate('/front/panier');
};

// Dans le JSX (rendu HTML)
<div className="duplicate-controls">
    <label htmlFor={`dup-${order.id}`}>Fois:</label>
    <input
        id={`dup-${order.id}`}
        type="number"
        min="1"
        value={duplicationCounts[order.id] ?? 1}
        onChange={(e) => handleDuplicateCountChange(order.id, parseInt(e.target.value) || 1)}
    />
    <button className="duplicate-order-btn" onClick={() => handleDuplicateOrder(order)}>
        Dupliquer la commande
    </button>
</div>
```

## 3. Nouvelle page : Fiche détaillée de Commande (`src/frontoffice/pages/ficheCommande.tsx`)
- **Création du composant et des styles (`ficheCommande.tsx`, `ficheCommande.css`)**.
- **Récupération des données** : Récupération du paramètre `id` dans l'URL avec React Router, puis appel API `OrderService.getById(id)`.
- **Affichage des détails** : Création d'un résumé de la commande et d'un tableau listant les produits inclus dans la commande.
- **Bouton de duplication** : Similaire à la page historique, mais centré sur la commande en cours de consultation, avec un état simple `duplicateCount`.

**Code ajouté :**
```tsx
const [duplicateCount, setDuplicateCount] = useState(1);

const handleDuplicateOrder = () => {
    if (!order) return;
    const count = duplicateCount > 0 ? duplicateCount : 1;
    
    const cart = JSON.parse(localStorage.getItem('cart') || '[]');
    let rows = order.associations?.order_rows || [];
    if (!Array.isArray(rows)) {
        rows = [rows];
    }
    if (rows.length === 0) {
        alert("Aucun produit à dupliquer.");
        return;
    }

    let targetCart = [...cart];

    rows.forEach((row: any) => {
        const prodId = parseInt(row.product_id, 10);
        const qty = parseInt(row.product_quantity, 10) * count;
        const price = parseFloat(row.unit_price_tax_incl);
        const name = row.product_name;

        const existingItem = targetCart.find((item: any) => item.id === prodId);
        if (existingItem) {
            existingItem.quantity += qty;
        } else {
            targetCart.push({ id: prodId, name: name, price: price, quantity: qty });
        }
    });

    localStorage.setItem('cart', JSON.stringify(targetCart));
    alert(`La commande a été dupliquée ${count} fois.`);
    navigate('/front/panier');
};

// Dans le JSX...
<div className="fiche-actions">
    <label>Fois:</label>
    <input
        type="number"
        min="1"
        value={duplicateCount}
        onChange={(e) => setDuplicateCount(parseInt(e.target.value) || 1)}
    />
    <button className="duplicate-btn" onClick={handleDuplicateOrder}>Dupliquer la commande</button>
</div>
```

## 4. Configuration du Routage (`src/App.tsx`)
- Import du composant `FicheCommande`.
- Intercalation du chemin `<Route path="commandes/:id" element={<FicheCommande />} />` à l'intérieur du bloc des routes.

**Code ajouté :**
```tsx
import FicheCommande from './frontoffice/pages/ficheCommande'

// ... dans la fonction App(), au sein des <Routes> du bloc <Route path="/front" element={<FrontOffice />}>
<Route path="commandes/:id" element={<FicheCommande />} />
```

## 5. Documentation
- Mise à jour du fichier de suivi des changements métier (`changes/panier-duplication-stock-check.md`) pour acter le nouveau comportement.

## 6. Affichage du Stock dans le Panier (`src/frontoffice/pages/panier.tsx`)
- **Appel API** : Rétablissement de l'appel à `StockAvailableService` au sein d'un point d'effet (`useEffect`) pour récupérer les quantités en stock de chaque produit présent dans le panier de l'utilisateur.
- **Ajout visuel (JSX)** : Affiche "Stock disponible : X" sous chaque produit. Le texte passe en rouge si l'utilisateur ajoute plus de produits que le stock réel ("Quantité demandée indisponible").
- **Blocage de commande** : Ajout d'une limite (`hasInvalidStock`) qui désactive le bouton "Passer la commande" tant qu'une ligne du panier dépasse les stocks physiques. Un message d'avertissement rouge informe également du blocage et prévient l'utilisateur.
