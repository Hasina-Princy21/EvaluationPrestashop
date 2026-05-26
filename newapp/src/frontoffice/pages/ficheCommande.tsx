import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import OrderService from '../../api/orderService';
import './ficheCommande.css';

const FicheCommande = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [order, setOrder] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [duplicateCount, setDuplicateCount] = useState(1);

    useEffect(() => {
        const fetchOrder = async () => {
            try {
                if (!id) throw new Error("ID de commande invalide");
                const fetchedOrder = await OrderService.getById(parseInt(id, 10));
                setOrder(fetchedOrder);
            } catch (err) {
                console.error("Erreur lors de la récupération de la commande:", err);
                setError("Impossible de charger les détails de la commande.");
            } finally {
                setIsLoading(false);
            }
        };

        fetchOrder();
    }, [id]);

    const handleDuplicateOrder = () => {
        if (!order) return;
        const count = duplicateCount > 0 ? duplicateCount : 1;
        
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
            const qty = parseInt(row.product_quantity, 10) * count;
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
        return <div className="fiche-commande-container"><p className="loading">Chargement de la commande...</p></div>;
    }

    if (error || !order) {
        return <div className="fiche-commande-container"><p className="error">{error || "Commande introuvable"}</p></div>;
    }

    let rows = order.associations?.order_rows || [];
    if (!Array.isArray(rows)) {
        rows = [rows];
    }

    return (
        <div className="fiche-commande-container">
            <button className="back-btn" onClick={() => navigate('/front/commandes')}>&larr; Retour aux commandes</button>
            <h1>Détails de la commande #{order.id}</h1>
            
            <div className="order-summary">
                <p><strong>Date:</strong> {new Date(order.date_add).toLocaleString()}</p>
                <p><strong>Paiement:</strong> {order.payment}</p>
                <p><strong>Total payé:</strong> {parseFloat(order.total_paid).toFixed(2)} €</p>
            </div>

            <h2>Produits</h2>
            <div className="products-list">
                {rows.length === 0 ? (
                    <p>Aucun produit trouvé dans cette commande.</p>
                ) : (
                    <table className="order-products-table">
                        <thead>
                            <tr>
                                <th>Produit</th>
                                <th>Prix unitaire</th>
                                <th>Quantité</th>
                                <th>Total</th>
                            </tr>
                        </thead>
                        <tbody>
                            {rows.map((row: any, idx: number) => (
                                <tr key={idx}>
                                    <td>{row.product_name}</td>
                                    <td>{parseFloat(row.unit_price_tax_incl).toFixed(2)} €</td>
                                    <td>{row.product_quantity}</td>
                                    <td>{(parseFloat(row.unit_price_tax_incl) * row.product_quantity).toFixed(2)} €</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            <div className="fiche-actions" style={{ display: 'flex', alignItems: 'center', gap: '10px', justifyContent: 'flex-end', marginTop: '20px' }}>
                <label htmlFor="dup-count">Fois:</label>
                <input
                    id="dup-count"
                    type="number"
                    min="1"
                    value={duplicateCount}
                    onChange={(e) => setDuplicateCount(parseInt(e.target.value) || 1)}
                    style={{ width: '60px', padding: '10px', fontSize: '16px', borderRadius: '4px', border: '1px solid #ccc' }}
                />
                <button className="duplicate-btn" onClick={handleDuplicateOrder}>Dupliquer la commande</button>
            </div>
        </div>
    );
};

export default FicheCommande;
