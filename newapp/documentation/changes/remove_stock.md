```typescript
import { useEffect, useState } from "react";
import CategoryService from "../../api/categoryService";
import ProductService, { type Product } from "../../api/productService";
import StockAvailableService from "../../api/stock_availableService";

const Remove_stock = () => {
    const [categories, setCategories] = useState<any[]>([]);
    const [quantity, setQuantity] = useState<number>(0);
    const [selectedCategory, setSelectedCategory] = useState("");
    const [products, setProducts] = useState<Product[]>([]);
    
    const [isUpdating, setIsUpdating] = useState(false);
    const [result, setResult] = useState<{ total: number; realiser: number; nbrP: number; qty: number } | null>(null);

    // Fonction isolée pour charger les produits et catégories
    const loadData = async () => {
        try {
            const data = await CategoryService.getAll();
            const productsList = await ProductService.getAll();
            setProducts(productsList);
            setCategories(data || []);
            
            // On ne change la sélection par défaut que si elle n'est pas encore définie
            if (data && data.length > 0 && !selectedCategory) {
                setSelectedCategory(data[0].id.toString());
            }
        } catch (error) {
            console.error("Erreur de chargement des données", error);
        }
    };

    // Chargement initial au montage du composant
    useEffect(() => {
        loadData();
    }, []);

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        
        if (!selectedCategory || quantity <= 0) return;
        
        setIsUpdating(true);
        setResult(null);

        try {
            // 1. Filtrer les produits de la catégorie sélectionnée
            const categoryProducts = products.filter(
                (p) => String(p.id_category_default) === String(selectedCategory)
            );
            
            const nbrP = categoryProducts.length;
            const totalToReduce = nbrP * quantity; // Exemple : 7 produits * 5 quantité = 35 théoriques
            let actualReduced = 0;

            // 2. Traitement en parallèle (Promesses) pour aller beaucoup plus vite
            const updatePromises = categoryProducts.map(async (product) => {
                const stock = await StockAvailableService.getByProductAndAttribute(product.id, 0);
                
                if (stock) {
                    const currentQuantity = Number(stock.quantity) || 0;
                    
                    if (currentQuantity > 0) {
                        // Si stock actuel = 3 et quantité demandée = 7 -> on retire 3 (Met à zéro)
                        const amountToRemove = Math.min(currentQuantity, quantity);
                        const newQuantity = currentQuantity - amountToRemove;
                        
                        await StockAvailableService.upsert({
                            id: stock.id,
                            id_product: product.id,
                            id_product_attribute: 0,
                            quantity: newQuantity,
                            out_of_stock: 2,
                            depends_on_stock: 0
                        });
                        
                        return amountToRemove; // On retourne ce qui a été réellement retiré
                    }
                }
                return 0; // Rien retiré si stock déjà à 0 ou introuvable
            });

            // Attendre que toutes les requêtes de diminution soient terminées
            const results = await Promise.all(updatePromises);
            
            // Somme de toutes les diminutions réelles
            actualReduced = results.reduce((sum, value) => sum + value, 0);
            
            // 3. Afficher le résultat final
            setResult({ total: totalToReduce, realiser: actualReduced, nbrP, qty: quantity });

            // 4. IMPORTANT : Recharger les produits pour avoir les nouveaux stocks à jour
            await loadData();

        } catch (error) {
            console.error("Échec de la diminution des stocks", error);
        } finally {
            setIsUpdating(false);
        }
    };

    return (
        <div style={{ maxWidth: "500px", margin: "0 auto", padding: "20px" }}>
            <h1>Diminuer le Stock par Catégorie</h1>
            
            <form onSubmit={handleSubmit}>
                <div style={{ marginBottom: "15px" }}>
                    <label style={{ display: "block", marginBottom: "5px" }}>Nombre à diminuer :</label>
                    <input 
                        name="quantity"
                        min={1}
                        type="number"
                        value={quantity || ""}
                        onChange={(e) => setQuantity(parseInt(e.target.value) || 0)}
                        disabled={isUpdating}
                        style={{ width: "100%", padding: "8px" }}
                    />
                </div>

                <div style={{ marginBottom: "15px" }}>
                    <label style={{ display: "block", marginBottom: "5px" }}>Catégorie :</label>
                    <select 
                        name="category" 
                        value={selectedCategory} 
                        onChange={(e) => setSelectedCategory(e.target.value)} 
                        disabled={isUpdating}
                        style={{ width: "100%", padding: "8px" }}
                    >
                        <option value="">-- Choisir une catégorie --</option>
                        {categories.map((category) => (
                            <option key={category.id} value={category.id}>
                                {category.name}
                            </option>
                        ))}
                    </select>
                </div>

                <button 
                    type="submit" 
                    disabled={isUpdating || quantity <= 0 || !selectedCategory}
                    style={{ padding: "10px 20px", cursor: "pointer" }}
                >
                    {isUpdating ? "Mise à jour en cours..." : "Valider"}
                </button>
            </form>
            
            {result && (
                <div style={{ marginTop: "20px", padding: "15px", border: "1px solid #ccc", borderRadius: "5px", backgroundColor: "#f9f9f9" }}>
                    <h3>Résultats de l'opération :</h3>
                    <p><strong>Total prévu (théorique) :</strong> {result.total}</p>
                    <p><strong>Total réellement diminué :</strong> {result.realiser}</p>
                    <hr />
                    <p style={{ margin: 0 }}>
                        <small>
                            {result.nbrP} produits concernés × {result.qty} unités demandées = {result.total} réductions max. 
                            <br />
                            Déductions appliquées en stock : <strong>{result.realiser}</strong>.
                        </small>
                    </p>
                </div>
            )}
        </div>
    );
};




export default Remove_stock;

import { useEffect, useState } from "react";
import CategoryService from "../../api/categoryService";
import StockAvailableService from "../../api/stock_availableService";
import ProductService from "../../api/productService";

const RemoveStockSimple = () => {
    // États pour le formulaire
    const [categories, setCategories] = useState<any[]>([]);
    const [selectedCategory, setSelectedCategory] = useState("");
    const [quantityToRemove, setQuantityToRemove] = useState(0);
    
    // États pour l'interface
    const [loading, setLoading] = useState(false);
    const [stats, setStats] = useState<{ totalTheorique: number; totalReel: number } | null>(null);

    // 1. Charger les catégories au démarrage
    useEffect(() => {
        CategoryService.getAll().then((data) => {
            setCategories(data || []);
            if (data && data.length > 0) setSelectedCategory(data[0].id.toString());
        });
    }, []);

    // 2. Action au clic sur Valider
    const handleValidation = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedCategory || quantityToRemove <= 0) return;

        setLoading(true);
        setStats(null);

        try {
            // Récupérer TOUS les produits pour filtrer ceux de la catégorie
            const allProducts = await ProductService.getAll();
            const targetProducts = allProducts.filter(p => String(p.id_category_default) === selectedCategory);
            
            let cumulDiminutionReelle = 0;

            // Boucle simple sur chaque produit concerné
            for (const product of targetProducts) {
                const stock = await StockAvailableService.getByProductAndAttribute(product.id, 0);
                
                if (stock && stock.quantity > 0) {
                    // Si on demande de retirer 7 mais qu'il reste 3, on ne retire que 3 (le stock tombe à 0)
                    const aRetirer = Math.min(stock.quantity, quantityToRemove);
                    const nouveauStock = stock.quantity - aRetirer;

                    // Mise à jour de la base de données
                    await StockAvailableService.upsert({
                        ...stock,
                        quantity: nouveauStock
                    });

                    // On retient ce qui a vraiment été retiré
                    cumulDiminutionReelle += aRetirer;
                }
            }

            // Calcul du bilan final
            setStats({
                totalTheorique: targetProducts.length * quantityToRemove,
                totalReel: cumulDiminutionReelle
            });

        } catch (error) {
            console.error("Erreur lors de la mise à jour des stocks", error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ padding: "20px", maxWidth: "400px" }}>
            <h2>Diminuer les stocks</h2>

            <form onSubmit={handleValidation}>
                {/* Champ Quantité */}
                <div style={{ marginBottom: "12px" }}>
                    <label>Nombre à diminuer : </label>
                    <input 
                        type="number" 
                        min="1" 
                        value={quantityToRemove || ""} 
                        onChange={e => setQuantityToRemove(parseInt(e.target.value) || 0)}
                        disabled={loading}
                    />
                </div>

                {/* Liste Déroulante Catégories */}
                <div style={{ marginBottom: "12px" }}>
                    <label>Catégorie : </label>
                    <select 
                        value={selectedCategory} 
                        onChange={e => setSelectedCategory(e.target.value)}
                        disabled={loading}
                    >
                        {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                </div>

                {/* Bouton de validation */}
                <button type="submit" disabled={loading || quantityToRemove <= 0}>
                    {loading ? "Calcul en cours..." : "Valider"}
                </button>
            </form>

            {/* Zone de Résultat claire */}
            {stats && (
                <div style={{ marginTop: "20px", padding: "10px", background: "#f0f0f0", borderRadius: "4px" }}>
                    <h4>Résultat :</h4>
                    <p>Diminution théorique demandée : <strong>{stats.totalTheorique}</strong></p>
                    <p>Diminution réelle (appliquée) : <strong style={{ color: "green" }}>{stats.totalReel}</strong></p>
                    {stats.totalReel < stats.totalTheorique && (
                        <p style={{ color: "orange", fontSize: "12px" }}>
                            * Certains produits avaient un stock plus faible que la quantité demandée et ont été mis à 0.
                        </p>
                    )}
                </div>
            )}
        </div>
    );
};

export default RemoveStockSimple;