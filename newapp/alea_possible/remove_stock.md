# Fonctionnalité "Alea" : Retrait de Stock en Masse par Catégorie

Ce document détaille comment implémenter la fonctionnalité demandée dans `front-alea.md` : une page permettant de diminuer le stock d'une quantité exacte pour tous les produits d'une catégorie donnée, avec un rapport d'exécution (total théorique vs total réellement diminué) et une vérification de mot de passe administrateur.

## 1. Logique Métier
Le cas d'usage consiste à retirer massivement du stock (ex : un lot défectueux, ou une expédition globale) pour une catégorie précise.
*   **Règle stricte** : Si le stock actuel du produit est inférieur à la quantité à retirer, le stock tombe à `0` (on ne peut pas avoir de stock négatif).
*   **Statistiques** : On doit calculer la différence entre l'objectif (ex: 7 unités retirées × 10 produits = 70 théoriques) et le vrai retrait (si 2 produits n'avaient que 3 en stock, le retrait réel ne sera que de 64).
*   **Sécurité** : La validation du formulaire exige la confirmation du mot de passe Admin.

---

## 2. Interfaces & Types

```typescript
// Payload pour l'envoi du formulaire
export interface RemoveStockPayload {
  categoryId: number;
  amountToRemove: number;
  adminPassword: string; // Utilisé pour valider l'action côté front/back
}

// Typage pour le compte-rendu d'exécution
export interface ReductionReport {
  totalExpected: number;    // nbrP * amountToRemove
  totalRealized: number;    // Combien ont vraiment été déduits
  productsImpacted: number; // Nombre de produits dans la catégorie
}
```

---

## 3. Fichiers à créer / modifier

*   **Fichier UI :** Créer `src/backoffice/pages/RemoveStockAlea.tsx` (ou dans le frontoffice selon l'accès souhaité, sachant qu'on demande un accès admin).
*   **Service :** Ajouter une méthode dans `src/api/stock_availableService.ts` et potentiellement `authStore.ts` pour vérifier le mot de passe "à la volée".

---

## 4. Fonctions Principales & Code

### A. Formatage et Soumission du Formulaire
Le composant React doit posséder des `states` pour les inputs, et déclencher la logique de calcul.

```tsx
const [categoryId, setCategoryId] = useState<number>(0);
const [amount, setAmount] = useState<number>(0);
const [password, setPassword] = useState<string>('');
const [report, setReport] = useState<ReductionReport | null>(null);

const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  
  // 1. Vérification du mot de passe Admin (Appel API ou store)
  const isAuthorized = await checkAdminPassword(password);
  if (!isAuthorized) {
    toast.error("Mot de passe administrateur invalide");
    return;
  }

  // 2. Lancement du processus
  await processMassReduction(categoryId, amount);
};
```

### B. Algorithme de Calcul et de Retrait (processMassReduction)
Cette fonction va charger les stocks de la catégorie, calculer ce qui doit être retiré, et envoyer les mises à jour à l'API.

```typescript
const processMassReduction = async (catId: number, amountToRemove: number) => {
  try {
    // 1. Récupérer tous les produits de cette catégorie
    const products = await productService.getProductsByCategory(catId);
    
    let expected = products.length * amountToRemove;
    let realized = 0;

    // 2. Boucler sur chaque produit pour ajuster le stock
    for (const prod of products) {
        // Ex: il faut récupérer son ID de stock via l'API appropriée
        const stockData = await stock_availableService.getStockByProduct(prod.id);
        const currentStock = stockData.quantity;
        
        // Logique de retrait mathématique
        let amountToDeduct = amountToRemove;
        let newStock = currentStock - amountToRemove;

        if (newStock < 0) {
            newStock = 0; // On ne tombe jamais en dessous de zéro
            amountToDeduct = currentStock; // On ne retire que ce qui était là
        }

        // Additionner au compteur global
        realized += amountToDeduct;

        // 3. Appel API effectif pour ce produit
        await stock_availableService.updateQuantity(stockData.id_stock_available, newStock);
    }

    // 4. Génération du rapport d'exécution final
    setReport({
        totalExpected: expected,
        totalRealized: realized,
        productsImpacted: products.length
    });
    
    toast.success("Retrait effectué avec succès");

  } catch (error) {
    console.error("Erreur durant le traitement massif :", error);
    toast.error("Une erreur s'est produite lors du retrait");
  }
};
```

### C. Rendu UI du Rapport (Le résultat de la tâche)
Une fois l'opération terminée, afficher les données calculées à l'utilisateur :

```tsx
{report && (
  <div className="report-container">
    <h3>Rapport de l'opération</h3>
    <ul>
        <li>Produits ciblés : {report.productsImpacted}</li>
        <li>
            Retrait théorique total : {report.totalExpected} unités 
            <small>(soit {report.productsImpacted} x {amount})</small>
        </li>
        <li>
            <strong>Retrait réel effectué : {report.totalRealized} unités</strong>
        </li>
    </ul>
    {report.totalExpected !== report.totalRealized && (
        <p className="warning">
            Note: La valeur réelle est inférieure car certains produits avaient 
            un stock initial plus bas que la quantité demandée.
        </p>
    )}
  </div>
)}
```

## 5. Pourquoi procéder ainsi ?

1.  **Fiabilité métier (`newStock < 0`) :** C'est le cœur de l'exercice. Éviter d'avoir un inventaire négatif en PrestaShop causera des erreurs sur le tunnel de commande (ou du sur-booking de commande). 
2.  **Transparence logistique :** L'administrateur lance une opération "aveugle" de masse, le `Report` le rassure en montrant la différence entre la théorie et la pratique.
3.  **Sécurité :** Le fait de re-demander le mot de passe (`mdp admin`) pour ce formulaire précis, même si la vue est protégée, sert à confirmer une action destructive massive (Double Opt-In).
