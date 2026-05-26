# Import de Données (Backoffice)

## Logique Métier
Permettre à l'administrateur de peupler la boutique rapidement sans passer par des créations manuelles unité par unité. Cette page parse des fichiers CSV volumineux (produits, stock, catégories) pour automatiser la génération d'entités PrestaShop.

## Interfaces & Types Communs
```typescript
// Modelisation de ce qui est extrait du fichier CSV
export interface CSVRow {
  Reference: string;
  Name: string;
  Price: string; // Souvent reçu en texte à parser
  Quantity: string;
}

// Modèle pour l'API
export interface ProductPayload {
  reference: string;
  name: string;
  price: number;
  active: boolean;
}
```

## Fonctions Principales
*   **`parseCSV()`** : Transformation CSV -> JS.
```typescript
const parseCSV = (file: File) => {
  Papa.parse(file, {
    header: true,
    complete: (results) => {
      // results.data contient le tableau d'objets CSVRow
      setCsvData(results.data as CSVRow[]);
    }
  });
};
```
*   **`processImport()`** : Envoi asynchrone progressif.
```typescript
const processImport = async () => {
  let successCount = 0;
  for (const row of csvData) {
    try {
      // Transformation des données
      const payload: ProductPayload = {
        name: row.Name,
        price: parseFloat(row.Price),
        reference: row.Reference,
        active: true
      };
      await productService.createProduct(payload);
      successCount++;
      setProgress((successCount / csvData.length) * 100);
    } catch (e) {
      // Gérer l'erreur (handleErrors)
    }
  }
};
```
