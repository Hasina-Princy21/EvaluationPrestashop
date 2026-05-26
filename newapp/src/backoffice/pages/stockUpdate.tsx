import { useEffect, useMemo, useState, type FormEvent } from "react";
import { getProducts, type Product } from "../../api/productService";
import StockAvailableService from "../../api/stock_availableService";
import OrderService from "../../api/orderService";
import "./stockUpdate.css";

type StockProduct = Product & { reference?: string };

type OrderSummary = {
    current_state?: number | string;
    date_add?: string;
    associations?: {
        order_rows?: Array<{
            product_id: number | string;
            product_quantity: number | string;
        }>;
    };
};

type StockJournalEntry = {
    id: string;
    productId: number;
    productLabel: string;
    quantity: number;
    date: string;
    source: "manual" | "order";
    note?: string;
};

type DailyStockRow = {
    dateKey: string;
    label: string;
    opening: number;
    added: number;
    sold: number;
    net: number;
    closing: number;
};

const JOURNAL_STORAGE_KEY = "backoffice_stock_journal_v1";

const formatFrenchDate = (dateKey: string) =>
    new Intl.DateTimeFormat("fr-FR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
    }).format(new Date(`${dateKey}T12:00:00`));

const toDateKey = (value: string | Date) => {
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) {
        return new Date().toISOString().slice(0, 10);
    }
    return date.toISOString().slice(0, 10);
};

const getProductLabel = (product: StockProduct) => {
    const reference = String(product.reference || `#${product.id}`);
    return `${reference} - ${product.name}`;
};

const readJournal = (): StockJournalEntry[] => {
    try {
        const raw = localStorage.getItem(JOURNAL_STORAGE_KEY);
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
};

const UpdateStock = () => {
    const [products, setProducts] = useState<Product[]>([]);
    const [orders, setOrders] = useState<OrderSummary[]>([]);
    const [journalEntries, setJournalEntries] = useState<StockJournalEntry[]>(() => readJournal());
    const [selectedProductId, setSelectedProductId] = useState<number | null>(null);
    const [searchTerm, setSearchTerm] = useState("");
    const [quantityToAdd, setQuantityToAdd] = useState(1);
    const [currentStock, setCurrentStock] = useState(0);
    const [stockRecordId, setStockRecordId] = useState<number | null>(null);
    const [loadingProducts, setLoadingProducts] = useState(true);
    const [loadingStock, setLoadingStock] = useState(false);
    const [loadingOrders, setLoadingOrders] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

    useEffect(() => {
        const fetchData = async () => {
            setLoadingProducts(true);
            setLoadingOrders(true);
            try {
                const [productList, orderList] = await Promise.all([
                    getProducts(),
                    OrderService.getAll(),
                ]);

                setProducts(productList || []);
                setOrders(Array.isArray(orderList) ? orderList : []);
                setSelectedProductId((current) => current ?? (productList?.[0]?.id ?? null));
            } catch (err: unknown) {
                setMessage({
                    type: "error",
                    text: err instanceof Error ? err.message : "Impossible de charger les produits ou les commandes.",
                });
            } finally {
                setLoadingProducts(false);
                setLoadingOrders(false);
            }
        };

        fetchData();
    }, []);

    const selectedProduct = useMemo(
        () => products.find((product) => product.id === selectedProductId) || null,
        [products, selectedProductId]
    );

    useEffect(() => {
        const loadStock = async () => {
            if (!selectedProduct) {
                setCurrentStock(0);
                setStockRecordId(null);
                return;
            }

            setLoadingStock(true);
            try {
                const stockRecord = await StockAvailableService.getByProductAndAttribute(selectedProduct.id, 0);
                setCurrentStock(Number(stockRecord?.quantity) || 0);
                setStockRecordId(stockRecord?.id ?? null);
            } catch {
                setCurrentStock(0);
                setStockRecordId(null);
            } finally {
                setLoadingStock(false);
            }
        };

        loadStock();
    }, [selectedProduct]);

    const filteredProducts = useMemo(() => {
        const query = searchTerm.trim().toLowerCase();
        return products.filter((product) => {
            const label = getProductLabel(product).toLowerCase();
            return !query || label.includes(query) || String(product.id).includes(query);
        });
    }, [products, searchTerm]);

    const evolutionRows = useMemo<DailyStockRow[]>(() => {
        if (!selectedProduct) return [];

        const selectedId = selectedProduct.id;
        const additionsByDay = new Map<string, number>();
        const soldByDay = new Map<string, number>();

        journalEntries
            .filter((entry) => entry.productId === selectedId)
            .forEach((entry) => {
                const day = toDateKey(entry.date);
                additionsByDay.set(day, (additionsByDay.get(day) || 0) + entry.quantity);
            });

        orders.forEach((order) => {
            if (Number(order.current_state) !== 5) {
                return;
            }

            const day = toDateKey(order.date_add || new Date());
            const orderRows = order.associations?.order_rows || [];

            orderRows.forEach((row) => {
                if (Number(row.product_id) !== selectedId) {
                    return;
                }
                const qty = Number(row.product_quantity) || 0;
                soldByDay.set(day, (soldByDay.get(day) || 0) + qty);
            });
        });

        const days: string[] = [];
        for (let offset = 6; offset >= 0; offset -= 1) {
            const date = new Date();
            date.setDate(date.getDate() - offset);
            days.push(toDateKey(date));
        }

        let closingBalance = currentStock;
        const rows: DailyStockRow[] = [];

        for (let index = days.length - 1; index >= 0; index -= 1) {
            const day = days[index];
            const added = additionsByDay.get(day) || 0;
            const sold = soldByDay.get(day) || 0;
            const net = added - sold;
            const opening = closingBalance - net;

            rows.unshift({
                dateKey: day,
                label: formatFrenchDate(day),
                opening,
                added,
                sold,
                net,
                closing: closingBalance,
            });

            closingBalance = opening;
        }

        return rows;
    }, [currentStock, journalEntries, orders, selectedProduct]);

    const selectedJournal = useMemo(
        () => journalEntries
            .filter((entry) => entry.productId === selectedProductId)
            .sort((a, b) => b.date.localeCompare(a.date)),
        [journalEntries, selectedProductId]
    );

    const persistJournal = (nextEntries: StockJournalEntry[]) => {
        setJournalEntries(nextEntries);
        localStorage.setItem(JOURNAL_STORAGE_KEY, JSON.stringify(nextEntries));
    };

    const handleAddStock = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        if (!selectedProduct) {
            setMessage({ type: "error", text: "Sélectionnez d'abord un produit." });
            return;
        }

        if (quantityToAdd <= 0) {
            setMessage({ type: "error", text: "La quantité ajoutée doit être positive." });
            return;
        }

        setSaving(true);
        setMessage(null);

        try {
            const stockRow = await StockAvailableService.getByProductAndAttribute(selectedProduct.id, 0);
            const baseQuantity = Number(stockRow?.quantity) || 0;
            const nextQuantity = baseQuantity + quantityToAdd;

            const payload = {
                id_product: selectedProduct.id,
                id_product_attribute: 0,
                id_shop: 1,
                id_shop_group: 0,
                quantity: nextQuantity,
                out_of_stock: 2,
                depends_on_stock: 0,
            };

            if (stockRow?.id) {
                await StockAvailableService.update(stockRow.id, { ...payload, id: stockRow.id });
            } else {
                await StockAvailableService.create(payload);
            }

            setCurrentStock(nextQuantity);
            setStockRecordId(stockRow?.id ?? null);
            setQuantityToAdd(1);

            const nextEntry: StockJournalEntry = {
                id: `${Date.now()}-${selectedProduct.id}`,
                productId: selectedProduct.id,
                productLabel: getProductLabel(selectedProduct),
                quantity: quantityToAdd,
                date: new Date().toISOString(),
                source: "manual",
                note: "Ajout manuel depuis le backoffice",
            };

            const nextJournal = [nextEntry, ...journalEntries];
            persistJournal(nextJournal);
            setMessage({
                type: "success",
                text: `Stock mis à jour avec succès. Nouveau stock: ${nextQuantity}.`,
            });
        } catch (err: unknown) {
            setMessage({
                type: "error",
                text: err instanceof Error ? err.message : "Impossible d'ajouter le stock.",
            });
        } finally {
            setSaving(false);
        }
    };

    const hasLoaded = !loadingProducts && !loadingOrders;

    return (
        <div className="stock-page">
            <section className="stock-hero">
                <div>
                    <p className="stock-eyebrow">Backoffice / Stock</p>
                    <h1>Ajout de stock produit</h1>
                    <p>
                        Sélectionnez un produit, ajoutez une quantité au stock courant, puis consultez son évolution journalière calculée sur les 7 derniers jours.
                    </p>
                </div>

                <div className="stock-hero-card">
                    <span className="hero-label">Produit sélectionné</span>
                    <strong>{selectedProduct ? getProductLabel(selectedProduct) : "Aucun produit"}</strong>
                    <span className="hero-meta">Stock actuel: {loadingStock ? "..." : currentStock}</span>
                </div>
            </section>

            {message && (
                <div className={`stock-alert ${message.type}`}>
                    {message.text}
                </div>
            )}

            <div className="stock-grid">
                <section className="stock-panel stock-selector-panel">
                    <div className="panel-header">
                        <div>
                            <h2>Produits disponibles</h2>
                            <p>Filtrez puis choisissez le produit à approvisionner.</p>
                        </div>
                    </div>

                    <label className="stock-search">
                        <span>Recherche</span>
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="Nom, référence ou ID"
                        />
                    </label>

                    <div className="product-list">
                        {loadingProducts && <div className="loading-state">Chargement des produits...</div>}
                        {!loadingProducts && filteredProducts.length === 0 && (
                            <div className="empty-state">Aucun produit ne correspond à votre recherche.</div>
                        )}
                        {filteredProducts.slice(0, 20).map((product) => (
                            <button
                                key={product.id}
                                type="button"
                                className={`product-item ${selectedProductId === product.id ? "active" : ""}`}
                                onClick={() => setSelectedProductId(product.id)}
                            >
                                <span className="product-item-name">{getProductLabel(product)}</span>
                                <span className="product-item-id">ID {product.id}</span>
                            </button>
                        ))}
                    </div>
                </section>

                <section className="stock-panel stock-form-panel">
                    <div className="panel-header">
                        <div>
                            <h2>Ajouter au stock</h2>
                            <p>Le stock est ajouté au niveau du produit sélectionné.</p>
                        </div>
                    </div>

                    <form className="stock-form" onSubmit={handleAddStock}>
                        <label>
                            <span>Quantité à ajouter</span>
                            <input
                                type="number"
                                min="1"
                                step="1"
                                value={quantityToAdd}
                                onChange={(e) => setQuantityToAdd(Number(e.target.value) || 0)}
                            />
                        </label>

                        <div className="stock-kpis">
                            <div>
                                <span>Stock actuel</span>
                                <strong>{loadingStock ? "..." : currentStock}</strong>
                            </div>
                            <div>
                                <span>Référence stock</span>
                                <strong>{stockRecordId ?? "Nouveau"}</strong>
                            </div>
                        </div>

                        <button className="stock-submit" type="submit" disabled={!hasLoaded || saving || !selectedProduct}>
                            {saving ? "Mise à jour..." : "Ajouter au stock"}
                        </button>
                    </form>

                    <div className="journal-summary">
                        <h3>Derniers mouvements</h3>
                        {selectedJournal.length === 0 ? (
                            <div className="empty-state compact">Aucun mouvement journalisé pour ce produit.</div>
                        ) : (
                            <ul>
                                {selectedJournal.slice(0, 5).map((entry) => (
                                    <li key={entry.id}>
                                        <span>{formatFrenchDate(toDateKey(entry.date))}</span>
                                        <strong>+{entry.quantity}</strong>
                                        <em>{entry.note || entry.source}</em>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </section>
            </div>

            <section className="stock-panel stock-table-panel">
                <div className="panel-header">
                    <div>
                        <h2>Évolution journalière du stock</h2>
                        <p>Calculée à partir du stock courant, des ajouts manuels enregistrés et des commandes livrées.</p>
                    </div>
                </div>

                {evolutionRows.length === 0 ? (
                    <div className="empty-state">Sélectionnez un produit pour afficher son évolution.</div>
                ) : (
                    <div className="table-wrapper">
                        <table className="stock-table">
                            <thead>
                                <tr>
                                    <th>Date</th>
                                    <th>Ouverture</th>
                                    <th>Entrées</th>
                                    <th>Sorties</th>
                                    <th>Net</th>
                                    <th>Clôture</th>
                                </tr>
                            </thead>
                            <tbody>
                                {evolutionRows.map((row) => (
                                    <tr key={row.dateKey}>
                                        <td>{row.label}</td>
                                        <td>{row.opening}</td>
                                        <td className="positive">+{row.added}</td>
                                        <td className="negative">-{row.sold}</td>
                                        <td className={row.net >= 0 ? "positive" : "negative"}>{row.net >= 0 ? `+${row.net}` : row.net}</td>
                                        <td><strong>{row.closing}</strong></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </section>
        </div>
    );
};

export default UpdateStock;