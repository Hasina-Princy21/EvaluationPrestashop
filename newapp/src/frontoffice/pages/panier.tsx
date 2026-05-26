import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import CardService from '../../api/cardService';
import OrderService from '../../api/orderService';
import AddressService from '../../api/addressService';
import CustomerService from '../../api/customerService';
import CarrierService from '../../api/carrierService';
import StockAvailableService from '../../api/stock_availableService';
import './panier.css';

interface CartItem {
    id: number;
    name: string;
    price: number;
    quantity: number;
}

const Panier = () => {
    const navigate = useNavigate();
    const [cart, setCart] = useState<CartItem[]>(() => {
        const cartItems = JSON.parse(localStorage.getItem('cart') || '[]');
        return cartItems;
    });

    const [isUpdating, setIsUpdating] = useState(false);
    const [stocks, setStocks] = useState<Record<number, number>>({});
    const PAYMENT_MODULE_NAME = "ps_wirepayment";

    useEffect(() => {
        const fetchStocks = async () => {
            const newStocks: Record<number, number> = {};
            for (const item of cart) {
                try {
                    const row = await StockAvailableService.getByProductAndAttribute(item.id, 0);
                    newStocks[item.id] = Number(row?.quantity) || 0;
                } catch (e) {
                    console.error("Error fetching stock for product", item.id, e);
                }
            }
            setStocks(newStocks);
        };
        if (cart.length > 0) {
            fetchStocks();
        }
    }, [cart]);

    const syncCartWithDB = async (updatedCart: CartItem[]) => {
        setIsUpdating(true);
        try {
            const storedCartId = localStorage.getItem('cartId');
            if (storedCartId) {
                const cartId = parseInt(storedCartId, 10);
                if (updatedCart.length === 0) {
                    await CardService.delete(cartId);
                    localStorage.removeItem('cartId');
                } else {
                    try {
                        await CardService.delete(cartId);
                    } catch (e) {
                        console.warn('Erreur lors de la suppression de l\'ancien panier', e);
                    }
                    const customerId = parseInt(localStorage.getItem('customerId') || '0', 10);
                    const cartRows = updatedCart.map(item => ({
                        id_product: item.id,
                        id_product_attribute: 0,
                        quantity: item.quantity
                    }));

                    const newCart = await CardService.create({
                        id_customer: customerId,
                        id_currency: 1,
                        id_lang: 1,
                        associations: { cart_rows: cartRows }
                    });
                    
                    if (newCart?.cart?.id || newCart?.id) {
                        localStorage.setItem('cartId', (newCart.cart?.id || newCart.id).toString());
                    }
                }
            } else if (updatedCart.length > 0) {
                const customerId = parseInt(localStorage.getItem('customerId') || '0', 10);
                if (customerId > 0) {
                    const cartRows = updatedCart.map(item => ({
                        id_product: item.id,
                        id_product_attribute: 0,
                        quantity: item.quantity
                    }));
                    const newCart = await CardService.create({
                        id_customer: customerId,
                        id_currency: 1,
                        id_lang: 1,
                        associations: { cart_rows: cartRows }
                    });
                    if (newCart?.cart?.id) {
                        localStorage.setItem('cartId', newCart.cart.id.toString());
                    }
                }
            }
        } catch (error) {
            console.error("Error updating cart in DB", error);
        } finally {
            setIsUpdating(false);
        }
    };

    const handleRemoveFromCart = (productId: number) => {
        const updatedCart = cart.filter((item: CartItem) => item.id !== productId);
        setCart(updatedCart);
        localStorage.setItem('cart', JSON.stringify(updatedCart));
        syncCartWithDB(updatedCart);
    };

    const handleQuantityChange = (productId: number, newQuantity: number) => {
        if (newQuantity < 1) return;
        const updatedCart = cart.map(item => {
            if (item.id === productId) {
                return { ...item, quantity: newQuantity };
            }
            return item;
        });
        setCart(updatedCart);
        localStorage.setItem('cart', JSON.stringify(updatedCart));
        syncCartWithDB(updatedCart);
    };

    const getTotal = () => {
        return cart.reduce((total: number, item: CartItem) => total + item.price * item.quantity, 0).toFixed(2);
    };

    const hasInvalidStock = cart.some(item => stocks[item.id] !== undefined && item.quantity > stocks[item.id]);

    const handleCheckout = async () => {
        const customerId = localStorage.getItem('customerId');
        if (!customerId || customerId === '0') {
            alert('Vous devez être connecté pour passer la commande.');
            navigate('/front/login');
            return;
        }

        const cartId = localStorage.getItem('cartId');
        if (!cartId) {
            alert('Votre panier est vide ou non synchronisé.');
            return;
        }

        setIsUpdating(true);
        try {
            const customerNumericId = parseInt(customerId, 10);
            const carrierId = await CarrierService.getDefaultCarrierId();
            const customer = await CustomerService.getById(customerNumericId);

            let addressId = 0;
            try {
                const customerAddresses = await AddressService.getAll();
                const matchingAddress = (customerAddresses || []).find((addr: any) => parseInt(addr.id_customer, 10) === customerNumericId);
                if (matchingAddress?.id) {
                    addressId = parseInt(matchingAddress.id, 10);
                }
            } catch (addressError) {
                console.warn('Unable to load customer addresses for checkout', addressError);
            }

            if (!addressId) {
                const fallbackAddress = await AddressService.create({
                    id_customer: customerNumericId,
                    alias: 'Mon Adresse',
                    firstname: customer?.firstname || 'Client',
                    lastname: customer?.lastname || 'Import',
                    address1: 'Rue de l\'Import',
                    city: 'Antananarivo',
                    postcode: '00101',
                    id_country: 8
                });
                addressId = fallbackAddress?.address?.id || fallbackAddress?.id || 0;
            }

            if (!addressId) {
                throw new Error('Impossible de déterminer une adresse de facturation/livraison valide.');
            }

            const totalPaidTtc = cart.reduce((acc, item) => acc + item.price * item.quantity, 0);
            const totalPaidHt = totalPaidTtc; // prix déjà TTC dans le panier, on utilise comme HT aussi

            const oldCartId = localStorage.getItem('cartId');
            const cartRows = cart.map(item => ({
                id_product: item.id,
                id_product_attribute: 0,
                quantity: item.quantity
            }));

            const freshCart = await CardService.create({
                id_customer: customerNumericId,
                id_currency: 1,
                id_lang: 1,
                associations: { cart_rows: cartRows }
            });
            const freshCartId = freshCart?.cart?.id || freshCart?.id;
            if (!freshCartId) throw new Error('Impossible de créer un panier lié au client.');

            if (oldCartId) {
                try { await CardService.delete(parseInt(oldCartId, 10)); } catch (_) {}
            }

            const orderRows = cart.map(item => ({
                product_id: item.id,
                product_attribute_id: 0,
                product_quantity: item.quantity,
                product_name: item.name,
                product_reference: '',
                product_price: Number(parseFloat(item.price as any).toFixed(6)),
                unit_price_tax_incl: Number(parseFloat(item.price as any).toFixed(6)),
                unit_price_tax_excl: Number(parseFloat(item.price as any).toFixed(6)),
            }));

            const secureKey = customer?.secure_key || '';

            const orderPayload = {
                id_address_delivery: addressId,
                id_address_invoice: addressId,
                id_cart: parseInt(freshCartId.toString(), 10),
                id_currency: 1,
                id_lang: 1,
                id_customer: customerNumericId,
                id_carrier: carrierId,
                id_shop: 1,
                id_shop_group: 0,
                module: PAYMENT_MODULE_NAME,
                module_name: PAYMENT_MODULE_NAME,
                payment: "Paiement par virement bancaire",
                total_paid: Number(totalPaidTtc.toFixed(6)),
                total_paid_real: Number(totalPaidTtc.toFixed(6)),
                total_products: Number(totalPaidHt.toFixed(6)),
                total_products_wt: Number(totalPaidTtc.toFixed(6)),
                total_paid_tax_incl: Number(totalPaidTtc.toFixed(6)),
                total_paid_tax_excl: Number(totalPaidHt.toFixed(6)),
                total_shipping: 0,
                total_shipping_tax_incl: 0,
                total_shipping_tax_excl: 0,
                conversion_rate: 1,
                valid: 1,
                current_state: 2,
                secure_key: secureKey,
                associations: {
                    order_rows: orderRows
                }
            };

            const orderRes = await OrderService.create(orderPayload);
            
            const orderId = orderRes?.order?.id || orderRes?.id;
            if (orderId) {
                try {
                    await OrderService.updateState(orderId, 2);
                } catch (stateErr: any) {
                    console.warn(`Avertissement: Impossible de définir le statut de la commande #${orderId}:`, stateErr);
                }
            }

            if (orderId) {
                try {
                    await OrderService.updateTotals(orderId, {
                        total_paid: Number(totalPaidTtc.toFixed(6)),
                        total_paid_real: Number(totalPaidTtc.toFixed(6)),
                        total_products: Number(totalPaidHt.toFixed(6)),
                        total_products_wt: Number(totalPaidTtc.toFixed(6)),
                        total_paid_tax_incl: Number(totalPaidTtc.toFixed(6)),
                        total_paid_tax_excl: Number(totalPaidHt.toFixed(6)),
                    }, {
                        id_address_delivery: addressId,
                        id_address_invoice: addressId,
                        id_cart: parseInt(freshCartId.toString(), 10),
                        id_currency: 1,
                        id_lang: 1,
                        id_customer: customerNumericId,
                        id_carrier: carrierId
                    });
                } catch (totErr) {
                    console.warn(`Avertissement: Impossible de forcer la mise à jour des totaux pour la commande #${orderId}:`, totErr);
                }
            }
            
            setCart([]);
            localStorage.removeItem('cart');
            localStorage.removeItem('cartId');
            
            alert('Commande validée avec succès !');
            navigate('/front/commandes');
        } catch (error) {
            console.error('Erreur lors de la création de la commande:', error);
            alert('Erreur lors de la validation de la commande. Voir la console.');
        } finally {
            setIsUpdating(false);
        }
    };

    return (
        <div className="panier-container">
            <h1>Votre Panier</h1>
            {cart.length === 0 ? (
                <p>Votre panier est vide.</p>
            ) : (
                <div className="panier-content">
                    {isUpdating && <div className="update-overlay">Mise à jour du panier...</div>}
                    <div className="cart-items-list">
                        {cart.map((item: CartItem) => (
                            <div key={item.id} className="cart-item">
                                <div className="cart-item-details">
                                    <h2 className="cart-item-title">{item.name}</h2>
                                    <p className="cart-item-price">Prix: {parseFloat(item.price as any).toFixed(2)} €</p>
                                    {stocks[item.id] !== undefined && (
                                        <p className="cart-item-stock" style={{ color: item.quantity > stocks[item.id] ? 'red' : 'green' }}>
                                            Stock disponible: {stocks[item.id]} 
                                            {item.quantity > stocks[item.id] && " (Quantité demandée indisponible)"}
                                        </p>
                                    )}
                                </div>
                                <div className="cart-item-actions">
                                    <div className="quantity-control">
                                        <label htmlFor={`qty-${item.id}`}>Quantité:</label>
                                        <input 
                                            id={`qty-${item.id}`}
                                            type="number" 
                                            min="1"
                                            value={item.quantity}
                                            onChange={(e) => handleQuantityChange(item.id, parseInt(e.target.value) || 1)}
                                            disabled={isUpdating}
                                        />
                                    </div>
                                    <button 
                                        className="remove-btn" 
                                        onClick={() => handleRemoveFromCart(item.id)}
                                        disabled={isUpdating}
                                    >
                                        Supprimer
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                    
                    <div className="cart-summary">
                        <h2>Total: {getTotal()} €</h2>
                        {hasInvalidStock && (
                            <p style={{ color: 'red', fontWeight: 'bold' }}>
                                Vous ne pouvez pas passer commande car certains produits sont en rupture de stock par rapport à la quantité souhaitée.
                            </p>
                        )}
                        <button
                            className="checkout-btn"
                            disabled={isUpdating || hasInvalidStock}
                            onClick={handleCheckout}
                        >
                            Passer la commande
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Panier;
