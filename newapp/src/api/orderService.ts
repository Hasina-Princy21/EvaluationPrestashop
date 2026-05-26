import axios from "axios";

const BASE_URL = "/api/orders";
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

export type OrderRow = {
    product_id: number;
    product_attribute_id?: number;
    product_quantity: number;
    product_name?: string;
    product_reference?: string;
    product_price?: number;
    unit_price_tax_incl?: number;
    unit_price_tax_excl?: number;
    id_customization?: number;
}

export type OrderPayload = {
    id_address_delivery: number;
    id_address_invoice: number;
    id_cart: number;
    id_currency: number;
    id_lang: number;
    id_customer: number;
    id_carrier: number;
    id_shop_group?: number;
    id_shop?: number;
    current_state?: number;
    module: string;
    payment: string;
    total_paid: number;
    total_paid_real?: number;
    total_products: number;
    total_products_wt: number;
    total_paid_tax_incl?: number;
    total_paid_tax_excl?: number;
    total_shipping?: number;
    total_shipping_tax_incl?: number;
    total_shipping_tax_excl?: number;
    valid?: number;
    conversion_rate?: number;
    secure_key?: string;
    module_name?: string;
    associations?: {
        order_rows: OrderRow[];
    };
}

const buildOrderXml = (orderData: OrderPayload) => {
    const idAddressDelivery = orderData.id_address_delivery;
    const idAddressInvoice = orderData.id_address_invoice;
    const idCart = orderData.id_cart;
    const idCurrency = orderData.id_currency;
    const idLang = orderData.id_lang;
    const idCustomer = orderData.id_customer;
    const idCarrier = orderData.id_carrier;
    const idShopGroup = orderData.id_shop_group ?? 0;
    const idShop = orderData.id_shop ?? 1;
    const module = orderData.module_name ?? orderData.module;
    const payment = orderData.payment;
    const totalPaid = orderData.total_paid;
    const totalPaidReal = orderData.total_paid_real ?? totalPaid;
    const totalProducts = orderData.total_products;
    const totalProductsWt = orderData.total_products_wt;
    const totalPaidTaxIncl = orderData.total_paid_tax_incl ?? totalPaid;
    const totalPaidTaxExcl = orderData.total_paid_tax_excl ?? totalProducts;
    const totalShipping = orderData.total_shipping ?? 0;
    const totalShippingTaxIncl = orderData.total_shipping_tax_incl ?? totalShipping;
    const totalShippingTaxExcl = orderData.total_shipping_tax_excl ?? totalShipping;
    const valid = orderData.valid ?? 1;
    const conversionRate = orderData.conversion_rate ?? 1;
    const currentState = orderData.current_state ?? 2;
    const secureKey = orderData.secure_key?.trim() || "";

    let orderRowsXml = "";
    if (orderData.associations?.order_rows && orderData.associations.order_rows.length > 0) {
        orderRowsXml = orderData.associations.order_rows.map(row => `
        <order_row>
            <product_id><![CDATA[${row.product_id}]]></product_id>
            <product_attribute_id><![CDATA[${row.product_attribute_id ?? 0}]]></product_attribute_id>
            <product_quantity><![CDATA[${row.product_quantity}]]></product_quantity>
            <product_name><![CDATA[${row.product_name ?? ""}]]></product_name>
            <product_reference><![CDATA[${row.product_reference ?? ""}]]></product_reference>
            <product_price><![CDATA[${row.product_price ?? 0}]]></product_price>
            <unit_price_tax_incl><![CDATA[${row.unit_price_tax_incl ?? 0}]]></unit_price_tax_incl>
            <unit_price_tax_excl><![CDATA[${row.unit_price_tax_excl ?? 0}]]></unit_price_tax_excl>
            <id_customization><![CDATA[${row.id_customization ?? 0}]]></id_customization>
        </order_row>`).join('');
    }

    return `<?xml version="1.0" encoding="UTF-8"?>

<prestashop xmlns:xlink="http://www.w3.org/1999/xlink">
<order>
    <id_address_delivery><![CDATA[${idAddressDelivery}]]></id_address_delivery>
    <id_address_invoice><![CDATA[${idAddressInvoice}]]></id_address_invoice>
    <id_cart><![CDATA[${idCart}]]></id_cart>
    <id_currency><![CDATA[${idCurrency}]]></id_currency>
    <id_lang><![CDATA[${idLang}]]></id_lang>
    <id_customer><![CDATA[${idCustomer}]]></id_customer>
    <id_carrier><![CDATA[${idCarrier}]]></id_carrier>
    <id_shop_group><![CDATA[${idShopGroup}]]></id_shop_group>
    <id_shop><![CDATA[${idShop}]]></id_shop>
    <current_state><![CDATA[${currentState}]]></current_state>
    <module><![CDATA[${module}]]></module>
    <payment><![CDATA[${payment}]]></payment>
    <total_paid><![CDATA[${totalPaid}]]></total_paid>
    <total_paid_real><![CDATA[${totalPaidReal}]]></total_paid_real>
    <total_products><![CDATA[${totalProducts}]]></total_products>
    <total_products_wt><![CDATA[${totalProductsWt}]]></total_products_wt>
    <total_paid_tax_incl><![CDATA[${totalPaidTaxIncl}]]></total_paid_tax_incl>
    <total_paid_tax_excl><![CDATA[${totalPaidTaxExcl}]]></total_paid_tax_excl>
    <total_shipping><![CDATA[${totalShipping}]]></total_shipping>
    <total_shipping_tax_incl><![CDATA[${totalShippingTaxIncl}]]></total_shipping_tax_incl>
    <total_shipping_tax_excl><![CDATA[${totalShippingTaxExcl}]]></total_shipping_tax_excl>
    <valid><![CDATA[${valid}]]></valid>
    <conversion_rate><![CDATA[${conversionRate}]]></conversion_rate>
    <round_mode><![CDATA[2]]></round_mode>
    <round_type><![CDATA[1]]></round_type>
    ${secureKey ? `<secure_key><![CDATA[${secureKey}]]></secure_key>` : ""}
    <associations>
        <order_rows nodeType="order_row" virtualEntity="true">
            ${orderRowsXml}
        </order_rows>
    </associations>
</order>
</prestashop>`;
};

const OrderService = {
    // GET ALL ORDERS
    getAll: async () => {
        const response = await api.get(`${BASE_URL}?display=full`);
        return response.data.orders;
    },

    getByCartId: async (cartId: number) => {
        const response = await api.get(`${BASE_URL}?display=full&filter[id_cart]=${cartId}`);
        return response.data.orders || [];
    },
    
    getByCustomer: async (customerId: number) => {
        const response = await api.get(`${BASE_URL}?display=full&filter[id_customer]=${customerId}`);
        return response.data.orders || [];
    },

    // GET ORDER BY ID
    getById: async (orderId: number) => {
        const response = await api.get(`${BASE_URL}/${orderId}`);
        return response.data.order;
    },

    // CREATE ORDER
    create: async (orderData: OrderPayload) => {
        const xmlPayload = buildOrderXml(orderData);
        console.debug("OrderService.create XML:", xmlPayload);
        try {
            const response = await apiXml.post(`${BASE_URL}`, xmlPayload);
            return response.data;
        } catch (err: any) {
            console.error("Order create failed. status:", err?.response?.status);
            console.error("Order create response headers:", err?.response?.headers);
            console.error("Order create response data:", err?.response?.data);
            console.error("Order create XML payload:", xmlPayload);
            throw err;
        }
    },

    // UPDATE ORDER
    update: async (orderId: number, orderData: OrderPayload) => {
        const xmlPayload = buildOrderXml(orderData);
        const response = await apiXml.put(`${BASE_URL}/${orderId}`, xmlPayload);
        return response.data;
    },

    // FORCE UPDATE ORDER TOTALS (PUT) after PrestaShop auto-calculates to 0
    updateTotals: async (orderId: number, totals: {
        total_paid: number;
        total_paid_real: number;
        total_products: number;
        total_products_wt: number;
        total_paid_tax_incl: number;
        total_paid_tax_excl: number;
    }, context?: {
        id_address_delivery?: number;
        id_address_invoice?: number;
        id_cart?: number;
        id_currency?: number;
        id_lang?: number;
        id_customer?: number;
        id_carrier?: number;
    }) => {
        const t = (v: number) => Number(v.toFixed(6));
        try {
            // Récupérer la commande existante pour obtenir les champs requis
            const existingRes = await api.get(`${BASE_URL}/${orderId}`);
            const existingOrder = existingRes.data?.order || existingRes.data;
            if (!existingOrder) {
                console.warn('updateTotals: commande introuvable', orderId);
                return;
            }

            // Helper pour extraire un ID même si la réponse API enveloppe la valeur
            const extractId = (obj: any) => {
                if (!obj && obj !== 0) return 0;
                if (typeof obj === 'number') return obj;
                if (typeof obj === 'string') return parseInt(obj, 10) || 0;
                if (typeof obj === 'object') {
                    // PrestaShop JSON peut envelopper les champs: { "id": "123" } ou { "#cdata-section": "123" }
                    if (obj.id) return parseInt(obj.id, 10) || 0;
                    if (obj.value) return parseInt(obj.value, 10) || 0;
                    if (obj['#cdata-section']) return parseInt(obj['#cdata-section'], 10) || 0;
                    if (obj['#text']) return parseInt(obj['#text'], 10) || 0;
                    // fallback: try to convert whole object to string
                    const s = String(obj);
                    return parseInt(s.replace(/[^0-9]/g, ''), 10) || 0;
                }
                return 0;
            };

            // Prefer context values when provided (caller knows the ids at creation time)
            let idAddressDelivery = context?.id_address_delivery ?? (extractId(existingOrder.id_address_delivery) || extractId(existingOrder.id_address_invoice) || 0);
            let idAddressInvoice = context?.id_address_invoice ?? (extractId(existingOrder.id_address_invoice) || idAddressDelivery || 0);
            const idCart = context?.id_cart ?? (extractId(existingOrder.id_cart) || 0);
            const idCurrency = context?.id_currency ?? (extractId(existingOrder.id_currency) || 1);
            const idLang = context?.id_lang ?? (extractId(existingOrder.id_lang) || 1);
            const idCustomer = context?.id_customer ?? (extractId(existingOrder.id_customer) || 0);
            const idCarrier = context?.id_carrier ?? (extractId(existingOrder.id_carrier) || 0);

            // Si on n'a toujours pas d'adresse de livraison, tenter de récupérer la première adresse du client
            if (!idAddressDelivery && idCustomer) {
                try {
                    const addrRes = await api.get(`/api/addresses?display=full&filter[id_customer]=${idCustomer}`);
                    const addresses = addrRes.data?.addresses || addrRes.data || [];
                    const addArr = Array.isArray(addresses) ? addresses : [addresses];
                    if (addArr.length > 0) {
                        idAddressDelivery = extractId(addArr[0].id) || extractId(addArr[0].id_address) || idAddressDelivery;
                        idAddressInvoice = idAddressInvoice || idAddressDelivery;
                    }
                } catch (addrErr) {
                    const a: any = addrErr;
                    console.warn('updateTotals: impossible de récupérer les adresses du client', a?.response?.data || a?.message || a);
                }
            }

            const moduleName = existingOrder.module || 'ps_wirepayment';
            const paymentName = existingOrder.payment || moduleName;
            const currentState = existingOrder.current_state || 2;
            const idShopGroup = existingOrder.id_shop_group || existingOrder.id_shop_group_id || 0;
            const idShop = existingOrder.id_shop || 1;
            const secureKey = existingOrder.secure_key || existingOrder.securekey || '';
            const roundMode = existingOrder.round_mode ?? 2;
            const roundType = existingOrder.round_type ?? 1;

            const xmlPayload = `<?xml version="1.0" encoding="UTF-8"?>
<prestashop xmlns:xlink="http://www.w3.org/1999/xlink">
<order>
    <id><![CDATA[${orderId}]]></id>
    <id_address_delivery><![CDATA[${idAddressDelivery}]]></id_address_delivery>
    <id_address_invoice><![CDATA[${idAddressInvoice}]]></id_address_invoice>
    <id_cart><![CDATA[${idCart}]]></id_cart>
    <id_currency><![CDATA[${idCurrency}]]></id_currency>
    <id_lang><![CDATA[${idLang}]]></id_lang>
    <id_customer><![CDATA[${idCustomer}]]></id_customer>
    <id_carrier><![CDATA[${idCarrier}]]></id_carrier>
    <id_shop_group><![CDATA[${idShopGroup}]]></id_shop_group>
    <id_shop><![CDATA[${idShop}]]></id_shop>
    <current_state><![CDATA[${currentState}]]></current_state>
    <module><![CDATA[${moduleName}]]></module>
    <payment><![CDATA[${paymentName}]]></payment>
    <total_paid><![CDATA[${t(totals.total_paid)}]]></total_paid>
    <total_paid_real><![CDATA[${t(totals.total_paid_real)}]]></total_paid_real>
    <total_products><![CDATA[${t(totals.total_products)}]]></total_products>
    <total_products_wt><![CDATA[${t(totals.total_products_wt)}]]></total_products_wt>
    <total_paid_tax_incl><![CDATA[${t(totals.total_paid_tax_incl)}]]></total_paid_tax_incl>
    <total_paid_tax_excl><![CDATA[${t(totals.total_paid_tax_excl)}]]></total_paid_tax_excl>
    <total_shipping><![CDATA[0]]></total_shipping>
    <total_shipping_tax_incl><![CDATA[0]]></total_shipping_tax_incl>
    <total_shipping_tax_excl><![CDATA[0]]></total_shipping_tax_excl>
    <valid><![CDATA[1]]></valid>
    <conversion_rate><![CDATA[1]]></conversion_rate>
    <round_mode><![CDATA[${roundMode}]]></round_mode>
    <round_type><![CDATA[${roundType}]]></round_type>
    ${secureKey ? `<secure_key><![CDATA[${secureKey}]]></secure_key>` : ''}
</order>
</prestashop>`;

            console.debug('OrderService.updateTotals XML:', xmlPayload);
            const response = await apiXml.put(`${BASE_URL}/${orderId}`, xmlPayload);
            return response.data;
        } catch (err: any) {
            console.warn('updateTotals failed (non-critical):', err?.response?.data || err?.message);
        }
    },

    // UPDATE ORDER STATE VIA ORDER HISTORY
    updateState: async (orderId: number, stateId: number) => {
        const xmlPayload = `<?xml version="1.0" encoding="UTF-8"?>
<prestashop xmlns:xlink="http://www.w3.org/1999/xlink">
<order_history>
    <id_order><![CDATA[${orderId}]]></id_order>
    <id_order_state><![CDATA[${stateId}]]></id_order_state>
</order_history>
</prestashop>`;
        const response = await apiXml.post(`/api/order_histories`, xmlPayload);
        return response.data;
    },

    // DELETE ORDER
    delete: async (orderId: number) => {
        const response = await apiXml.delete(`${BASE_URL}/${orderId}`);
        return response.data;
    },

    // RESET ORDERS DATA
    resetData: async function() {
        try {
            const orders = await OrderService.getAll();
            if (orders && orders.length > 0) {
                await Promise.all(
                    orders.map(async (ord: { id: number }) => {
                        try {
                            await OrderService.delete(ord.id);
                        } catch (e) {
                            console.error(`Error deleting order ${ord.id}:`, e);
                        }
                    })
                );
            }
        } catch (error) {
            console.error('Error resetting orders data:', error);
        }
    },

    // GET ALL ORDER STATES (id -> name mapping)
    getOrderStates: async () => {
        const response = await api.get(`/api/order_states?display=full`);
        return response.data.order_states || [];
    }
};
export default OrderService;
