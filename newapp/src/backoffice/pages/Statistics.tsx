import { useEffect, useState } from "react";
import OrderService from "../../api/orderService";
import ProductService from "../../api/productService";
import CategoryService from "../../api/categoryService";
import StockAvailableService from "../../api/stock_availableService";
import "./Statistics.css";

type CategoryStat = {
  id: number;
  name: string;
  profit: number;
  qtyPhysical: number;
  qtyReserved: number;
  qtyAvailable: number;
};

type DailyStat = {
  date: string;
  orderCount: number;
  revenue: number;
};

const Statistics = () => {
  const [totalSales, setTotalSales] = useState<number>(0);
  const [totalPurchases, setTotalPurchases] = useState<number>(0);
  const [categoryStats, setCategoryStats] = useState<CategoryStat[]>([]);
  const [dailyStats, setDailyStats] = useState<DailyStat[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [ordersRes, productsRes, categoriesRes, stocksRes] = await Promise.all([
          OrderService.getAll(),
          ProductService.getAll(),
          CategoryService.getAll(),
          StockAvailableService.getAll()
        ]);

        const orders = Array.isArray(ordersRes) ? ordersRes : [ordersRes].filter(Boolean);
        const products = Array.isArray(productsRes) ? productsRes : [productsRes].filter(Boolean);
        const categories = Array.isArray(categoriesRes) ? categoriesRes : [categoriesRes].filter(Boolean);
        const stocks = Array.isArray(stocksRes) ? stocksRes : [stocksRes].filter(Boolean);

        // 1. Calculate Total Sales (HT)
        let salesHT = 0;
        const validOrderIds = new Set<string>();
        orders.forEach((o: any) => {
          // Consider valid if current_state != 6 (Canceled) and != 8 (Payment error) - approximate business logic
          const state = parseInt(o.current_state);
          if (state !== 6 && state !== 8) {
            salesHT += parseFloat(o.total_paid_tax_excl) || 0;
            validOrderIds.add(o.id.toString());
          }
        });
        setTotalSales(salesHT);

        // Map product data
        const productMap = new Map<string, any>();
        products.forEach((p: any) => {
          productMap.set(p.id.toString(), p);
        });

        // 2. Calculate Total Purchases (HT) -> COGS (Cost of goods sold)
        // AND build reserved quantities
        let purchasesHT = 0;
        const reservedQtyByProduct = new Map<string, number>();
        const salesByProduct = new Map<string, number>();

        for (const order of orders) {
          const state = parseInt(order.current_state);
          const isCanceled = state === 6;
          const isDelivered = state === 5 || state === 4; // 5 = delivered, 4 = shipped
          
          const orderRows = order.associations?.order_rows || [];
          const rowsArray = Array.isArray(orderRows) ? orderRows : [orderRows];

          for (const row of rowsArray) {
            if (!row || !row.product_id) continue;
            const pid = row.product_id.toString();
            const qty = parseInt(row.product_quantity) || 0;

            if (!isCanceled) {
              // Add to COGS
              const product = productMap.get(pid);
              const wholesalePrice = parseFloat(product?.wholesale_price) || 0;
              purchasesHT += (wholesalePrice * qty);
              
              // Add to sales for profit calculation
              const priceHT = parseFloat(row.unit_price_tax_excl) || 0;
              salesByProduct.set(pid, (salesByProduct.get(pid) || 0) + (priceHT * qty));
            }

            // If not delivered and not canceled, it's reserved
            if (!isDelivered && !isCanceled) {
              reservedQtyByProduct.set(pid, (reservedQtyByProduct.get(pid) || 0) + qty);
            }
          }
        }
        setTotalPurchases(purchasesHT);

        // Map stocks
        const availableQtyByProduct = new Map<string, number>();
        stocks.forEach((s: any) => {
           if (s.id_product) {
              availableQtyByProduct.set(s.id_product.toString(), parseInt(s.quantity) || 0);
           }
        });

        // 3. Aggregate by Category
        const catMap = new Map<number, CategoryStat>();
        
        categories.forEach((c: any) => {
          let name = c.name;
          if (Array.isArray(name)) {
             const frEntry = name.find((n: any) => n.id === '1' || n.id === 1);
             name = frEntry?.value || name[0]?.value || name;
          } else if (typeof name === 'object') {
             name = Object.values(name)[0] || '';
          }
          
          if (c.id > 2) { // Skip Root & Home
             catMap.set(parseInt(c.id), {
               id: parseInt(c.id),
               name: name || `Catégorie ${c.id}`,
               profit: 0,
               qtyPhysical: 0,
               qtyReserved: 0,
               qtyAvailable: 0
             });
          }
        });

        // Process products to populate category stats
        products.forEach((p: any) => {
           const pid = p.id.toString();
           const catId = parseInt(p.id_category_default);
           
           const stat = catMap.get(catId);
           if (stat) {
              const qtyPhys = availableQtyByProduct.get(pid) || 0;
               const qtyReserved = reservedQtyByProduct.get(pid) || 0;
               const qtyAvail = Math.max(0, qtyPhys - qtyReserved);
               
               stat.qtyAvailable += qtyAvail;
               stat.qtyReserved += qtyReserved;
               stat.qtyPhysical += qtyPhys;
              
              const wholesalePrice = parseFloat(p.wholesale_price) || 0;
              
              // Profit = Sales - Purchases for this product
              // Since salesByProduct has the total sales amount HT for this product
              const totalSalesForProduct = salesByProduct.get(pid) || 0;
              
              // We need to know how many were sold to calculate the cost
              let qtySold = 0;
              orders.forEach((o: any) => {
                 if (parseInt(o.current_state) !== 6) {
                    const rows = Array.isArray(o.associations?.order_rows) ? o.associations.order_rows : (o.associations?.order_rows ? [o.associations.order_rows] : []);
                    rows.forEach((r: any) => {
                       if (r.product_id?.toString() === pid) {
                          qtySold += parseInt(r.product_quantity) || 0;
                       }
                    });
                 }
              });
              
              const totalCostForProduct = wholesalePrice * qtySold;
              stat.profit += (totalSalesForProduct - totalCostForProduct);
           }
        });

        const catStatsArray = Array.from(catMap.values());
        setCategoryStats(catStatsArray);

        // 4. Aggregate by Day
        const dailyMap = new Map<string, DailyStat>();
        orders.forEach((o: any) => {
          const state = parseInt(o.current_state);
          if (state !== 6 && state !== 8) { // Consider valid if not canceled or error
             const dateObj = new Date(o.date_add);
             // Use fr-FR locale for consistent display (DD/MM/YYYY)
             const dateStr = dateObj.toLocaleDateString('fr-FR');
             const revenue = parseFloat(o.total_paid_tax_excl) || 0;
             
             if (!dailyMap.has(dateStr)) {
                dailyMap.set(dateStr, { date: dateStr, orderCount: 0, revenue: 0 });
             }
             const stat = dailyMap.get(dateStr)!;
             stat.orderCount += 1;
             stat.revenue += revenue;
          }
        });
        
        const dailyStatsArray = Array.from(dailyMap.values()).sort((a, b) => {
           const [d1, m1, y1] = a.date.split('/');
           const [d2, m2, y2] = b.date.split('/');
           const date1 = new Date(`${y1}-${m1}-${d1}`);
           const date2 = new Date(`${y2}-${m2}-${d2}`);
           return date2.getTime() - date1.getTime(); // Descending (newest first)
        });
        setDailyStats(dailyStatsArray);

      } catch (error) {
        console.error("Error fetching statistics:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  return (
    <div className="statistics-container">
      <h1 className="statistics-title">Statistiques Globales</h1>

      {loading ? (
        <div className="loading-spinner">Calcul des statistiques en cours...</div>
      ) : (
        <>
          <div className="stat-cards">
            <div className="stat-card">
              <h3>Ventes Totales (HT)</h3>
              <p className="stat-value text-blue">{totalSales.toFixed(2)} €</p>
            </div>
            <div className="stat-card">
              <h3>Achats Totaux (HT)</h3>
              <p className="stat-value text-orange">{totalPurchases.toFixed(2)} €</p>
              <small className="stat-subtext">Coût des produits vendus</small>
            </div>
            <div className="stat-card">
              <h3>Bénéfice Brut</h3>
              <p className={`stat-value ${(totalSales - totalPurchases) >= 0 ? 'text-green' : 'text-red'}`}>
                {(totalSales - totalPurchases).toFixed(2)} €
              </p>
            </div>
          </div>

          <div className="statistics-section">
            <h2>Détails par Catégorie</h2>
            <div className="table-responsive">
              <table className="statistics-table">
                <thead>
                  <tr>
                    <th>Catégorie</th>
                    <th className="text-right">Bénéfice</th>
                    <th className="text-right">Qté physique</th>
                    <th className="text-right">Qté reservée</th>
                    <th className="text-right">Qté disponible</th>
                  </tr>
                </thead>
                <tbody>
                  {categoryStats.length === 0 ? (
                     <tr>
                        <td colSpan={5} className="text-center">Aucune donnée disponible</td>
                     </tr>
                  ) : (
                     categoryStats.map((stat) => (
                      <tr key={stat.id}>
                        <td>{stat.name}</td>
                        <td className={`text-right font-semibold ${stat.profit >= 0 ? 'text-green' : 'text-red'}`}>
                          {stat.profit.toFixed(2)} €
                        </td>
                        <td className="text-right font-medium">{stat.qtyPhysical}</td>
                        <td className="text-right text-orange">{stat.qtyReserved}</td>
                        <td className="text-right text-blue font-bold">{stat.qtyAvailable}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="statistics-section" style={{ marginTop: '2rem' }}>
            <h2>Détails par Jour</h2>
            <div className="table-responsive">
              <table className="statistics-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th className="text-right">Nombre de commandes</th>
                    <th className="text-right">Montant généré (HT)</th>
                  </tr>
                </thead>
                <tbody>
                  {dailyStats.length === 0 ? (
                     <tr>
                        <td colSpan={3} className="text-center">Aucune donnée disponible</td>
                     </tr>
                  ) : (
                     dailyStats.map((stat) => (
                      <tr key={stat.date}>
                        <td>{stat.date}</td>
                        <td className="text-right font-medium">{stat.orderCount}</td>
                        <td className="text-right font-semibold text-blue">{stat.revenue.toFixed(2)} €</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default Statistics;
