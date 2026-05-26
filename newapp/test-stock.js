const axios = require('axios');
const API_KEY = "A9IBmZ4Ake4NJ36RPAjSJ8sVsLxQ4CGn";
const api = axios.create({
    auth: { username: API_KEY, password: "" },
    params: { output_format: 'JSON', ws_key: API_KEY }
});
api.get("http://localhost/api/stock_availables?filter[id_product]=1&display=full")
   .then(res => console.log(JSON.stringify(res.data, null, 2)))
   .catch(err => console.error(err.message));
