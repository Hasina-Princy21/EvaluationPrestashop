import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import OrderService from '../../api/orderService';
import './commandes.css';

const Commandes = () => {
    const navigate = useNavigate();
    const [orders, setOrders] = useState<any[]>([]);
    const [stateMap, setStateMap] = useState<Record<string, string>>({});
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [duplicationCounts, setDuplicationCounts] = useState<Record<number, number>>({});

    useEffect(() => {
        const fetchData = async () => {
            const customerId = localStorage.getItem('customerId');
            if (!customerId || customerId === '0') {
                navigate('/front/login');
                return;
            }

            try {
                const [fetchedOrders, orderStates] = await Promise.all([
                    OrderService.getByCustomer(parseInt(customerId, 10)),
                    OrderService.getOrderStates()
                ]);

                const map: Record<string, string> = {};
                if (Array.isArray(orderStates)) {
                    orderStates.forEach((state: any) => {
                        let name = state.name;
                        if (Array.isArray(name)) {
                            const frEntry = name.find((n: any) => n.id === '1' || n.id === 1);
                            name = frEntry?.value || name[0]?.value || name;
                        }
                        map[state.id.toString()] = name;
                    });
                }
                setStateMap(map);

                const ordersArray = Array.isArray(fetchedOrders) ? fetchedOrders : [fetchedOrders];
                setOrders(ordersArray.filter(Boolean).reverse());
            } catch (err) {
                console.error("Erreur lors de la récupération des commandes:", err);
                setError("Impossible de charger l'historique des commandes.");
            } finally {
                setIsLoading(false);
            }
        };

        fetchData();
    }, [navigate]);

    const getStateName = (stateId: string | number) => {
        const id = stateId?.toString();
        return stateMap[id] || `État #${id}`;
    };

    const handleDuplicateCountChange = (orderId: number, value: number) => {
        const safeValue = Number.isFinite(value) && value > 0 ? value : 1;
        setDuplicationCounts((prev) => ({ ...prev, [orderId]: safeValue }));
    };

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
            const qty = parseInt(row.product_quantity, 10) * count; // multiply by requested duplicates
            const price = parseFloat(row.unit_price_tax_incl);
            const name = row.product_name;

            const existingItem = targetCart.find((item: any) => item.id === prodId);
            if (existingItem) {
                existingItem.quantity += qty;
            } else {
                targetCart.push({
                    id: prodId,
                    name: name,
                    price: price,
                    quantity: qty
                });
            }
        });

        localStorage.setItem('cart', JSON.stringify(targetCart));
        alert(`La commande a été dupliquée ${count} fois dans votre panier.`);
        navigate('/front/panier');
    };

    if (isLoading) {
        return <div className="commandes-container"><p className="loading">Chargement de vos commandes...</p></div>;
    }

    if (error) {
        return <div className="commandes-container"><p className="error">{error}</p></div>;
    }

    return (
        <div className="commandes-container">
            <h1>Historique de vos commandes</h1>
            {orders.length === 0 ? (
                <div className="empty-orders">
                    <p>Vous n'avez passé aucune commande pour le moment.</p>
                    <button className="back-to-shop-btn" onClick={() => navigate('/front')}>Retourner à la boutique</button>
                </div>
            ) : (
                <div className="orders-list">
                    {orders.map((order: any) => (
                        <div key={order.id} className="order-card">
                            <div className="order-header">
                                <span className="order-id">Commande #{order.id}</span>
                                <span className="order-status">État: {getStateName(order.current_state)}</span>
                            </div>
                            <div className="order-details">
                                <p><strong>Méthode de paiement:</strong> {order.payment}</p>
                                <p><strong>Total payé:</strong> {parseFloat(order.total_paid).toFixed(2)} €</p>
                                <p><strong>Nombre de produits:</strong> {parseFloat(order.total_products).toFixed(2)}</p>
                            </div>
                            <div className="order-actions" style={{ marginTop: '10px', display: 'flex', gap: '10px', alignItems: 'center' }}>
                                <button className="details-btn" onClick={() => navigate(`/front/commandes/${order.id}`)}>Voir les détails</button>
                                
                                <div className="duplicate-controls" style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                    <label htmlFor={`dup-${order.id}`}>Fois:</label>
                                    <input
                                        id={`dup-${order.id}`}
                                        type="number"
                                        min="1"
                                        value={duplicationCounts[order.id] ?? 1}
                                        onChange={(e) => handleDuplicateCountChange(order.id, parseInt(e.target.value) || 1)}
                                        style={{ width: '60px', padding: '5px' }}
                                    />
                                    <button className="duplicate-order-btn" onClick={() => handleDuplicateOrder(order)}>Dupliquer la commande</button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default Commandes;
