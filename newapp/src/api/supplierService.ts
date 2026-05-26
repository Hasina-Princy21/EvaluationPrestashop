import axios from "axios";

const BASE_URL = "/api/suppliers";
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

export type SupplierPayload = {
    name: string;
    active?: number;
    description?: string;
}

const buildSupplierXml = (supplierData: SupplierPayload) => {
    const name = supplierData.name;
    const active = supplierData.active ?? 1;
    const description = supplierData.description ?? "";

    return `<?xml version="1.0" encoding="UTF-8"?>
<prestashop xmlns:xlink="http://www.w3.org/1999/xlink">
<supplier>
    <name><![CDATA[${name}]]></name>
    <active><![CDATA[${active}]]></active>
    <description>
        <language id="1"><![CDATA[${description}]]></language>
    </description>
</supplier>
</prestashop>`;
};

const SupplierService = {
    // GET ALL SUPPLIERS
    getAll: async () => {
        const response = await api.get(`${BASE_URL}?display=full`);
        return response.data.suppliers;
    },

    // GET SUPPLIER BY ID
    getById: async (supplierId: number) => {
        const response = await api.get(`${BASE_URL}/${supplierId}`);
        return response.data.supplier;
    },

    // CREATE SUPPLIER
    create: async (supplierData: SupplierPayload) => {
        const xmlPayload = buildSupplierXml(supplierData);
        const response = await apiXml.post(`${BASE_URL}`, xmlPayload);
        return response.data;
    },

    // UPDATE SUPPLIER
    update: async (supplierId: number, supplierData: SupplierPayload) => {
        const xmlPayload = buildSupplierXml(supplierData);
        const response = await apiXml.put(`${BASE_URL}/${supplierId}`, xmlPayload);
        return response.data;
    },

    // DELETE SUPPLIER
    delete: async (supplierId: number) => {
        const response = await apiXml.delete(`${BASE_URL}/${supplierId}`);
        return response.data;
    },

    // RESET SUPPLIERS DATA
    resetData: async function() {
        try {
            const suppliers = await SupplierService.getAll();
            if (suppliers && suppliers.length > 0) {
                await Promise.all(
                    suppliers.map((supplier: { id: number }) => SupplierService.delete(supplier.id))
                );
            }
        } catch (error) {
            console.error('Error resetting suppliers data:', error);
        }
    }
};

export default SupplierService;