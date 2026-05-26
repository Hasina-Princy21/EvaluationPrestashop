import axios from "axios";
import { XMLParser } from "fast-xml-parser";

const BASE_URL = "/api/products";
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

export type ProductPayload = {
    id_category_default: number;
    name: Record<number, string>;
    reference?: string;
    price?: number;
    unit_price?: number;
    wholesale_price?: number;
    available_date?: string;
    product_type?: string;
    active?: number;
    available_for_order?: number;
    show_price?: number;
    indexed?: number;
    online_only?: number;
    visibility?: string;
    state?: number;
    minimal_quantity?: number;
    description?: Record<number, string>;
    description_short?: Record<number, string>;
    meta_title?: Record<number, string>;
    meta_description?: Record<number, string>;
    meta_keywords?: Record<number, string>;
    link_rewrite?: Record<number, string>;
}

export type Product = {
    id: number;
    name: string;
    description?: string;
    price: string; // price is a string in the API response
    quantity?: number;
    id_default_image?: string;
    id_tax_rules_group?: string;
    date_add?: string;
    id_category_default?: string | number;
    associations?: {
        categories?: Array<{ id: string | number }>;
    };
}

export type CartItem = Product & {
    quantity: number;
}

type XmlProduct = {
    id: number;
    'xlink:href': string;
}

let taxRatesLoaded = false;
let taxRateMap: Record<string, number> = {
    "1": 20,   // Standard FR 20%
    "2": 10,   // Reduit FR 10%
    "3": 5.5,  // Reduit FR 5.5%
    "4": 2.1,  // Super reduit FR 2.1%
    "5": 20    // EU VAT 20%
};

const loadTaxRates = async () => {
    if (taxRatesLoaded) return;
    try {
        const taxesRes = await api.get('/api/taxes?display=full');
        const taxRulesRes = await api.get('/api/tax_rules?display=full');
        
        const taxes = taxesRes.data?.taxes || [];
        const taxRules = taxRulesRes.data?.tax_rules || [];
        
        const taxMap: Record<string, number> = {};
        taxes.forEach((t: any) => {
            if (t.id && t.rate) {
                taxMap[t.id.toString()] = parseFloat(t.rate) || 0;
            }
        });
        
        const groupToTax: Record<string, string> = {};
        taxRules.forEach((r: any) => {
            const groupId = r.id_tax_rules_group?.toString();
            const taxId = r.id_tax?.toString();
            const countryId = r.id_country?.toString();
            if (groupId && taxId) {
                if (countryId === '8' || !groupToTax[groupId]) {
                    groupToTax[groupId] = taxId;
                }
            }
        });
        
        const newMap: Record<string, number> = {};
        Object.entries(groupToTax).forEach(([groupId, taxId]) => {
            newMap[groupId] = taxMap[taxId] || 0;
        });
        
        taxRateMap = { ...taxRateMap, ...newMap };
        taxRatesLoaded = true;
    } catch (e) {
        console.error("Failed to load tax rates dynamically, using defaults:", e);
        taxRatesLoaded = true; // prevent infinite loops/retries
    }
};

export const getProducts = async (): Promise<Product[]> => {
    try {
        const response = await apiXml.get(BASE_URL);
        const parser = new XMLParser({
            ignoreAttributes: false,
            attributeNamePrefix: ""
        });

        let productList: XmlProduct[] = [];
        const rawData = response.data;

        if (rawData && typeof rawData === "object" && rawData.products) {
            const productsNode = rawData.products.product ?? rawData.products;
            productList = Array.isArray(productsNode) ? productsNode : [productsNode].filter(Boolean);
        } else {
            const parsed = typeof rawData === "string" ? parser.parse(rawData) : rawData;
            const productsNode = parsed?.prestashop?.products?.product;
            if (productsNode) {
                productList = Array.isArray(productsNode) ? productsNode : [productsNode];
            }
        }

        const productIds = productList.map((p: XmlProduct) => p.id);

        // Fetch each product's details which are in JSON
        const productPromises = productIds.map((id: number) => getProductById(id));
        const products = await Promise.all(productPromises);

        return products
            .filter((p): p is Product => p !== null)
            .filter((product) => (product as any).active === undefined || String((product as any).active) !== "0");
    } catch (error) {
        console.error("Error fetching products:", error);
        throw error;
    }
};

export const getProductById = async (id: number): Promise<Product | null> => {
    try {
        await loadTaxRates();
        const response = await api.get(`${BASE_URL}/${id}`);
        if (response.data && response.data.product) {
            const product = response.data.product;
            const taxGroupId = product.id_tax_rules_group?.toString() || "1";
            const taxRate = taxRateMap[taxGroupId] ?? 20;
            const priceHt = parseFloat(product.price) || 0;
            const priceTtc = priceHt * (1 + taxRate / 100);
            
            return {
                ...product,
                price: priceTtc.toFixed(6),
                id_tax_rules_group: taxGroupId
            };
        }
        return null;
    } catch (error) {
        console.error(`Error fetching product with id ${id}:`, error);
        throw error;
    }
};

const escapeXml = (unsafe: string): string => {
    return unsafe.replace(/[<>&'"]/g, (c) => {
        switch (c) {
            case '<': return '&lt;';
            case '>': return '&gt;';
            case '&': return '&amp;';
            case '\'': return '&apos;';
            case '"': return '&quot;';
            default: return c;
        }
    });
};

const slugify = (text: string): string => {
    return text
        .toString()
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/\s+/g, '-')
        .replace(/[^\w-]+/g, '')
        .replace(/--+/g, '-')
        .replace(/^-+/, '')
        .replace(/-+$/, '');
};

const buildProductXml = (productData: ProductPayload) => {
    const nameEntries = Object.entries(productData.name);
    const languageId = Number(nameEntries[0]?.[0] ?? 1);
    const nameValue = escapeXml(nameEntries[0]?.[1] ?? '');
    const descriptionValue = escapeXml(
        productData.description?.[languageId] ?? ''
    );
    const shortDescriptionValue = escapeXml(
        productData.description_short?.[languageId] ?? ''
    );
    const metaTitleValue = escapeXml(productData.meta_title?.[languageId] ?? '');
    const metaDescriptionValue = escapeXml(
        productData.meta_description?.[languageId] ?? ''
    );
    const metaKeywordsValue = escapeXml(
        productData.meta_keywords?.[languageId] ?? ''
    );
    const linkRewriteValue = escapeXml(
        productData.link_rewrite?.[languageId] ?? slugify(nameValue)
    );
    const priceValue = productData.price ?? 0;
    const unitPriceValue = productData.unit_price ?? priceValue;
    const wholesalePriceValue = productData.wholesale_price ?? 0;
    const referenceValue = escapeXml(productData.reference ?? '');
    const activeValue = productData.active ?? 1;
    const availableForOrderValue = productData.available_for_order ?? 1;
    const showPriceValue = productData.show_price ?? 1;
    const indexedValue = productData.indexed ?? 1;
    const onlineOnlyValue = productData.online_only ?? 0;
    const visibilityValue = escapeXml(productData.visibility ?? "both");
    const stateValue = productData.state ?? 1;
    const minimalQuantityValue = productData.minimal_quantity ?? 1;
    const availableDateXml = productData.available_date ? `<available_date><![CDATA[${productData.available_date}]]></available_date>` : '';

    return `<?xml version="1.0" encoding="UTF-8"?>
    <prestashop xmlns:xlink="http://www.w3.org/1999/xlink">
    <product>
        <id_category_default><![CDATA[${productData.id_category_default}]]></id_category_default>
        <id_shop_default><![CDATA[1]]></id_shop_default>
        <reference><![CDATA[${referenceValue}]]></reference>
        <supplier_reference><![CDATA[]]></supplier_reference>
        <ean13><![CDATA[]]></ean13>
        <price><![CDATA[${priceValue}]]></price>
        <wholesale_price><![CDATA[${wholesalePriceValue}]]></wholesale_price>
        <unit_price><![CDATA[${unitPriceValue}]]></unit_price>
        <active><![CDATA[${activeValue}]]></active>
        <state><![CDATA[${stateValue}]]></state>
        <available_for_order><![CDATA[${availableForOrderValue}]]></available_for_order>
        <show_price><![CDATA[${showPriceValue}]]></show_price>
        <indexed><![CDATA[${indexedValue}]]></indexed>
        <online_only><![CDATA[${onlineOnlyValue}]]></online_only>
        <visibility><![CDATA[${visibilityValue}]]></visibility>
        <minimal_quantity><![CDATA[${minimalQuantityValue}]]></minimal_quantity>
        ${availableDateXml}
        <meta_description>
            <language id="${languageId}"><![CDATA[${metaDescriptionValue}]]></language>
        </meta_description>
        <meta_keywords>
            <language id="${languageId}"><![CDATA[${metaKeywordsValue}]]></language>
        </meta_keywords>
        <meta_title>
            <language id="${languageId}"><![CDATA[${metaTitleValue}]]></language>
        </meta_title>
        <link_rewrite>
            <language id="${languageId}"><![CDATA[${linkRewriteValue}]]></language>
        </link_rewrite>
        <name>
            <language id="${languageId}"><![CDATA[${nameValue}]]></language>
        </name>
        <description>
            <language id="${languageId}"><![CDATA[${descriptionValue}]]></language>
        </description>
        <description_short>
            <language id="${languageId}"><![CDATA[${shortDescriptionValue}]]></language>
        </description_short>
        <associations>
            <categories>
                <category>
                    <id><![CDATA[${productData.id_category_default}]]></id>
                </category>
            </categories>
        </associations>
    </product>
    </prestashop>`;
};

const ProductService = {
    // GET ALL PRODUCTS
    getAll: async () => {
        const response = await api.get(`${BASE_URL}?display=full`);
        return response.data.products;
    },

    // CREATE PRODUCT
    create: async (productData: ProductPayload) => {
        const xmlPayload = buildProductXml(productData);
        const response = await apiXml.post(`${BASE_URL}`, xmlPayload);
        return response.data;
    },

    // UPDATE PRODUCT
    update: async (productId: number, productData: ProductPayload) => {
        const xmlPayload = buildProductXml(productData);
        const response = await apiXml.put(`${BASE_URL}/${productId}`, xmlPayload);
        return response.data;
    },
    
    // DELETE PRODUCT
    delete: async (productId: number) => {
        try {
            const response = await apiXml.delete(`${BASE_URL}/${productId}`);
            return response.data;
        } catch (err: any) {
            console.error(`Product delete failed (id=${productId}):`, err?.response?.status, err?.response?.headers, err?.response?.data || err.message);
            throw err;
        }
    },

    // RESET DATA
    resetData: async function() {
        try{
            const products = await ProductService.getAll();
            if (products && products.length > 0) {
                await Promise.all(
                    products.map(async (prod: { id: number }) => {
                        try {
                            await ProductService.delete(prod.id);
                        } catch (e) {
                            console.error('Error deleting product:', e);
                        }
                    })
                );
            }
        } catch (error) {
            console.error('Error resetting data:', error);
        }
    }
};

export default ProductService;