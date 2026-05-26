const fs = require('fs');

const tsxContent = `import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import OrderService from '../../api/orderService';
import './ficheCommande.css';

const FicheCommande = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [order, setOrder] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

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
            const qty = parseInt(row.product_quantity, 10);
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
        alert('Les produits de la commande ont été ajoutés à votre panier.');
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

            <div className="fiche-actions">
                <button className="duplicate-btn" onClick={handleDuplicateOrder}>Dupliquer la commande</button>
            </div>
        </div>
    );
};

export default FicheCommande;
`;

const cssContent = `.fiche-commande-container {
    max-width: 800px;
    margin: 40px auto;
    padding: 20px;
    background-color: #fff;
    border-radius: 8px;
    box-shadow: 0 4px 6px rgba(0,0,0,0.1);
}

.fiche-commande-container h1 {
    font-size: 24px;
    margin-bottom: 20px;
    color: #333;
}

.back-btn {
    background: none;
    border: none;
    color: #007bff;
    cursor: pointer;
    font-size: 16px;
    margin-bottom: 20px;
    padding: 0;
}

.back-btn:hover {
    text-decoration: underline;
}

.order-summary {
    background-color: #f8f9fa;
    padding: 15px;
    border-radius: 6px;
    margin-bottom: 30px;
}

.order-summary p {
    margin: 5px 0;
    font-size: 16px;
}

.order-products-table {
    width: 100%;
    border-collapse: collapse;
    margin-bottom: 30px;
}

.order-products-table th,
.order-products-table td {
    padding: 12px;
    text-align: left;
    border-bottom: 1px solid #ddd;
}

.order-products-table th {
    background-color: #f1f3f5;
    font-weight: 600;
}

.fiche-actions {
    text-align: right;
}

.duplicate-btn {
    padding: 12px 24px;
    background-color: #28a745;
    color: white;
    border: none;
    border-radius: 4px;
    font-size: 16px;
    cursor: pointer;
    transition: background-color 0.2s;
}

.duplicate-btn:hover {
    background-color: #218838;
}
`;

fs.writeFileSync("/media/hasina/Nouveau nom/react/prestashop/eval/newapp/src/frontoffice/pages/ficheCommande.tsx", tsxContent, 'utf8');
fs.writeFileSync("/media/hasina/Nouveau nom/react/prestashop/eval/newapp/src/frontoffice/pages/ficheCommande.css", cssContent, 'utf8');
