import { useEffect, useState } from 'react';
import { getProducts } from '../../api/productService';
import type { Product } from '../../api/productService';
import CategoryService from '../../api/categoryService';
import CardService from '../../api/cardService';
import './acceuil.css';
import ProductCard from '../components/ProductCard';
import '../components/ProductCard.css';

const buildCategoryTree = (list: any[], parentId: number = 2, depth: number = 0): any[] => {
    const result: any[] = [];
    const children = list.filter(c => parseInt(c.id_parent) === parentId && (c.active === "1" || c.active === 1 || c.active === true));
    
    children.sort((a, b) => parseInt(a.position || '0') - parseInt(b.position || '0'));

    for (const child of children) {
        result.push({
            ...child,
            displayName: `${"— ".repeat(depth)}${child.name}`
        });
        const grandchildren = buildCategoryTree(list, parseInt(child.id), depth + 1);
        result.push(...grandchildren);
    }
    return result;
};

const FrontAcceuil = () => {
    const [products, setProducts] = useState<Product[]>([]);
    const [categories, setCategories] = useState<any[]>([]);

    // Search and filter states
    const [searchName, setSearchName] = useState('');
    const [searchCategory, setSearchCategory] = useState('');
    const [minPrice, setMinPrice] = useState('');
    const [maxPrice, setMaxPrice] = useState('');

    useEffect(() => {
        const fetchProducts = async () => {
            try {
                const data = await getProducts();
                setProducts(data);
            } catch (error) {
                console.error("Failed to fetch products", error);
            }
        };

        const fetchCategories = async () => {
            try {
                const data = await CategoryService.getAll();
                setCategories(data || []);
            } catch (error) {
                console.error("Failed to fetch categories", error);
            }
        };

        fetchProducts();
        fetchCategories();
    }, []);

    const handleAddToCart = async (product: Product) => {
        try {
            const quantity = 1;
            const storedCartId = localStorage.getItem('cartId');
            let cartId = storedCartId ? parseInt(storedCartId, 10) : null;
            let cartData: any = null;

            if (cartId) {
                try {
                    cartData = await CardService.getById(cartId);
                } catch (error) {
                    cartId = null; 
                }
            }

            if (!cartId) {
                // Create a new cart
                const newCartPayload = {
                    id_customer: 0,
                    id_currency: 1,
                    id_lang: 1,
                    id_carrier: 0,
                    associations: {
                        cart_rows: [{ id_product: product.id, id_product_attribute: 0, quantity: quantity }]
                    }
                };
                const newCartResponse = await CardService.create(newCartPayload);
                const newId = newCartResponse.cart?.id || newCartResponse.id;
                if (newId) {
                    localStorage.setItem('cartId', newId.toString());
                }
                
                const cart: Array<Product & { quantity: number }> = JSON.parse(localStorage.getItem('cart') || '[]');
                const existingProduct = cart.find((item) => item.id === product.id);
                if (existingProduct) {
                    existingProduct.quantity += quantity;
                } else {
                    cart.push({ ...product, quantity });
                }
                localStorage.setItem('cart', JSON.stringify(cart));
            } else {
                // Update existing cart
                let cartRows = cartData?.associations?.cart_rows || [];
                if (!Array.isArray(cartRows)) {
                    cartRows = [cartRows];
                }
                const existingRowIndex = cartRows.findIndex((r: any) => parseInt(r.id_product) === product.id);
                
                if (existingRowIndex >= 0) {
                    cartRows[existingRowIndex].quantity = parseInt(cartRows[existingRowIndex].quantity) + quantity;
                } else {
                    cartRows.push({ id_product: product.id, id_product_attribute: 0, quantity });
                }

                await CardService.update(cartId, {
                    id_customer: cartData.id_customer || 0,
                    id_currency: cartData.id_currency || 1,
                    id_lang: cartData.id_lang || 1,
                    associations: { cart_rows: cartRows }
                });

                // Update localStorage
                const cart: Array<Product & { quantity: number }> = JSON.parse(localStorage.getItem('cart') || '[]');
                const existingProduct = cart.find((item) => item.id === product.id);
                if (existingProduct) {
                    existingProduct.quantity += quantity;
                } else {
                    cart.push({ ...product, quantity });
                }
                localStorage.setItem('cart', JSON.stringify(cart));
            }
            alert('Produit ajouté au panier!');
        } catch (error) {
            console.error("Error adding to cart", error);
        }
    };

    const handleResetFilters = () => {
        setSearchName('');
        setSearchCategory('');
        setMinPrice('');
        setMaxPrice('');
    };

    const treeCategories = buildCategoryTree(categories, 2, 0);
    const displayCategories = treeCategories.length > 0 
        ? treeCategories 
        : categories.filter(c => parseInt(c.id) > 2 && (c.active === "1" || c.active === 1)).map(c => ({ ...c, displayName: c.name }));

    const filteredProducts = products.filter(product => {
        // 1. Nom filter
        if (searchName && !product.name.toLowerCase().includes(searchName.toLowerCase())) {
            return false;
        }

        // 2. Catégorie filter
        if (searchCategory) {
            const productCategoryIds = product.associations?.categories?.map(c => c.id.toString()) || [];
            const defaultCategoryId = product.id_category_default?.toString();
            
            const isInCategory = (defaultCategoryId === searchCategory) || productCategoryIds.includes(searchCategory);
            if (!isInCategory) {
                return false;
            }
        }

        // 3. Price filter
        const priceVal = parseFloat(product.price);
        if (minPrice && !isNaN(parseFloat(minPrice)) && priceVal < parseFloat(minPrice)) {
            return false;
        }
        if (maxPrice && !isNaN(parseFloat(maxPrice)) && priceVal > parseFloat(maxPrice)) {
            return false;
        }

        return true;
    });

    return (
        <div className="home-container">
            <h1>Nos Produits</h1>
            
            <div className="search-filter-container">
                <div className="search-filter-row">
                    <div className="filter-group">
                        <label htmlFor="searchName">Rechercher par nom</label>
                        <input
                            id="searchName"
                            type="text"
                            placeholder="Ex: T-shirt, mug..."
                            value={searchName}
                            onChange={(e) => setSearchName(e.target.value)}
                            className="filter-input"
                        />
                    </div>
                    
                    <div className="filter-group">
                        <label htmlFor="searchCategory">Catégorie</label>
                        <select
                            id="searchCategory"
                            value={searchCategory}
                            onChange={(e) => setSearchCategory(e.target.value)}
                            className="filter-select"
                        >
                            <option value="">Toutes les catégories</option>
                            {displayCategories.map((cat: any) => (
                                <option key={cat.id} value={cat.id}>
                                    {cat.displayName}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="filter-group price-range-group">
                        <label>Intervalle de prix (€)</label>
                        <div className="price-inputs">
                            <input
                                type="number"
                                placeholder="Min"
                                value={minPrice}
                                onChange={(e) => setMinPrice(e.target.value)}
                                className="filter-input price-input"
                                min="0"
                                step="0.01"
                            />
                            <span className="price-separator">à</span>
                            <input
                                type="number"
                                placeholder="Max"
                                value={maxPrice}
                                onChange={(e) => setMaxPrice(e.target.value)}
                                className="filter-input price-input"
                                min="0"
                                step="0.01"
                            />
                        </div>
                    </div>

                    <div className="filter-group filter-actions">
                        <button onClick={handleResetFilters} className="btn-reset-filters">
                            Réinitialiser
                        </button>
                    </div>
                </div>
            </div>

            {filteredProducts.length === 0 ? (
                <div className="no-products-message">
                    <h3>Aucun produit ne correspond à vos critères de recherche.</h3>
                    <p>Essayez de modifier vos filtres ou de réinitialiser la recherche.</p>
                </div>
            ) : (
                <div className="front-product-grid">
                    {filteredProducts.map(product => (
                        <ProductCard key={product.id} product={product} onAddToCart={handleAddToCart} />
                    ))}
                </div>
            )}
        </div>
    );
};

export default FrontAcceuil;