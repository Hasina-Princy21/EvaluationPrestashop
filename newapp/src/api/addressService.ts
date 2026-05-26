import axios from "axios";

const BASE_URL = "/api/addresses";
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

export type AddressPayload = {
    id_customer: number;
    alias: string;
    lastname: string;
    firstname: string;
    address1: string;
    city: string;
    postcode: string;
    id_country: number;
    id_state?: number;
}

const buildAddressXml = (addressData: AddressPayload) => {
    const idCustomer = addressData.id_customer;
    const alias = addressData.alias;
    const lastname = addressData.lastname;
    const firstname = addressData.firstname;
    const address1 = addressData.address1;
    const city = addressData.city;
    const postcode = addressData.postcode;
    const idCountry = addressData.id_country;
    const idState = addressData.id_state ?? 0;

    return `<?xml version="1.0" encoding="UTF-8"?>
<prestashop xmlns:xlink="http://www.w3.org/1999/xlink">
<address>
    <id_customer><![CDATA[${idCustomer}]]></id_customer>
    <alias><![CDATA[${alias}]]></alias>
    <lastname><![CDATA[${lastname}]]></lastname>
    <firstname><![CDATA[${firstname}]]></firstname>
    <address1><![CDATA[${address1}]]></address1>
    <city><![CDATA[${city}]]></city>
    <postcode><![CDATA[${postcode}]]></postcode>
    <id_country><![CDATA[${idCountry}]]></id_country>
    <id_state><![CDATA[${idState}]]></id_state>
</address>
</prestashop>`;
};

const AddressService = {
    // GET ALL ADDRESSES
    getAll: async () => {
        const response = await api.get(`${BASE_URL}?display=full`);
        return response.data.addresses;
    },

    // GET ADDRESS BY ID
    getById: async (addressId: number) => {
        const response = await api.get(`${BASE_URL}/${addressId}`);
        return response.data.address;
    },

    // CREATE ADDRESS
    create: async (addressData: AddressPayload) => {
        const xmlPayload = buildAddressXml(addressData);
        const response = await apiXml.post(`${BASE_URL}`, xmlPayload);
        return response.data;
    },

    // UPDATE ADDRESS
    update: async (addressId: number, addressData: AddressPayload) => {
        const xmlPayload = buildAddressXml(addressData);
        const response = await apiXml.put(`${BASE_URL}/${addressId}`, xmlPayload);
        return response.data;
    },

    // DELETE ADDRESS
    delete: async (addressId: number) => {
        const response = await apiXml.delete(`${BASE_URL}/${addressId}`);
        return response.data;
    },

    // RESET ADDRESSES DATA
    resetData: async function() {
        try {
            const addresses = await AddressService.getAll();
            if (addresses && addresses.length > 0) {
                await Promise.all(
                    addresses.map((addr: { id: number }) => AddressService.delete(addr.id))
                );
            }
        } catch (error) {
            console.error('Error resetting addresses data:', error);
        }
    }
};

export default AddressService;