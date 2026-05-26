import axios from "axios";

const BASE_URL = "/api/stock_availables";
const API_KEY = "A9IBmZ4Ake4NJ36RPAjSJ8sVsLxQ4CGn";

const api = axios.create({
    auth: {
        username: API_KEY,
        password: "",
    },
    params:{
        output_format: 'JSON',
        ws_key: API_KEY
    }
});

const apiXml = axios.create({
    auth: {
        username: API_KEY,
        password: "",
    },
    params:{
        output_format: "JSON",
        ws_key: API_KEY
    },
    headers:{
        "Content-Type": "application/xml"
    }
});

export type StockAvailablePayload = {
    id?: number;
    id_product?: number;
    id_product_attribute?: number;
    id_shop?: number;
    id_shop_group?: number;
    quantity: number;
    out_of_stock?: number;
    depends_on_stock?: number;
}

const normalizeStockList = (stockAvailables: any): any[] => {
    if (!stockAvailables) return [];
    return Array.isArray(stockAvailables) ? stockAvailables : [stockAvailables];
};

const pickPreferredStock = (stockList: any[]): any | null => {
    if (!stockList || stockList.length === 0) return null;

    const exactShop = stockList.find((s: any) => Number(s.id_shop) === 1 && Number(s.id_shop_group) === 0);
    if (exactShop) return exactShop;

    const shopOnly = stockList.find((s: any) => Number(s.id_shop) === 1);
    if (shopOnly) return shopOnly;

    return stockList[0] || null;
};

const buildStockAvailableXml = (stockData: StockAvailablePayload) => {
    const idXml = stockData.id !== undefined ? `<id><![CDATA[${stockData.id}]]></id>` : "";
    const idProductXml = stockData.id_product !== undefined ? `<id_product><![CDATA[${stockData.id_product}]]></id_product>` : "";
    const idProductAttrXml = stockData.id_product_attribute !== undefined ? `<id_product_attribute><![CDATA[${stockData.id_product_attribute}]]></id_product_attribute>` : "";
    const idShopXml = `<id_shop><![CDATA[${stockData.id_shop ?? 1}]]></id_shop>`;
    const idShopGroupXml = `<id_shop_group><![CDATA[${stockData.id_shop_group ?? 0}]]></id_shop_group>`;
    const outOfStockXml = `<out_of_stock><![CDATA[${stockData.out_of_stock ?? 2}]]></out_of_stock>`;
    const dependsOnStockXml = `<depends_on_stock><![CDATA[${stockData.depends_on_stock ?? 0}]]></depends_on_stock>`;

    return `<?xml version="1.0" encoding="UTF-8"?>
<prestashop xmlns:xlink="http://www.w3.org/1999/xlink">
<stock_available>
    ${idXml}
    <quantity><![CDATA[${stockData.quantity}]]></quantity>
    ${idProductXml}
    ${idProductAttrXml}
    ${idShopXml}
    ${idShopGroupXml}
    ${outOfStockXml}
    ${dependsOnStockXml}
</stock_available>
</prestashop>`;
};

const StockAvailableService = {
    // GET ALL STOCK_AVAILABLES
    getAll: async () => {
        const response = await api.get(`${BASE_URL}?display=full`);
        return response.data.stock_availables;
    },

    // GET STOCK_AVAILABLE BY ID
    getById: async (stockId: number) => {
        const response = await api.get(`${BASE_URL}/${stockId}`);
        return response.data.stock_available;
    },

    // GET STOCK BY PRODUCT ID
    getByProductId: async (productId: number) => {
        const response = await api.get(`${BASE_URL}?filter[id_product]=${productId}&filter[id_shop]=1&display=full`);
        const stockList = normalizeStockList(response.data?.stock_availables);
        return pickPreferredStock(stockList);
    },

    getByProductAndAttribute: async (productId: number, productAttributeId: number = 0) => {
        const response = await api.get(
            `${BASE_URL}?filter[id_product]=${productId}&filter[id_product_attribute]=${productAttributeId}&filter[id_shop]=1&display=full`
        );
        const stockList = normalizeStockList(response.data?.stock_availables);
        return pickPreferredStock(stockList);
    },

    // CREATE STOCK_AVAILABLE
    create: async (stockData: Omit<StockAvailablePayload, "id">) => {
        const xmlPayload = buildStockAvailableXml(stockData);
        const response = await apiXml.post(`${BASE_URL}`, xmlPayload);
        return response.data;
    },

    upsert: async (stockData: Omit<StockAvailablePayload, "id"> & { id?: number }) => {
        const sanitizedQuantity = Math.max(0, Number(stockData.quantity) || 0);
        const normalizedData = {
            ...stockData,
            quantity: sanitizedQuantity,
            id_shop: stockData.id_shop ?? 1,
            id_shop_group: stockData.id_shop_group ?? 0,
        };

        if (stockData.id) {
            return StockAvailableService.update(stockData.id, {
                ...normalizedData,
                id: stockData.id,
            });
        }

        const existing = await StockAvailableService.getByProductAndAttribute(
            normalizedData.id_product ?? 0,
            normalizedData.id_product_attribute ?? 0
        );

        if (existing?.id) {
            return StockAvailableService.update(existing.id, {
                ...normalizedData,
                id: existing.id,
            });
        }

        return StockAvailableService.create(normalizedData);
    },

    // UPDATE STOCK_AVAILABLE
    update: async (stockId: number, stockData: StockAvailablePayload) => {
        const xmlPayload = buildStockAvailableXml(stockData);
        const response = await apiXml.put(`${BASE_URL}/${stockId}`, xmlPayload);
        return response.data;
    },

    delete: async (stockId: number) => {
        const response = await api.delete(`${BASE_URL}/${stockId}`);
        return response.data;
    }
};

export default StockAvailableService;
