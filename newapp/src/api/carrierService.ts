import axios from "axios";
import { XMLParser } from "fast-xml-parser";

const BASE_URL = "/api/carriers";
const API_KEY = "A9IBmZ4Ake4NJ36RPAjSJ8sVsLxQ4CGn";

const api = axios.create({
    auth: {
        username: API_KEY,
        password: "",
    },
    params: {
        output_format: "JSON",
        ws_key: API_KEY,
    },
});

const xmlParser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "",
});

const CarrierService = {
    getDefaultCarrierId: async () => {
        const response = await api.get(`${BASE_URL}?display=full`);
        const carriers = response.data?.carriers || [];
        const activeCarrier = carriers.find((carrier: any) => carrier.active === "1" || carrier.active === 1 || carrier.active === true) || carriers[0];
        const carrierId = activeCarrier?.id ?? activeCarrier;
        const parsed = parseInt(String(carrierId), 10);
        return Number.isNaN(parsed) ? 1 : parsed;
    },

    getAll: async () => {
        const response = await api.get(`${BASE_URL}?display=full`);
        return response.data?.carriers || [];
    },

    getById: async (carrierId: number) => {
        const response = await api.get(`${BASE_URL}/${carrierId}`);
        return response.data?.carrier || null;
    },

    getDefaultCarrierIdFromXml: async () => {
        const response = await api.get(`${BASE_URL}?display=full`);
        if (typeof response.data === "string") {
            const parsed = xmlParser.parse(response.data);
            const carriers = parsed?.prestashop?.carriers?.carrier;
            const carrierList = Array.isArray(carriers) ? carriers : carriers ? [carriers] : [];
            const activeCarrier = carrierList.find((carrier: any) => carrier.active === "1" || carrier.active === 1 || carrier.active === true) || carrierList[0];
            const carrierId = activeCarrier?.id ?? activeCarrier;
            const parsedId = parseInt(String(carrierId), 10);
            return Number.isNaN(parsedId) ? 1 : parsedId;
        }
        return CarrierService.getDefaultCarrierId();
    }
};

export default CarrierService;