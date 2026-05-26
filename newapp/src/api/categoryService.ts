import axios from "axios";

const BASE_URL = "/api/categories";
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

export type CategoryPayload = {
    name: Record<number, string> | string;
    description?: Record<number, string> | string;
    link_rewrite?: Record<number, string> | string;
    active?: number;
    id_parent?: number;
}

const buildCategoryXml = (categoryData: CategoryPayload) => {
    let nameXml = "";
    let descXml = "";
    let linkRewriteXml = "";
    const active = categoryData.active ?? 1;
    const idParent = categoryData.id_parent ?? 2;

    if (typeof categoryData.name === "string") {
        nameXml = `<language id="1"><![CDATA[${categoryData.name}]]></language>`;
    } else {
        nameXml = Object.entries(categoryData.name)
            .map(([langId, val]) => `<language id="${langId}"><![CDATA[${val}]]></language>`)
            .join('\n');
    }

    if (categoryData.description) {
        if (typeof categoryData.description === "string") {
            descXml = `<language id="1"><![CDATA[${categoryData.description}]]></language>`;
        } else {
            descXml = Object.entries(categoryData.description)
                .map(([langId, val]) => `<language id="${langId}"><![CDATA[${val}]]></language>`)
                .join('\n');
        }
    }

    if (categoryData.link_rewrite) {
        if (typeof categoryData.link_rewrite === "string") {
            linkRewriteXml = `<language id="1"><![CDATA[${categoryData.link_rewrite}]]></language>`;
        } else {
            linkRewriteXml = Object.entries(categoryData.link_rewrite)
                .map(([langId, val]) => `<language id="${langId}"><![CDATA[${val}]]></language>`)
                .join('\n');
        }
    } else {
        const defaultName = typeof categoryData.name === "string" 
            ? categoryData.name 
            : (Object.values(categoryData.name)[0] ?? "");
        const slug = defaultName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
        linkRewriteXml = `<language id="1"><![CDATA[${slug}]]></language>`;
    }

    return `<?xml version="1.0" encoding="UTF-8"?>
<prestashop xmlns:xlink="http://www.w3.org/1999/xlink">
<category>
    <active><![CDATA[${active}]]></active>
    <id_parent><![CDATA[${idParent}]]></id_parent>
    <name>
        ${nameXml}
    </name>
    <link_rewrite>
        ${linkRewriteXml}
    </link_rewrite>
    <description>
        ${descXml}
    </description>
</category>
</prestashop>`;
};

const CategoryService = {
    // GET ALL CATEGORIES
    getAll: async () => {
        const response = await api.get(`${BASE_URL}?display=full`);
        return response.data.categories;
    },

    // GET CATEGORY BY ID
    getById: async (categoryId: number) => {
        const response = await api.get(`${BASE_URL}/${categoryId}`);
        return response.data.category;
    },

    // CREATE CATEGORY
    create: async (categoryData: CategoryPayload) => {
        const xmlPayload = buildCategoryXml(categoryData);
        const response = await apiXml.post(`${BASE_URL}`, xmlPayload);
        return response.data;
    },

    // UPDATE CATEGORY
    update: async (categoryId: number, categoryData: CategoryPayload) => {
        const xmlPayload = buildCategoryXml(categoryData);
        const response = await apiXml.put(`${BASE_URL}/${categoryId}`, xmlPayload);
        return response.data;
    },

    // DELETE CATEGORY
    delete: async (categoryId: number) => {
        const response = await apiXml.delete(`${BASE_URL}/${categoryId}`);
        return response.data;
    },

    // RESET CATEGORIES DATA
    resetData: async function() {
        try {
            const categories = await CategoryService.getAll();
            if (categories && categories.length > 0) {
                // Filter out root category (1) and home category (2) to avoid deleting required pre-configured categories
                const categoriesToDelete = categories.filter((cat: { id: number }) => cat.id > 2);
                await Promise.all(
                    categoriesToDelete.map(async (cat: { id: number }) => {
                        try {
                            await CategoryService.delete(cat.id);
                        } catch (e) {
                            console.error(`Error deleting category ${cat.id}:`, e);
                        }
                    })
                );
            }
        } catch (error) {
            console.error('Error resetting categories data:', error);
        }
    }
};

export default CategoryService;