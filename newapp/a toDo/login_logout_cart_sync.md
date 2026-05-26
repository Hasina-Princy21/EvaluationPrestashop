# Démarche de Changement : Menu Dynamique (Login/Déconnexion) et Fusion de Panier à la Connexion

Ce document détaille les modifications apportées au code pour répondre aux deux besoins fonctionnels suivants :
1. Remplacer dynamiquement l'option de menu **"Login"** par **"Déconnexion"** lorsqu'un utilisateur est authentifié.
2. Assurer que tout panier constitué de manière anonyme (non-connecté) soit correctement attribué et fusionné avec le panier de l'utilisateur dès qu'il se connecte.

---

## 1. Menu Dynamique (Login / Déconnexion)

### Fichier modifié : `src/frontoffice/components/Menu.tsx`
**Objectif** : Rendre le menu réactif à l'état de connexion de l'utilisateur, et lui permettre de se déconnecter en nettoyant ses données locales.

#### Code d'origine :
```typescript
import { Link } from 'react-router-dom';
import './Menu.css';

const Menu: React.FC = () => {
    return (
        <nav className="front-menu">
            <Link to="/front" className="menu-logo">PrestaShop</Link>
            <div className="menu-links">
                <Link to="/front" className="menu-link">Accueil</Link>
                <Link to="/front/cart" className="menu-link">Panier</Link>
                <Link to="/front/commandes" className="menu-link">Commandes</Link>
                <Link to="/front/login" className="menu-link">Login</Link>
            </div>
        </nav>
    );
};
```

#### Code mis à jour :
```typescript
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import './Menu.css';

const Menu: React.FC = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const [isLoggedIn, setIsLoggedIn] = useState(false);

    // Détermine l'état de connexion à chaque changement d'URL
    useEffect(() => {
        const customerId = localStorage.getItem("customerId");
        setIsLoggedIn(!!customerId && customerId !== "0");
    }, [location]);

    const handleLogout = () => {
        // Nettoyage de la session et du panier local
        localStorage.removeItem("customerId");
        localStorage.removeItem("cartId");
        localStorage.removeItem("cart");
        setIsLoggedIn(false);
        alert("Vous avez été déconnecté.");
        navigate("/front");
    };

    return (
        <nav className="front-menu">
            <Link to="/front" className="menu-logo">PrestaShop</Link>
            <div className="menu-links">
                <Link to="/front" className="menu-link">Accueil</Link>
                <Link to="/front/cart" className="menu-link">Panier</Link>
                <Link to="/front/commandes" className="menu-link">Commandes</Link>
                {isLoggedIn ? (
                    <button onClick={handleLogout} className="menu-link logout-btn">
                        Déconnexion
                    </button>
                ) : (
                    <Link to="/front/login" className="menu-link">Login</Link>
                )}
            </div>
        </nav>
    );
};
```

### Fichier modifié : `src/frontoffice/components/Menu.css`
**Objectif** : Adapter le bouton `<button>` pour qu'il ait le même aspect visuel qu'un lien `<a>` classique du menu.

#### Ajout CSS :
```css
button.menu-link {
    background: none;
    border: none;
    cursor: pointer;
    font-family: inherit;
    font-size: 1rem;
    color: white;
    padding: 0;
    padding-bottom: 5px;
    border-bottom: 2px solid transparent;
    transition: border-color 0.3s ease;
}
```

---

## 2. Fusion et Attribution du Panier lors de la Connexion

### Fichier modifié : `src/frontoffice/pages/login.tsx`
**Objectif** : Lors d'une connexion réussie, récupérer le panier anonyme existant dans le `localStorage` et le synchroniser avec les paniers enregistrés dans la base de données PrestaShop.

#### Logique de fusion implémentée :
1. **Cas A : L'utilisateur a déjà un panier actif en base de données**
   - On récupère les articles de ce panier de base de données.
   - On récupère les articles du panier anonyme local (`localStorage.getItem("cart")`).
   - On fusionne les quantités des produits identiques.
   - On met à jour le panier de l'utilisateur en base de données (`CardService.update`).
   - On supprime l'ancien panier anonyme de la base de données (`CardService.delete`) pour ne pas surcharger PrestaShop.
   - On met à jour les données complètes (nom, prix, quantité) dans le `localStorage` de l'utilisateur.

2. **Cas B : L'utilisateur n'a pas de panier actif en base de données**
   - Si un panier anonyme en base de données existe déjà (créé pendant que l'utilisateur n'était pas connecté), on lui attribue simplement ce panier en mettant à jour le champ `id_customer` avec l'ID du client (`customer.id`).
   - Sinon, s'il a uniquement des articles dans son panier local, on crée un tout nouveau panier en base de données pour ce client avec ces produits.

#### Différence majeure de code dans `login.tsx` :

##### Avant (Écrasait simplement le panier local avec celui de la base de données, perdant les articles anonymes) :
```typescript
            if (activeCart) {
                localStorage.setItem("cartId", activeCart.id.toString());
                const cartRows = activeCart.associations?.cart_rows || [];
                const rowsArray = Array.isArray(cartRows) ? cartRows : [cartRows];
                
                const localCartItems = await Promise.all(rowsArray.map(async (row: any) => { ... }));
                localStorage.setItem("cart", JSON.stringify(resolvedItems));
            } else {
                const localCart = JSON.parse(localStorage.getItem("cart") || "[]");
                if (localCart.length > 0) { ... create cart ... }
            }
```

##### Après (Fusionne intelligemment et met à jour la base de données) :
```typescript
            // Sync and Merge Cart
            const localCart = JSON.parse(localStorage.getItem("cart") || "[]");
            const anonymousCartIdStr = localStorage.getItem("cartId");
            const anonymousCartId = anonymousCartIdStr ? parseInt(anonymousCartIdStr, 10) : null;

            const carts = await CardService.getByCustomer(customer.id);
            let activeCart = null;
            // ... récupération du panier actif de l'utilisateur ...
            
            if (activeCart) {
                const dbCartRows = activeCart.associations?.cart_rows || [];
                const dbRowsArray = Array.isArray(dbCartRows) ? dbCartRows : [dbCartRows];
                const mergedCartRowsMap = new Map<number, number>();
                
                // 1. Ajouter les produits du panier DB
                for (const row of dbRowsArray) {
                    if (row && row.id_product) {
                        const prodId = parseInt(row.id_product, 10);
                        const qty = parseInt(row.quantity, 10) || 0;
                        mergedCartRowsMap.set(prodId, (mergedCartRowsMap.get(prodId) || 0) + qty);
                    }
                }
                
                // 2. Ajouter les produits du panier anonyme local
                for (const item of localCart) {
                    if (item && item.id) {
                        const prodId = parseInt(item.id, 10);
                        const qty = parseInt(item.quantity, 10) || 0;
                        mergedCartRowsMap.set(prodId, (mergedCartRowsMap.get(prodId) || 0) + qty);
                    }
                }
                
                const updatedCartRows = Array.from(mergedCartRowsMap.entries()).map(([id_product, quantity]) => ({
                    id_product,
                    id_product_attribute: 0,
                    quantity
                }));
                
                // Envoi des modifications en DB
                await CardService.update(activeCart.id, {
                    id_customer: customer.id,
                    id_currency: 1,
                    id_lang: 1,
                    associations: { cart_rows: updatedCartRows }
                });
                
                // Suppression du panier anonyme doublon en DB
                if (anonymousCartId && anonymousCartId !== activeCart.id) {
                    try { await CardService.delete(anonymousCartId); } catch (e) { ... }
                }
                
                // Mise à jour de localStorage avec les détails complets résolus
                // ... (recherche dans localCart ou fetch par getProductById en cas d'élément manquant)
                localStorage.setItem("cart", JSON.stringify(finalItems));
                localStorage.setItem("cartId", activeCart.id.toString());
            } else {
                if (anonymousCartId && localCart.length > 0) {
                    // Attribution directe du panier anonyme existant
                    const cartRows = localCart.map((item: any) => ({ ... }));
                    await CardService.update(anonymousCartId, { id_customer: customer.id, ... });
                    localStorage.setItem("cartId", anonymousCartId.toString());
                } else if (localCart.length > 0) {
                    // Création classique d'un nouveau panier
                    // ...
                }
            }
```
