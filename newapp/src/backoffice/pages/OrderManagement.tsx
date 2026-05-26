import { useEffect, useState } from "react";
import OrderService from "../../api/orderService";
import StockAvailableService from "../../api/stock_availableService";
import CustomerService from "../../api/customerService";
import "./OrderManagement.css";

type OrderItem = {
  id: number;
  reference?: string;
  id_customer: number;
  customerName: string;
  customerEmail: string;
  date_add: string;
  total_paid: number;
  current_state: number;
  payment: string;
  orderRows: any[];
  rawOrder: any;
};

const OrderManagement = () => {
  const [orders, setOrders] = useState<OrderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [filterState, setFilterState] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [toastMsg, setToastMsg] = useState<{ text: string; type: "success" | "error" } | null>(null);

  const showToast = (text: string, type: "success" | "error" = "success") => {
    setToastMsg({ text, type });
    setTimeout(() => setToastMsg(null), 4000);
  };

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const allOrders = await OrderService.getAll();
      if (!allOrders || allOrders.length === 0) {
        setOrders([]);
        setLoading(false);
        return;
      }

      const formattedOrders: OrderItem[] = await Promise.all(
        allOrders.map(async (ord: any) => {
          let customerName = "Client Inconnu";
          let customerEmail = "";
          try {
            const cust = await CustomerService.getById(ord.id_customer);
            if (cust) {
              customerName = `${cust.firstname} ${cust.lastname}`;
              customerEmail = cust.email;
            }
          } catch (e) {
            console.error(`Error loading customer for order ${ord.id}`, e);
          }

          // Order Rows
          const orderRows = ord.associations?.order_rows || [];

          return {
            id: ord.id,
            reference: ord.reference,
            id_customer: ord.id_customer,
            customerName,
            customerEmail,
            date_add: ord.date_add,
            total_paid: parseFloat(ord.total_paid) || 0,
            current_state: parseInt(ord.current_state, 10) || 1,
            payment: ord.payment,
            orderRows,
            rawOrder: ord
          };
        })
      );

      // Sort by ID descending
      formattedOrders.sort((a, b) => b.id - a.id);
      setOrders(formattedOrders);
    } catch (err) {
      console.error("Error fetching orders:", err);
      showToast("Impossible de charger les commandes.", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const handleStatusChange = async (orderId: number, newState: number) => {
    const targetOrder = orders.find(o => o.id === orderId);
    if (!targetOrder) return;

    const previousState = targetOrder.current_state;
    if (previousState === newState) return;

    setActionLoading(orderId);
    try {
      // 1. Check stock movement triggers
      // Transition to "Livré" (5) from another state -> Decrement Stock
      if (newState === 5 && previousState !== 5) {
        showToast(`Mouvement de stock : déduction des produits pour la commande #${orderId}...`);
        for (const row of targetOrder.orderRows) {
          const prodId = row.product_id;
          const attrId = row.product_attribute_id || 0;
          const qty = parseInt(row.product_quantity, 10) || 0;

          const stockRow = await StockAvailableService.getByProductAndAttribute(prodId, attrId);
          const currentStock = parseInt(stockRow?.quantity, 10) || 0;
          const stockId = stockRow?.id;
          const newStock = Math.max(0, currentStock - qty);

          if (stockId) {
            await StockAvailableService.update(stockId, { id: stockId, quantity: newStock, id_product: prodId, id_product_attribute: attrId, id_shop: 1, id_shop_group: 0 });
          } else {
            await StockAvailableService.upsert({ id_product: prodId, id_product_attribute: attrId, quantity: newStock, id_shop: 1, id_shop_group: 0, out_of_stock: 2, depends_on_stock: 0 });
          }
          console.log(`Decremented stock for product ${prodId} (attr: ${attrId}): ${currentStock} -> ${newStock}`);
        }
      }

      // Transition from "Livré" (5) to another state (e.g. Canceled 6) -> Restore Stock (Increment)
      if (previousState === 5 && newState !== 5) {
        showToast(`Mouvement de stock : restauration des produits pour la commande #${orderId}...`);
        for (const row of targetOrder.orderRows) {
          const prodId = row.product_id;
          const attrId = row.product_attribute_id || 0;
          const qty = parseInt(row.product_quantity, 10) || 0;

          const stockRow = await StockAvailableService.getByProductAndAttribute(prodId, attrId);
          const currentStock = parseInt(stockRow?.quantity, 10) || 0;
          const stockId = stockRow?.id;
          const newStock = currentStock + qty;

          if (stockId) {
            await StockAvailableService.update(stockId, { id: stockId, quantity: newStock, id_product: prodId, id_product_attribute: attrId, id_shop: 1, id_shop_group: 0 });
          } else {
            await StockAvailableService.upsert({ id_product: prodId, id_product_attribute: attrId, quantity: newStock, id_shop: 1, id_shop_group: 0, out_of_stock: 2, depends_on_stock: 0 });
          }
          console.log(`Restored stock for product ${prodId} (attr: ${attrId}): ${currentStock} -> ${newStock}`);
        }
      }

      // 2. Update Order current state via Order History API
      await OrderService.updateState(orderId, newState);
      showToast(`Commande #${orderId} mise à jour avec succès.`);
      
      // Update UI state
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, current_state: newState } : o));
    } catch (err: any) {
      console.error(`Error updating order status for ${orderId}:`, err);
      showToast(`Impossible de mettre à jour le statut: ${err?.message || "Erreur de connexion"}`, "error");
    } finally {
      setActionLoading(null);
    }
  };

  const getStatusBadge = (stateId: number) => {
    switch (stateId) {
      case 2:
        return <span className="order-badge status-accepted">Paiement accepté</span>;
      case 5:
        return <span className="order-badge status-delivered">Livré</span>;
      case 6:
        return <span className="order-badge status-canceled">Annulé</span>;
      default:
        return <span className="order-badge status-pending">En attente (ID: {stateId})</span>;
    }
  };

  const filteredOrders = orders.filter(ord => {
    const matchesSearch = 
      ord.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ord.customerEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (ord.reference || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      ord.id.toString().includes(searchTerm);

    if (filterState === "all") return matchesSearch;
    return matchesSearch && ord.current_state === parseInt(filterState, 10);
  });

  return (
    <div className="orders-mgmt-container">
      {toastMsg && (
        <div className={`orders-toast ${toastMsg.type}`}>
          {toastMsg.type === "success" ? "✓" : "✗"} {toastMsg.text}
        </div>
      )}

      <div className="orders-mgmt-header">
        <div>
          <h1>Gestion des Commandes</h1>
          <p>Visualisez les commandes, modifiez les statuts et gérez le mouvement des stocks.</p>
        </div>
        <button className="refresh-btn" onClick={fetchOrders} disabled={loading}>
          <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="2.5" fill="none" className={loading ? "spin" : ""}>
            <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"></path>
          </svg>
          Actualiser
        </button>
      </div>

      <div className="orders-filters-bar">
        <div className="search-box">
          <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="2" fill="none" className="search-icon">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
          <input 
            type="text" 
            placeholder="Rechercher par client, e-mail, réf, ID..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="status-filter">
          <label htmlFor="status-select">Filtrer par statut</label>
          <select 
            id="status-select"
            value={filterState} 
            onChange={(e) => setFilterState(e.target.value)}
          >
            <option value="all">Tous les statuts</option>
            <option value="2">Paiement accepté</option>
            <option value="5">Livré</option>
            <option value="6">Annulé</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="orders-loading-state">
          <div className="big-spinner"></div>
          <p>Chargement des commandes depuis PrestaShop...</p>
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="orders-empty-state">
          <div className="empty-icon">📦</div>
          <h3>Aucune commande trouvée</h3>
          <p>Aucune commande ne correspond à vos filtres ou à vos critères de recherche.</p>
        </div>
      ) : (
        <div className="orders-table-wrapper">
          <table className="orders-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Référence</th>
                <th>Client</th>
                <th>Date</th>
                <th>Paiement</th>
                <th>Total TTC</th>
                <th>Statut Actuel</th>
                <th className="action-th">Modifier le Statut</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.map(ord => (
                <tr key={ord.id} className={actionLoading === ord.id ? "row-updating" : ""}>
                  <td className="font-bold">#{ord.id}</td>
                  <td className="font-mono">{ord.reference || "N/A"}</td>
                  <td>
                    <div className="client-info">
                      <span className="client-name">{ord.customerName}</span>
                      <span className="client-email">{ord.customerEmail}</span>
                    </div>
                  </td>
                  <td>{new Date(ord.date_add).toLocaleDateString()}</td>
                  <td><span className="payment-method">{ord.payment}</span></td>
                  <td className="font-bold text-indigo">{ord.total_paid.toFixed(2)} €</td>
                  <td>{getStatusBadge(ord.current_state)}</td>
                  <td className="action-td">
                    <div className="status-buttons-container">
                      <button
                        onClick={() => handleStatusChange(ord.id, 2)}
                        disabled={actionLoading === ord.id || ord.current_state === 2 || ord.current_state === 5}
                        className="btn-action btn-pay"
                      >
                        Payer
                      </button>
                      <button
                        onClick={() => handleStatusChange(ord.id, 5)}
                        disabled={actionLoading === ord.id || ord.current_state === 5 || ord.current_state === 6}
                        className="btn-action btn-deliver"
                      >
                        Livrer
                      </button>
                      <button
                        onClick={() => handleStatusChange(ord.id, 6)}
                        disabled={actionLoading === ord.id || ord.current_state === 5 || ord.current_state === 6}
                        className="btn-action btn-cancel"
                      >
                        Annuler
                      </button>
                      {actionLoading === ord.id && <div className="small-spinner"></div>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default OrderManagement;
