import { useState, useEffect } from "react";
import CustomerService from "../../api/customerService";
import CardService from "../../api/cardService";
import OrderService from "../../api/orderService";
import { getProductById } from "../../api/productService";
import { useNavigate } from "react-router-dom";
import './login.css';

const FrontLogin = () => {
    
    const navigate = useNavigate();
    const [customers, setCustomers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchCustomers = async () => {
            try {
                const data = await CustomerService.getAll();
                setCustomers(Array.isArray(data) ? data : (data ? [data] : []));
            } catch (err) {
                console.error("Erreur chargement utilisateurs:", err);
                setError("Impossible de charger les utilisateurs existants.");
            } finally {
                setLoading(false);
            }
        };
        fetchCustomers();
    }, []);

    const handleLogin = async (customer: any) => {
        try {
            console.log("Connecté:", customer);
            localStorage.setItem("customerId", customer.id.toString());
            
            // Sync and Merge Cart
            const localCart = JSON.parse(localStorage.getItem("cart") || "[]");
            const anonymousCartIdStr = localStorage.getItem("cartId");
            const anonymousCartId = anonymousCartIdStr ? parseInt(anonymousCartIdStr, 10) : null;

            const carts = await CardService.getByCustomer(customer.id);
            let activeCart = null;
            if (carts && carts.length > 0) {
                for (const cart of carts) {
                    const orders = await OrderService.getByCartId(cart.id);
                    if (!orders || orders.length === 0) {
                        activeCart = cart;
                        break;
                    }
                }
            }
            
            if (activeCart) {
                // Scenario A: Customer already has an active cart in DB
                const dbCartRows = activeCart.associations?.cart_rows || [];
                const dbRowsArray = Array.isArray(dbCartRows) ? dbCartRows : [dbCartRows];
                
                const mergedCartRowsMap = new Map<number, number>();
                
                // 1. Add DB cart rows
                for (const row of dbRowsArray) {
                    if (row && row.id_product) {
                        const prodId = parseInt(row.id_product, 10);
                        const qty = parseInt(row.quantity, 10) || 0;
                        mergedCartRowsMap.set(prodId, (mergedCartRowsMap.get(prodId) || 0) + qty);
                    }
                }
                
                // 2. Add local cart rows
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
                
                // Update active cart in DB with the merged items
                await CardService.update(activeCart.id, {
                    id_customer: customer.id,
                    id_currency: 1,
                    id_lang: 1,
                    associations: { cart_rows: updatedCartRows }
                });
                
                // If there was a different anonymous cart in DB, delete it to keep clean
                if (anonymousCartId && anonymousCartId !== activeCart.id) {
                    try {
                        await CardService.delete(anonymousCartId);
                    } catch (e) {
                        console.warn("Failed to delete duplicate anonymous cart:", e);
                    }
                }
                
                // Sync localStorage cart array with full product details
                const resolvedItems = await Promise.all(
                    Array.from(mergedCartRowsMap.entries()).map(async ([productId, quantity]) => {
                        const localItem = localCart.find((item: any) => item.id === productId);
                        if (localItem) {
                            return { ...localItem, quantity };
                        }
                        try {
                            const prod = await getProductById(productId);
                            if (prod) {
                                return {
                                    id: prod.id,
                                    name: typeof prod.name === 'string' ? prod.name : Object.values(prod.name || {})[0] || 'Unknown',
                                    price: parseFloat(prod.price || '0'),
                                    quantity
                                };
                            }
                        } catch (e) {
                            console.error(`Error fetching product ${productId}`, e);
                        }
                        return null;
                    })
                );
                const finalItems = resolvedItems.filter(item => item !== null);
                localStorage.setItem("cart", JSON.stringify(finalItems));
                localStorage.setItem("cartId", activeCart.id.toString());
            } else {
                // Scenario B: Customer does not have an active cart in DB
                if (anonymousCartId && localCart.length > 0) {
                    // Update the anonymous cart to belong to this customer
                    const cartRows = localCart.map((item: any) => ({
                        id_product: item.id,
                        id_product_attribute: 0,
                        quantity: item.quantity
                    }));
                    await CardService.update(anonymousCartId, {
                        id_customer: customer.id,
                        id_currency: 1,
                        id_lang: 1,
                        associations: { cart_rows: cartRows }
                    });
                    localStorage.setItem("cartId", anonymousCartId.toString());
                } else if (localCart.length > 0) {
                    // Create a new cart for this customer
                    const cartRows = localCart.map((item: any) => ({
                        id_product: item.id,
                        id_product_attribute: 0,
                        quantity: item.quantity
                    }));
                    const newCart = await CardService.create({
                        id_customer: customer.id,
                        id_currency: 1,
                        id_lang: 1,
                        associations: { cart_rows: cartRows }
                    });
                    const newId = newCart?.cart?.id || newCart?.id;
                    if (newId) {
                        localStorage.setItem("cartId", newId.toString());
                    }
                }
            }

            // Redirect immediately
            navigate("/front");
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : "Une erreur est survenue lors de l'authentification.";
            setError(errorMessage);
        }
    };


    return (
        <div className="login-container">
            <div className="login-card login-users-card">
                <h1>Choisir un compte</h1>
                <p className="login-subtitle">Sélectionnez un profil pour continuer.</p>
                {error && <div className="error-message">{error}</div>}
                
                {loading ? (
                    <div className="small-spinner mx-auto my-4"></div>
                ) : (
                    <div className="user-list">
                        
                        {customers.map(cust => (
                            <button key={cust.id} className="user-card" onClick={() => handleLogin(cust)}>
                                <div className="user-avatar">{(cust.firstname?.charAt(0) || '')}{(cust.lastname?.charAt(0) || '')}</div>
                                <div className="user-info">
                                    <strong>{cust.firstname} {cust.lastname}</strong>
                                    <span>{cust.email}</span>
                                </div>
                            </button>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default FrontLogin;