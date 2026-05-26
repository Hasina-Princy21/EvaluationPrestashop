import { useEffect, useState } from "react";
import CategoryService from "../../api/categoryService";
import ProductService, { type Product } from "../../api/productService";
import StockAvailableService from "../../api/stock_availableService";

const Remove_stock = () => {
    const [categories, setCategories] = useState<any[]>([]);
    const [quantity, setQuantity] = useState(0);
    const [selectedCategory, setSelectedCategory] = useState("");
    const [products, setProduct] = useState<Product[]>([]);
    
    const [isUpdating, setIsUpdating] = useState(false);
    const [result, setResult] = useState<{ total: number; realiser: number; nbrP: number; qty: number } | null>(null);

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        
        if (!selectedCategory || quantity <= 0) return;
        
        setIsUpdating(true);
        setResult(null);
        try {
            const categoryProducts = products.filter(
                (p) => String(p.id_category_default) === String(selectedCategory)
            );
            
            const nbrP = categoryProducts.length;
            const totalToReduce = nbrP * quantity;
            let actualReduced = 0;

            for (const product of categoryProducts) {
                const stock = await StockAvailableService.getByProductAndAttribute(product.id, 0);
                
                if (stock) {
                    const currentQuantity = Number(stock.quantity) || 0;
                    
                    if (currentQuantity > 0) {
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
                        
                        actualReduced += amountToRemove;
                    }
                }
            }
            
            setResult({ total: totalToReduce, realiser: actualReduced, nbrP, qty: quantity });

        } catch (error) {
            console.error("Failed to remove stock", error);
        } finally {
            setIsUpdating(false);
        }
    };

    useEffect(() => {
        const fetchCategories_P = async () => {
            try {
                const data = await CategoryService.getAll();
                const productsList = await ProductService.getAll();
                setProduct(productsList);
                setCategories(data || []);
                if (data && data.length > 0) {
                    setSelectedCategory(data[0].id.toString());
                }
            } catch (error) {
                console.error("Failed to fetch categories", error);
            }
        };

        fetchCategories_P();
    }, []);

    return (
        <div>
            <h1>Remove Stock</h1>
            <form onSubmit={handleSubmit}>
                <div>
                    <label>Nombre a diminuer:</label>
                    <input 
                    name="quantity"
                    min={1}
                    type="number"
                    value={quantity || ""}
                    onChange={(e) => setQuantity(parseInt(e.target.value) || 0)}
                    disabled={isUpdating}
                    />
                </div>
                <div>
                    <label>Categorie:</label>
                    <select name="category" value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)} disabled={isUpdating}>
                        {categories.map((category) => (
                            <option key={category.id} value={category.id}>
                                {category.name}
                            </option>
                        ))}
                    </select>
                </div>
                <button type="submit" disabled={isUpdating}>{isUpdating ? "En cours..." : "Valider"}</button>
            </form>
            
            {result && (
                <div style={{ marginTop: "20px", padding: "15px", border: "1px solid #ccc", borderRadius: "5px" }}>
                    <h3>Résultats :</h3>
                    <p><strong>Total prévu à diminuer :</strong> {result.total}</p>
                    <p><strong>Total réellement diminué :</strong> {result.realiser}</p>
                    <hr />
                    <p><small>{result.nbrP} produits concernés * {result.qty} (quantité cible) = {result.total} réductions théoriques. {result.realiser} réductions effectivement appliquées.</small></p>
                </div>
            )}
        </div>
    );
};

export default Remove_stock;
