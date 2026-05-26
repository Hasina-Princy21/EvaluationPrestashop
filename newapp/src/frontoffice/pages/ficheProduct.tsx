import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getProductById } from '../../api/productService';
import type { Product } from '../../api/productService';
import CardService from '../../api/cardService';
import StockAvailableService from "../../api/stock_availableService";
import './ficheProduct.css';

const apiKey = "A9IBmZ4Ake4NJ36RPAjSJ8sVsLxQ4CGn";

const getProductBadge = (dateAddStr?: string): 'HOT' | 'NEW' | null => {
    if (!dateAddStr) return null;
    
    const normalizedStr = dateAddStr.trim().replace(" ", "T");
    const dateAdd = new Date(normalizedStr);
    
    if (isNaN(dateAdd.getTime())) return null;
    
    const now = new Date();
    const diffMs = now.getTime() - dateAdd.getTime();
    const diffDays = diffMs / (1000 * 60 * 60 * 24);
    
    if (diffDays >= 0 && diffDays <= 1) {
        return 'HOT';
    } else if (diffDays > 1 && diffDays <= 7) {
        return 'NEW';
    }
    
    return null;
};

const FicheProduct = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [product, setProduct] = useState<Product | null>(null);
    const [availableStock, setAvailableStock] = useState<number | null>(null);
    const [quantity, setQuantity] = useState<number>(1);
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (id) {
            const fetchProduct = async () => {
                try {
                    const data = await getProductById(parseInt(id, 10));
                    setProduct(data);

                    const stockData = await StockAvailableService.getByProductId(parseInt(id, 10));
                    if (stockData) {
                        setAvailableStock(parseInt(stockData.quantity, 10));
                    }
                } catch (error) {
                    console.error("Failed to fetch product", error);
                }
            };

            fetchProduct();
        }
    }, [id]);

    const handleAddToCart = async () => {
        if (!product || quantity < 1) return;
        setIsSubmitting(true);

        try {
            // Check if cart ID exists in localStorage
            const storedCartId = localStorage.getItem('cartId');
            let cartId = storedCartId ? parseInt(storedCartId, 10) : null;
            let cartData: any = null;

            if (cartId) {
                try {
                    cartData = await CardService.getById(cartId);
                } catch (error) {
                    console.warn("Cart not found in DB, creating a new one.");
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
                
                // Also save to local storage for panier
                const localCart: Array<Product & { quantity: number }> = JSON.parse(localStorage.getItem('cart') || '[]');
                const existingProduct = localCart.find((item) => item.id === product.id);
                if (existingProduct) {
                    existingProduct.quantity += quantity;
                } else {
                    localCart.push({ ...product, quantity });
                }
                localStorage.setItem('cart', JSON.stringify(localCart));
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

                // Update localStorage array
                const localCart: Array<Product & { quantity: number }> = JSON.parse(localStorage.getItem('cart') || '[]');
                const existingProduct = localCart.find((item) => item.id === product.id);
                if (existingProduct) {
                    existingProduct.quantity += quantity;
                } else {
                    localCart.push({ ...product, quantity });
                }
                localStorage.setItem('cart', JSON.stringify(localCart));
            }

        } catch (error) {
            console.error("Error adding to cart", error);
            alert('Une erreur est survenue lors de l ajout au panier.');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!product) {
        return <div className="loader">Chargement...</div>;
    }

    const imageUrl = product.id_default_image
        ? `/api/images/products/${product.id}/${product.id_default_image}?ws_key=${apiKey}`
        : 'https://via.placeholder.com/400';

    const badge = getProductBadge(product.date_add);

    return (
        <div className="fiche-product-container">
            <button className="back-button" onClick={() => navigate(-1)}>Retour</button>
            <div className="fiche-product-content">
                <div className="product-image-wrapper">
                    <img src={imageUrl} alt={product.name} className="product-image" />
                </div>
                <div className="product-details">
                    <h1 className="product-title" style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                        {product.name}
                        {badge && (
                            <span className={`fiche-product-badge badge-${badge.toLowerCase()}`}>
                                {badge}
                            </span>
                        )}
                    </h1>
                    <p className="product-price">{parseFloat(product.price).toFixed(2)} €</p>
                    
                    
                    {availableStock !== null && (
                        <p className="product-stock" style={{ margin: "10px 0" }}>
                            <strong>Quantité en stock : </strong>{availableStock > 0 ? availableStock : "Rupture de stock"}
                        </p>
                    )}
                    <div className="product-description" dangerouslySetInnerHTML={{ __html: product.description || '' }}></div>
                    
                    <div className="product-actions">
                        <label htmlFor="quantity">Quantité: </label>
                                         <input 
                            type="number" 
                            id="quantity" 
                            value={quantity} 
                            onChange={(e) => setQuantity(Math.max(1, Math.min(parseInt(e.target.value) || 1, availableStock ?? 9999)))}
                            min="1" 
                            max={availableStock ?? undefined} 
                            className="quantity-input"
                        />
                        <button className="add-to-cart-btn" onClick={handleAddToCart} disabled={isSubmitting || (availableStock !== null && availableStock <= 0)}>
                            {isSubmitting ? 'Ajout...' : 'Ajouter au panier'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default FicheProduct;