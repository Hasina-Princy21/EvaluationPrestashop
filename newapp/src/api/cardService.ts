import axios from "axios";
import { XMLParser } from "fast-xml-parser";

const BASE_URL = "/api/carts";
const API_KEY = "A9IBmZ4Ake4NJ36RPAjSJ8sVsLxQ4CGn";

const api = axios.create({
    auth: {
        username: API_KEY,
        password: "",
    },
    params: {
        output_format: 'JSON',
        ws_key: API_KEY
    }
});

const apiXml = axios.create({
    auth: {
        username: API_KEY,
        password: "",
    },
    params: {
        output_format: "JSON",
        ws_key: API_KEY
    },
    headers: {
        "Content-Type": "application/xml"
    }
});

const xmlParser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: ""
});

const extractEntityId = (data: any, entityName: "cart") => {
    const directId = data?.[entityName]?.id ?? data?.id;
    if (directId !== undefined && directId !== null) {
        const parsed = parseInt(String(directId), 10);
        if (!Number.isNaN(parsed)) return parsed;
    }

    if (typeof data === "string") {
        try {
            const parsedXml = xmlParser.parse(data);
            const entity = parsedXml?.prestashop?.[entityName];
            const entityId = entity?.id ?? parsedXml?.prestashop?.id;
            const parsed = parseInt(String(entityId), 10);
            if (!Number.isNaN(parsed)) return parsed;
        } catch (error) {
            console.warn(`Unable to parse ${entityName} response as XML`, error);
        }
    }

    return null;
};

export type CartRow = {
    id_product: number;
    id_product_attribute?: number;
    id_address_delivery?: number;
    id_customization?: number;
    quantity: number;
}

export type CartPayload = {
    id_customer: number;
    id_currency: number;
    id_lang: number;
    id_address_delivery?: number;
    id_address_invoice?: number;
    id_carrier?: number;
    associations?: {
        cart_rows: CartRow[];
    };
}

const buildCartXml = (cartData: CartPayload & { id?: number }) => {
    const idCustomer = cartData.id_customer;
    const idCurrency = cartData.id_currency ?? 1;
    const idLang = cartData.id_lang ?? 1;
    const idAddressDelivery = cartData.id_address_delivery ?? 0;
    const idAddressInvoice = cartData.id_address_invoice ?? 0;
    const idCarrier = cartData.id_carrier ?? 0;

    let cartRowsXml = "";
    if (cartData.associations?.cart_rows && cartData.associations.cart_rows.length > 0) {
        cartRowsXml = cartData.associations.cart_rows.map(row => `
        <cart_row>
            <id_product><![CDATA[${row.id_product}]]></id_product>
            <id_product_attribute><![CDATA[${row.id_product_attribute ?? 0}]]></id_product_attribute>
            <id_address_delivery><![CDATA[${row.id_address_delivery ?? idAddressDelivery}]]></id_address_delivery>
            <id_customization><![CDATA[${row.id_customization ?? 0}]]></id_customization>
            <quantity><![CDATA[${row.quantity}]]></quantity>
        </cart_row>`).join('');
    }

    const idTag = cartData.id ? `<id><![CDATA[${cartData.id}]]></id>` : "";

    return `<?xml version="1.0" encoding="UTF-8"?>
<prestashop xmlns:xlink="http://www.w3.org/1999/xlink">
<cart>
    ${idTag}
    <id_address_delivery><![CDATA[${idAddressDelivery}]]></id_address_delivery>
    <id_address_invoice><![CDATA[${idAddressInvoice}]]></id_address_invoice>
    <id_currency><![CDATA[${idCurrency}]]></id_currency>
    <id_customer><![CDATA[${idCustomer}]]></id_customer>
    <id_lang><![CDATA[${idLang}]]></id_lang>
    <id_carrier><![CDATA[${idCarrier}]]></id_carrier>
    <associations>
        <cart_rows nodeType="cart_row" virtualEntity="true">
            ${cartRowsXml}
        </cart_rows>
    </associations>
</cart>
</prestashop>`;
};

const CardService = {
    // GET ALL CARTS
    getAll: async () => {
        const response = await api.get(`${BASE_URL}?display=full`);
        return response.data.carts;
    },

    getByCustomer: async (customerId: number) => {
        const response = await api.get(`${BASE_URL}?display=full&filter[id_customer]=${customerId}&sort=[id_DESC]`);
        return response.data.carts || [];
    },

    // GET CART BY ID
    getById: async (cartId: number) => {
        const response = await api.get(`${BASE_URL}/${cartId}`);
        return response.data.cart;
    },

    // CREATE CART
    create: async (cartData: CartPayload) => {
        const xmlPayload = buildCartXml(cartData);
        const response = await apiXml.post(`${BASE_URL}`, xmlPayload);
        const cartId = extractEntityId(response.data, "cart");
        return cartId ? { cart: { id: cartId }, raw: response.data } : response.data;
    },

    // UPDATE CART
    update: async (cartId: number, cartData: CartPayload) => {
        const xmlPayload = buildCartXml({ ...cartData, id: cartId });
        const response = await apiXml.put(`${BASE_URL}/${cartId}`, xmlPayload);
        const updatedCartId = extractEntityId(response.data, "cart");
        return updatedCartId ? { cart: { id: updatedCartId }, raw: response.data } : response.data;
    },

    // DELETE CART
    delete: async (cartId: number) => {
        const response = await apiXml.delete(`${BASE_URL}/${cartId}`);
        return response.data;
    },

    // RESET CARTS DATA
    resetData: async function () {
        try {
            const carts = await CardService.getAll();
            if (carts && carts.length > 0) {
                await Promise.all(
                    carts.map((cart: { id: number }) => CardService.delete(cart.id))
                );
            }
        } catch (error) {
            console.error('Error resetting carts data:', error);
        }
    }
};

export default CardService;