import { useEffect, useState } from "react";
import OrderService from "../api/orderService";
import "./backoffice.css";

const BackOffice = () => {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const fetchedOrders = await OrderService.getAll();
        const ordersArray = Array.isArray(fetchedOrders) ? fetchedOrders : [fetchedOrders];
        setOrders(ordersArray.filter(Boolean));
      } catch (error) {
        console.error("Error fetching orders for dashboard", error);
      } finally {
        setLoading(false);
      }
    };
    fetchOrders();
  }, []);

  // Calculate stats
  const statsByDay: Record<string, { count: number; total: number }> = {};
  let grandTotalCount = 0;
  let grandTotalAmount = 0;

  orders.forEach((order) => {
    // order.date_add format is typically "YYYY-MM-DD HH:MM:SS"
    const dateStr = order.date_add ? order.date_add.split(" ")[0] : "Inconnu";
    const amount = parseFloat(order.total_paid) || 0;

    if (!statsByDay[dateStr]) {
      statsByDay[dateStr] = { count: 0, total: 0 };
    }
    statsByDay[dateStr].count += 1;
    statsByDay[dateStr].total += amount;

    grandTotalCount += 1;
    grandTotalAmount += amount;
  });

  // Sort dates descending
  const sortedDates = Object.keys(statsByDay).sort((a, b) => b.localeCompare(a));

  return (
    <div className="dashboard-container">
      <h1 className="dashboard-title">Tableau de Bord</h1>

      {loading ? (
        <div className="loading-spinner">Chargement des données...</div>
      ) : (
        <>
          <div className="kpi-cards">
            <div className="kpi-card total-card">
              <h3>Total Général (Commandes)</h3>
              <p className="kpi-value">{grandTotalCount}</p>
            </div>
            <div className="kpi-card total-amount-card">
              <h3>Chiffre d'Affaires Total</h3>
              <p className="kpi-value">{grandTotalAmount.toFixed(2)} €</p>
            </div>
          </div>

          <div className="dashboard-section">
            <h2>Statistiques par Jour</h2>
            {sortedDates.length === 0 ? (
              <p>Aucune commande trouvée.</p>
            ) : (
              <div className="table-responsive">
                <table className="dashboard-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Nombre de commandes</th>
                      <th>Montant Total (€)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedDates.map((date) => (
                      <tr key={date}>
                        <td>{date}</td>
                        <td>{statsByDay[date].count}</td>
                        <td className="amount-cell">{statsByDay[date].total.toFixed(2)} €</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default BackOffice;
