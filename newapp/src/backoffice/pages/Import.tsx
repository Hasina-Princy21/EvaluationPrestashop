import { useState, type ChangeEvent } from "react";
import JSZip from "jszip";
import Papa from "papaparse";
import axios from "axios";
import ProductService from "../../api/productService";
import OrderService from "../../api/orderService";
import CategoryService from "../../api/categoryService";
import CustomerService from "../../api/customerService";
import AddressService from "../../api/addressService";
import SupplierService from "../../api/supplierService";
import CardService from "../../api/cardService";
import CarrierService from "../../api/carrierService";
import StockAvailableService from "../../api/stock_availableService";
import "./Import.css";

const API_KEY = "A9IBmZ4Ake4NJ36RPAjSJ8sVsLxQ4CGn";

const apiXml = axios.create({
  auth: { username: API_KEY, password: "" },
  params: { output_format: "JSON", ws_key: API_KEY },
  headers: { "Content-Type": "application/xml" }
});

const PAYMENT_MODULE_NAME = "ps_wirepayment";

const cleanNumber = (val: any): number => {
  if (val === undefined || val === null) return 0;
  const str = String(val)
    .replace(/[^\d.,-]/g, "") // Remove everything except digits, dots, commas, and minus
    .replace(",", ".");       // Convert comma to dot
  const num = parseFloat(str);
  return isNaN(num) ? 0 : num;
};

type ImportState = "idle" | "importing" | "success" | "error";

type ImportError = {
  type: string;
  identifier: string;
  error: string;
  row: any;
};

type ParsedCSV = {
  data: any[];
  fields: string[];
};

const normalizeHeader = (value: string) =>
  value
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

const isValidDDMMYYYY = (value: string) => {
  if (!value) return false;
  const trimmed = value.trim();
  if (!/^\d{2}\/\d{2}\/\d{4}$/.test(trimmed)) return false;

  const [dayStr, monthStr, yearStr] = trimmed.split("/");
  const day = Number(dayStr);
  const month = Number(monthStr);
  const year = Number(yearStr);
  const parsedDate = new Date(year, month - 1, day);

  return (
    parsedDate.getFullYear() === year &&
    parsedDate.getMonth() === month - 1 &&
    parsedDate.getDate() === day
  );
};

const isPositiveAmount = (value: any) => cleanNumber(value) > 0;

const hasExpectedHeaders = (actualFields: string[] = [], expectedFields: string[]) => {
  const actualNormalized = actualFields.map(normalizeHeader).filter(Boolean);
  const expectedNormalized = expectedFields.map(normalizeHeader);

  if (actualNormalized.length !== expectedNormalized.length) {
    return false;
  }

  const actualSet = new Set(actualNormalized);
  return expectedNormalized.every(field => actualSet.has(field));
};

const Import = () => {
  const [fieldSeparator, setFieldSeparator] = useState(",");
  const [multiValueSeparator, setMultiValueSeparator] = useState(";");
  const [resetBeforeImport, setResetBeforeImport] = useState(false);
  const [skipImageImport, setSkipImageImport] = useState(false);

  const [productFile, setProductFile] = useState<File | null>(null);
  const [combinationFile, setCombinationFile] = useState<File | null>(null);
  const [orderFile, setOrderFile] = useState<File | null>(null);
  const [zipFile, setZipFile] = useState<File | null>(null);

  const [status, setStatus] = useState<ImportState>("idle");
  const [progressMsg, setProgressMsg] = useState("");
  const [logs, setLogs] = useState<string[]>([]);
  const [errorsList, setErrorsList] = useState<ImportError[]>([]);
  const [successCount, setSuccessCount] = useState({ products: 0, combinations: 0, orders: 0 });

  const addLog = (msg: string) => {
    setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>, type: string) => {
    const file = e.target.files?.[0] || null;
    if (type === "product") setProductFile(file);
    if (type === "combination") setCombinationFile(file);
    if (type === "order") setOrderFile(file);
    if (type === "zip") setZipFile(file);
  };

  const handlePreloadDefaultFiles = async () => {
    try {
      addLog("Pré-chargement des fichiers locaux par défaut...");

      const prodRes = await fetch("/csv/data-import/import-csv-data-18-mai-26 - produit.csv");
      const prodBlob = await prodRes.blob();
      const prodFileObj = new File([prodBlob], "import-csv-data-18-mai-26 - produit.csv", { type: "text/csv" });
      setProductFile(prodFileObj);

      const combRes = await fetch("/csv/data-import/import-csv-data-18-mai-26 - produit_declinaison.csv");
      const combBlob = await combRes.blob();
      const combFileObj = new File([combBlob], "import-csv-data-18-mai-26 - produit_declinaison.csv", { type: "text/csv" });
      setCombinationFile(combFileObj);

      const orderRes = await fetch("/csv/data-import/import-csv-data-18-mai-26 - commande.csv");
      const orderBlob = await orderRes.blob();
      const orderFileObj = new File([orderBlob], "import-csv-data-18-mai-26 - commande.csv", { type: "text/csv" });
      setOrderFile(orderFileObj);

      if (!skipImageImport) {
        const zipRes = await fetch("/csv/data-import/images.zip");
        const zipBlob = await zipRes.blob();
        const zipFileObj = new File([zipBlob], "images.zip", { type: "application/zip" });
        setZipFile(zipFileObj);
      }

      addLog("Tous les fichiers locaux ont été pré-chargés avec succès !");
    } catch (err: any) {
      addLog(`Erreur de pré-chargement : ${err.message}`);
    }
  };

  const parseCSV = (file: File, delimiter: string): Promise<ParsedCSV> => {
    return new Promise((resolve, reject) => {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        delimiter: delimiter,
        complete: (results) => resolve({
          data: results.data,
          fields: results.meta.fields || []
        }),
        error: (err) => reject(err),
      });
    });
  };

  const uploadProductImage = async (productId: number, imageBlob: Blob) => {
    const formData = new FormData();
    formData.append("image", imageBlob, `product_${productId}.png`);
    await axios.post(`/api/images/products/${productId}`, formData, {
      params: { output_format: "JSON", ws_key: API_KEY },
      headers: { "Content-Type": "multipart/form-data" }
    });
  };

  // Helper to find or create option groups (e.g. capacity, size, color)
  const getOrCreateOptionGroup = async (name: string, existingGroups: any[]): Promise<number> => {
    const found = existingGroups.find((g: any) =>
      (typeof g.name === "string" ? g.name : Object.values(g.name)[0] as string || "").toLowerCase() === name.toLowerCase()
    );
    if (found) return found.id;

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
    <prestashop xmlns:xlink="http://www.w3.org/1999/xlink">
    <product_option>
        <name><language id="1"><![CDATA[${name}]]></language></name>
        <public_name><language id="1"><![CDATA[${name}]]></language></public_name>
        <group_type><![CDATA[select]]></group_type>
      </product_option>
      </prestashop>`;
    const res = await apiXml.post("/api/product_options", xml);
    return res.data?.product_option?.id || res.data?.id;
  };

  // Helper to find or create option values (e.g. 128GB, Noir)
  const getOrCreateOptionValue = async (name: string, groupId: number, existingValues: any[]): Promise<number> => {
    const found = existingValues.find((v: any) =>
      parseInt(v.id_attribute_group, 10) === groupId &&
      (typeof v.name === "string" ? v.name : Object.values(v.name)[0] as string || "").toLowerCase() === name.toLowerCase()
    );
    if (found) return found.id;

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
    <prestashop xmlns:xlink="http://www.w3.org/1999/xlink">
    <product_option_value>
        <id_attribute_group><![CDATA[${groupId}]]></id_attribute_group>
        <name><language id="1"><![CDATA[${name}]]></language></name>
    </product_option_value>
    </prestashop>`;

    const res = await apiXml.post("/api/product_option_values", xml);
    return res.data?.product_option_value?.id || res.data?.id;
  };

  // Helper to create combination
  const createCombination = async (productId: number, ref: string, priceImpact: number, optionValueId: number): Promise<number> => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
    <prestashop xmlns:xlink="http://www.w3.org/1999/xlink">
        <combination>
            <id_product><![CDATA[${productId}]]></id_product>
            <reference><![CDATA[${ref}]]></reference>
            <price><![CDATA[${priceImpact.toFixed(6)}]]></price>
            <minimal_quantity><![CDATA[1]]></minimal_quantity>
            <associations>
                <product_option_values nodeType="product_option_value" api="product_option_values">
                    <product_option_value>
                        <id><![CDATA[${optionValueId}]]></id>
                    </product_option_value>
                </product_option_values>
            </associations>
        </combination>
    </prestashop>`;

    addLog(`XML envoyé pour création de combinaison:\n${xml}`);
    console.debug("createCombination XML:", xml);
    const res = await apiXml.post("/api/combinations", xml);
    return res.data?.combination?.id || res.data?.id;
  };

  const handleImport = async () => {
    if (!productFile || !combinationFile || !orderFile || (!skipImageImport && !zipFile)) {
      alert("Veuillez sélectionner les 3 fichiers CSV requis et le ZIP d'images.");
      return;
    }

    setStatus("importing");
    setLogs([]);
    setErrorsList([]);
    setSuccessCount({ products: 0, combinations: 0, orders: 0 });

    let localErrors: ImportError[] = [];
    let localSuccessProducts = 0;
    let localSuccessCombinations = 0;
    let localSuccessOrders = 0;

    const reportError = (type: string, identifier: string, errorInput: any, row: any) => {
      let error = "Erreur inconnue";
      if (typeof errorInput === "string") {
        error = errorInput;
      } else if (errorInput) {
        if (errorInput.response && errorInput.response.data) {
          const dataStr = typeof errorInput.response.data === "string"
            ? errorInput.response.data
            : JSON.stringify(errorInput.response.data);
          const match = dataStr.match(/<message>(?:<!\[CDATA\[)?([^\]>]+)(?:\]\]>)?<\/message>/);
          if (match && match[1]) {
            error = match[1].trim();
          } else {
            error = dataStr.substring(0, 200);
          }
        } else {
          error = errorInput.message || String(errorInput);
        }
      }
      const errObj = { type, identifier, error, row };
      localErrors.push(errObj);
      setErrorsList(prev => [...prev, errObj]);
    };

    // Step 0: Pre-reset data if option checked
    if (resetBeforeImport) {
      setProgressMsg("Réinitialisation pré-import des données...");
      addLog("Option de réinitialisation activée. Nettoyage de la base de données...");
      try {
        await OrderService.resetData();
        await CardService.resetData();
        await ProductService.resetData();
        await CategoryService.resetData();
        await CustomerService.resetData();
        await AddressService.resetData();
        await SupplierService.resetData();
        addLog("Nettoyage de la base PrestaShop terminé.");
      } catch (err: any) {
        addLog(`Note: Erreur partielle durant la réinitialisation: ${err?.message || err}`);
      }
    }

    setProgressMsg("Extraction des images du fichier ZIP...");
    addLog("Début de l'importation en mode résilient (Continuer en cas d'erreur)...");

    try {
      // Step 1: Zip parsing
      const imagesMap: Record<string, Blob> = {};
      if (zipFile && !skipImageImport) {
        addLog(`Lecture de ${zipFile.name}...`);
        try {
          const zip = await JSZip.loadAsync(zipFile);
          for (const [filename, fileObj] of Object.entries(zip.files)) {
            if (!fileObj.dir && /\.(png|jpg|jpeg)$/i.test(filename)) {
              const blob = await fileObj.async("blob");
              const cleanName = filename.split("/").pop() || filename;
              imagesMap[cleanName] = blob;
            }
          }
          addLog(`${Object.keys(imagesMap).length} images extraites du ZIP.`);
        } catch (e: any) {
          reportError("Images ZIP", zipFile.name, `Impossible d'extraire le ZIP: ${e.message}`, null);
        }
      }

      // Step 2: CSV parsing
      setProgressMsg("Parsing des fichiers CSV...");
      let productsRaw: any[] = [];
      let declRaw: any[] = [];
      let ordersRaw: any[] = [];
      let productFields: string[] = [];
      let declFields: string[] = [];
      let orderFields: string[] = [];

      try {
        const parsedProducts = await parseCSV(productFile, fieldSeparator);
        productsRaw = parsedProducts.data;
        productFields = parsedProducts.fields;
        addLog(`${productsRaw.length} lignes de produits lues.`);
      } catch (e: any) {
        reportError("CSV Produits", productFile.name, `Erreur parsing: ${e.message}`, null);
      }

      try {
        const parsedDecl = await parseCSV(combinationFile, fieldSeparator);
        declRaw = parsedDecl.data;
        declFields = parsedDecl.fields;
        addLog(`${declRaw.length} lignes de déclinaisons lues.`);
      } catch (e: any) {
        reportError("CSV Déclinaisons", combinationFile.name, `Erreur parsing: ${e.message}`, null);
      }

      try {
        const parsedOrders = await parseCSV(orderFile, fieldSeparator);
        ordersRaw = parsedOrders.data;
        orderFields = parsedOrders.fields;
        addLog(`${ordersRaw.length} lignes de commandes lues.`);
      } catch (e: any) {
        reportError("CSV Commandes", orderFile.name, `Erreur parsing: ${e.message}`, null);
      }

      const expectedProductHeaders = ["date_availability_produit", "nom", "reference", "prix_ttc", "Taxe", "categorie", "prix_achat"];
      const expectedCombinationHeaders = ["reference", "specificité", "karazany", "stock_initial", "prix_vente_ttc"];
      const expectedOrderHeaders = ["date", "nom", "email", "pwd", "adresse", "achat", "etat"];

      if (!hasExpectedHeaders(productFields, expectedProductHeaders)) {
        reportError("CSV Produits", productFile.name, `Nom de colonne non conforme. Attendu: ${expectedProductHeaders.join(", ")}`, { fields: productFields });
        productsRaw = [];
      }

      if (!hasExpectedHeaders(declFields, expectedCombinationHeaders)) {
        reportError("CSV Déclinaisons", combinationFile.name, `Nom de colonne non conforme. Attendu: ${expectedCombinationHeaders.join(", ")}`, { fields: declFields });
        declRaw = [];
      }

      if (!hasExpectedHeaders(orderFields, expectedOrderHeaders)) {
        reportError("CSV Commandes", orderFile.name, `Nom de colonne non conforme. Attendu: ${expectedOrderHeaders.join(", ")}`, { fields: orderFields });
        ordersRaw = [];
      }

      // Pre-scan combinations to identify combinable products
      const combinableRefs = new Set<string>();
      const totalStockByRef: Record<string, number> = {};
      declRaw.forEach(row => {
        if (row.reference && row.specificité && row.specificité.trim() !== "") {
          const ref = row.reference.trim();
          combinableRefs.add(ref);
          const qty = parseInt(row.stock_initial, 10) || 0;
          totalStockByRef[ref] = (totalStockByRef[ref] || 0) + qty;
        }
      });

      // Step 3: Category resolution
      setProgressMsg("Résolution des catégories...");
      addLog("Récupération de la liste des catégories PrestaShop...");
      const categoryMap: Record<string, number> = {};
      try {
        const existingCategories = await CategoryService.getAll() || [];
        existingCategories.forEach((cat: any) => {
          if (cat.name) {
            const name = typeof cat.name === "string" ? cat.name : Object.values(cat.name)[0] as string || "";
            categoryMap[name.toLowerCase().trim()] = cat.id;
          }
        });
      } catch (e: any) {
        addLog(`Avertissement chargement catégories: ${e.message}. Création automatique à la volée.`);
      }

      // Create categories
      for (const row of productsRaw) {
        const catName = (row.categorie || "").trim();
        if (catName && !categoryMap[catName.toLowerCase()]) {
          try {
            addLog(`Création de la catégorie: "${catName}"`);
            const newCat = await CategoryService.create({ name: catName, active: 1 });
            const catId = newCat?.category?.id || newCat?.id;
            if (catId) {
              categoryMap[catName.toLowerCase()] = catId;
            }
          } catch (e: any) {
            reportError("Catégorie", catName, `Impossible de créer la catégorie: ${e.message}`, row);
          }
        }
      }

      // Step 4: Product Creation
      setProgressMsg("Création des produits simples et parent-déclinaisons...");
      const productMap: Record<string, any> = {}; // reference -> details

      for (const row of productsRaw) {
        const ref = (row.reference || "").trim();
        const name = (row.nom || "").trim();
        if (!ref || !name) continue;
        try {
          if (!isValidDDMMYYYY(String(row.date_availability_produit || ""))) {
            reportError("Produit", `${name} (${ref})`, "Format de date invalide. Attendu: DD/MM/YYYY.", row);
            continue;
          }

          const priceTtc = cleanNumber(row.prix_ttc);
          const taxeRate = cleanNumber(row.Taxe) || 20;
          const wholesalePrice = cleanNumber(row.prix_achat);

          if (!isPositiveAmount(row.prix_ttc)) {
            reportError("Produit", `${name} (${ref})`, "Montant non positif pour le prix TTC.", row);
            continue;
          }

          if (!isPositiveAmount(row.prix_achat)) {
            reportError("Produit", `${name} (${ref})`, "Montant non positif pour le prix d'achat.", row);
            continue;
          }

          const priceHt = parseFloat((priceTtc / (1 + taxeRate / 100)).toFixed(6));
          const wholesalePriceRounded = parseFloat(wholesalePrice.toFixed(6));

          const catName = (row.categorie || "").trim();
          const catId = categoryMap[catName.toLowerCase()] || 2; // Home default

          addLog(`Création du produit ${name} (Réf: ${ref})`);
          const productRes = await ProductService.create({
            id_category_default: catId,
            name: { 1: name },
            reference: ref,
            price: priceHt,
            unit_price: priceHt,
            wholesale_price: wholesalePriceRounded,
            active: 1
          });

          const createdProd = productRes?.product || productRes;
          const prodId = createdProd?.id;

          if (!prodId) {
            throw new Error("L'API PrestaShop n'a pas renvoyé d'ID valide.");
          }

          productMap[ref] = {
            id: prodId,
            name,
            basePriceTtc: priceTtc,
            taxeRate: taxeRate
          };

          localSuccessProducts++;
          setSuccessCount(prev => ({ ...prev, products: localSuccessProducts }));

          // ZIP Image mapping
          const possibleImageNames = [`${ref}.png`, `${ref}.jpg`, `${ref}.jpeg`].map(n => n.toLowerCase());
          const matchImageName = Object.keys(imagesMap).find(n => possibleImageNames.includes(n.toLowerCase()));

          if (matchImageName) {
            try {
              addLog(`  -> Uploading image ${matchImageName} pour le produit ${name}`);
              await uploadProductImage(prodId, imagesMap[matchImageName]);
            } catch (imgErr: any) {
              addLog(`  -> Erreur image pour ${ref}: ${imgErr.message}`);
              reportError("Image produit", ref, `Téléversement image échoué: ${imgErr.message}`, row);
            }
          }
        } catch (e: any) {
          reportError("Produit", `${name} (${ref})`, e, row);
        }
      }

      // Step 5: Options, Values and Combinations
      setProgressMsg("Création des attributs et des déclinaisons...");

      let existingOptGroups: any[] = [];
      let existingOptVals: any[] = [];

      try {
        const optGroupsRes = await apiXml.get("/api/product_options?display=full");
        existingOptGroups = optGroupsRes.data?.product_options || [];
      } catch (e) {
        addLog("Option groups loading warning, creating on the fly.");
      }

      try {
        const optValsRes = await apiXml.get("/api/product_option_values?display=full");
        existingOptVals = optValsRes.data?.product_option_values || [];
      } catch (e) {
        addLog("Option values loading warning, creating on the fly.");
      }

      const combinationMap: Record<string, number> = {};

      for (const row of declRaw) {
        const ref = (row.reference || "").trim();
        const specName = (row.specificité || "").trim();
        const specVal = (row.karazany || "").trim();
        const stockQty = parseInt(row.stock_initial, 10) || 0;

        const prodInfo = productMap[ref];
        if (!prodInfo) {
          reportError("Déclinaison", `Réf: ${ref}`, "Le produit parent associé est introuvable ou a échoué à la création.", row);
          continue;
        }

        try {
          if (specName && specVal) {
            if (row.prix_vente_ttc && !isPositiveAmount(row.prix_vente_ttc)) {
              reportError("Déclinaison", `Réf: ${ref} (Attribut: ${specName}:${specVal})`, "Montant non positif pour le prix de vente TTC.", row);
              continue;
            }

            addLog(`Création déclinaison ${specName}: ${specVal} pour le produit ${ref}`);

            const optGroupId = await getOrCreateOptionGroup(specName, existingOptGroups);
            const optValId = await getOrCreateOptionValue(specVal, optGroupId, existingOptVals);

            const combPriceTtc = row.prix_vente_ttc ? cleanNumber(row.prix_vente_ttc) : prodInfo.basePriceTtc;
            const priceImpactTtc = combPriceTtc - prodInfo.basePriceTtc;
            const priceImpactHt = parseFloat((priceImpactTtc / (1 + prodInfo.taxeRate / 100)).toFixed(6));

            const combId = await createCombination(prodInfo.id, ref, priceImpactHt, optValId);
            combinationMap[`${ref}_${specVal.toLowerCase()}`] = combId;

            localSuccessCombinations++;
            setSuccessCount(prev => ({ ...prev, combinations: localSuccessCombinations }));

            // Update Stock
            await StockAvailableService.upsert({
              id_product: prodInfo.id,
              id_product_attribute: combId,
              quantity: stockQty,
              id_shop: 1,
              id_shop_group: 0,
              out_of_stock: 2,
              depends_on_stock: 0
            });
          } else {
            if (combinableRefs.has(ref)) {
              addLog(`Stock simple ignoré pour ${ref} car le produit utilise des déclinaisons.`);
              continue;
            }

            // Simple product stock update
            addLog(`Mise à jour du stock (${stockQty}) pour le produit simple ${ref}`);
            await StockAvailableService.upsert({
              id_product: prodInfo.id,
              id_product_attribute: 0,
              quantity: stockQty,
              id_shop: 1,
              id_shop_group: 0,
              out_of_stock: 2,
              depends_on_stock: 0
            });
          }
        } catch (e: any) {
          reportError("Déclinaison", `Réf: ${ref} (Attribut: ${specName}:${specVal})`, e, row);
        }
      }

      // Sync base stock for combination products so the product list shows total quantities
      for (const ref of combinableRefs) {
        const prodInfo = productMap[ref];
        if (!prodInfo) continue;
        const totalQty = totalStockByRef[ref] || 0;
        const baseStockRow = await StockAvailableService.getByProductAndAttribute(prodInfo.id, 0);
        if (baseStockRow?.id) {
          await StockAvailableService.update(baseStockRow.id, {
            id: baseStockRow.id,
            id_product: prodInfo.id,
            id_product_attribute: 0,
            id_shop: 1,
            id_shop_group: 0,
            quantity: totalQty,
            out_of_stock: 2,
            depends_on_stock: 0
          });
        } else {
          await StockAvailableService.upsert({
            id_product: prodInfo.id,
            id_product_attribute: 0,
            id_shop: 1,
            id_shop_group: 0,
            quantity: totalQty,
            out_of_stock: 2,
            depends_on_stock: 0
          });
        }
      }

      // Step 6: Customers, Addresses, Carts and Orders
      setProgressMsg("Création des clients et validation des commandes...");
      const customerMap: Record<string, number> = {};
      const customerAddressMap: Record<string, number> = {};
      const customerSecureKeyMap: Record<string, string> = {};
      const defaultCarrierId = await CarrierService.getDefaultCarrierId();

      const parseAchat = (achatStr: string) => {
        if (!achatStr) return [];
        let cleaned = achatStr.trim();
        if (cleaned.startsWith("[") && cleaned.endsWith("]")) {
          cleaned = cleaned.slice(1, -1);
        }
        if (cleaned.startsWith("(") && cleaned.endsWith(")")) {
          cleaned = cleaned.slice(1, -1);
        }
        const parts = cleaned.split(/\)\s*,\s*\(/);
        return parts.map(part => {
          const fields = part.split(multiValueSeparator);
          const refVal = fields[0] ? fields[0].replace(/"/g, "").trim() : "";
          const qtyVal = fields[1] ? parseInt(fields[1], 10) : 0;
          const attrVal = fields[2] ? fields[2].replace(/"/g, "").trim() : "";
          return { reference: refVal, quantity: qtyVal, attributeValue: attrVal };
        });
      };

      for (const row of ordersRaw) {
        const email = (row.email || "").trim().toLowerCase();
        const name = (row.nom || "").trim();
        const pwd = (row.pwd || "").trim();
        const rawAddr = (row.adresse || "").trim();
        const etat = (row.etat || "").trim().toLowerCase();
        const orderDate = (row.date || "").trim();

        if (!email || !name) continue;

        try {
          if (!isValidDDMMYYYY(orderDate)) {
            reportError("Commande", `Client: ${name} (${email})`, "Format de date invalide. Attendu: DD/MM/YYYY.", row);
            continue;
          }

          // 1. Get or Create Customer
          let customerId = customerMap[email];
          if (!customerId) {
            const splitName = name.split(" ");
            const firstname = splitName[0] || "Client";
            const lastname = splitName.slice(1).join(" ") || "Import";

            let existingCustId: number | null = null;
            try {
              const searchRes = await apiXml.get(`/api/customers?filter[email]=${email}`);
              const list = searchRes.data?.customers || [];
              if (list.length > 0) {
                existingCustId = parseInt(list[0].id || list[0], 10);
              }
            } catch (searchErr) {
              console.log(`Customer search error for email ${email}:`, searchErr);
              // Ignore search error and proceed
            }

            if (existingCustId) {
              customerId = existingCustId;
              addLog(`  -> Client existant trouvé : ID ${customerId} (${email})`);
            } else {
              addLog(`Création du client: ${name} (${email})`);
              const custRes = await CustomerService.create({
                firstname,
                lastname,
                email,
                passwd: pwd,
                active: 1
              });
              customerId = custRes?.customer?.id || custRes?.id;
            }
            customerMap[email] = customerId;
            try {
              const custFull = await CustomerService.getById(customerId);
              customerSecureKeyMap[email] = custFull?.secure_key || custFull?.customer?.secure_key || "";
            } catch (e) {
              customerSecureKeyMap[email] = "";
            }
          }

          // 2. Get or Create Address
          let addressId = customerAddressMap[email];
          if (!addressId) {
            let existingAddrId: number | null = null;
            try {
              const addrSearch = await apiXml.get(`/api/addresses?filter[id_customer]=${customerId}`);
              const addrList = addrSearch.data?.addresses || [];
              if (addrList.length > 0) {
                existingAddrId = parseInt(addrList[0].id || addrList[0], 10);
              }
            } catch (addrSearchErr) {
              console.warn(`Adresse search error for customer ${customerId}:`, addrSearchErr);
            }

            if (existingAddrId) {
              addressId = existingAddrId;
              addLog(`  -> Adresse existante trouvée : ID ${addressId} pour client ID ${customerId}`);
            } else {
              addLog(`  -> Création d'adresse pour ${name}`);
              const splitName = name.split(" ");
              const firstname = splitName[0] || "Client";
              const lastname = splitName.slice(1).join(" ") || "Import";
              const addrRes = await AddressService.create({
                id_customer: customerId,
                alias: "Mon Adresse",
                firstname,
                lastname,
                address1: rawAddr || "Rue de l'Import",
                city: "Antananarivo",
                postcode: "00101",
                id_country: 8 // France default
              });
              addressId = addrRes?.address?.id || addrRes?.id;
            }
            customerAddressMap[email] = addressId;
          }
          const items = parseAchat(row.achat);

          // 3. Create Cart
          addLog(`  -> Création de panier pour la commande de ${name}`);
          const cartRowsRaw: any[] = [];
          for (const item of items) {
            const prodInfo = productMap[item.reference];
            if (!prodInfo) {
              addLog(`  -> Ligne ignorée: produit introuvable (${item.reference})`);
              continue;
            }

            if (!item.quantity || item.quantity <= 0) {
              addLog(`  -> Ligne ignorée: quantité invalide (${item.reference} / ${item.quantity})`);
              continue;
            }

            const requiresCombination = combinableRefs.has(item.reference);
            if (requiresCombination && !item.attributeValue) {
              addLog(`  -> Ligne ignorée: attribut requis pour ${item.reference}`);
              continue;
            }

            let combId = 0;
            if (item.attributeValue) {
              combId = combinationMap[`${item.reference}_${item.attributeValue.toLowerCase()}`] || 0;
              if (!combId) {
                addLog(`  -> Ligne ignorée: déclinaison introuvable (${item.reference} / ${item.attributeValue})`);
                continue;
              }
            }

            cartRowsRaw.push({
              reference: item.reference,
              name: prodInfo.name,
              basePriceTtc: prodInfo.basePriceTtc,
              taxeRate: prodInfo.taxeRate,
              id_product: prodInfo.id,
              id_product_attribute: combId,
              quantity: item.quantity
            });
          }

          // Merge duplicate product/attribute rows so cart totals and order rows stay consistent.
          const mergedRowsMap = new Map<string, any>();
          for (const row of cartRowsRaw) {
            const key = `${row.id_product}_${row.id_product_attribute}`;
            if (!mergedRowsMap.has(key)) {
              mergedRowsMap.set(key, { ...row });
            } else {
              const existing = mergedRowsMap.get(key);
              existing.quantity += row.quantity;
            }
          }
          const cartRows = Array.from(mergedRowsMap.values());

          if (cartRows.length === 0) {
            throw new Error(`Aucun produit valide trouvé dans la commande de ${name}`);
          }

          const cartRes = await CardService.create({
            id_customer: customerId,
            id_currency: 1,
            id_lang: 1,
            id_address_delivery: addressId,
            id_address_invoice: addressId,
            id_carrier: defaultCarrierId,
            associations: { cart_rows: cartRows }
          });
          let cartId = cartRes?.cart?.id || cartRes?.id;
          if (!cartId) {
            const fallbackCarts = await CardService.getByCustomer(customerId);
            cartId = fallbackCarts?.[0]?.id || null;
          }
          if (!cartId) {
            throw new Error(`Impossible de récupérer un identifiant de panier pour ${name}`);
          }

          const rawEtat = (etat || "").trim();
          const etatNormalized = rawEtat.toLowerCase();
          const isDelivered = etatNormalized === "livré" || etatNormalized === "livre" || etatNormalized === "livrer";
          const isCanceled = etatNormalized === "annuler" || etatNormalized === "annulé" || etatNormalized === "annule";

          if (!rawEtat) {
            addLog(`  -> Panier #${cartId} créé sans commande (état vide dans CSV).`);
            continue;
          }

          // Calculate Cart total
          let totalPaidTtc = 0;
          let totalPaidHt = 0;

          cartRows.forEach(cRow => {
            const unitPriceTtc = cRow.basePriceTtc || 0;
            const taxeRate = cRow.taxeRate || 0;
            totalPaidTtc += unitPriceTtc * cRow.quantity;
            totalPaidHt += (unitPriceTtc / (1 + taxeRate / 100)) * cRow.quantity;
          });

          // 4. Map Order Status
          let currentState = 2; // Default: Paiement accepté
          if (isDelivered) {
            currentState = 5;
          } else if (isCanceled) {
            currentState = 6;
          }

          const orderRows = cartRows.map(cRow => ({
            product_id: cRow.id_product,
            product_attribute_id: cRow.id_product_attribute,
            product_quantity: cRow.quantity,
            product_name: cRow.name,
            product_reference: cRow.reference,
            product_price: Number((cRow.basePriceTtc || 0).toFixed(6)),
            unit_price_tax_incl: Number((cRow.basePriceTtc || 0).toFixed(6)),
            unit_price_tax_excl: Number(((cRow.basePriceTtc || 0) / (1 + (cRow.taxeRate || 0) / 100)).toFixed(6))
          }));

          addLog(`  -> Validation de la commande (État: ${rawEtat || "Paiement accepté"})`);
          const orderRes = await OrderService.create({
            id_address_delivery: addressId,
            id_address_invoice: addressId,
            id_cart: cartId,
            id_currency: 1,
            id_lang: 1,
            id_customer: customerId,
            id_carrier: defaultCarrierId,
            id_shop: 1,
            id_shop_group: 0,
            current_state: currentState,
            module: PAYMENT_MODULE_NAME,
            module_name: PAYMENT_MODULE_NAME,
            payment: "Paiement par virement bancaire",
            total_paid: Number(totalPaidTtc.toFixed(6)),
            total_paid_real: Number(totalPaidTtc.toFixed(6)),
            total_products: Number(totalPaidHt.toFixed(6)),
            total_products_wt: Number(totalPaidTtc.toFixed(6)),
            conversion_rate: 1,
            total_paid_tax_incl: Number(totalPaidTtc.toFixed(6)),
            total_paid_tax_excl: Number(totalPaidHt.toFixed(6)),
            total_shipping: 0,
            total_shipping_tax_incl: 0,
            total_shipping_tax_excl: 0,
            valid: currentState === 6 ? 0 : 1,
            secure_key: customerSecureKeyMap[email] || undefined,
            associations: { order_rows: orderRows }
          });

          const orderId = orderRes?.order?.id || orderRes?.id;
          if (orderId && !isDelivered) {
            addLog(`  -> Réajustement de stock pour commande non livrée #${orderId} (restauration des quantités)`);
            for (const row of orderRows) {
              const prodId = row.product_id;
              const attrId = row.product_attribute_id || 0;
              const qty = Number(row.product_quantity) || 0;

              const adjustStock = async (pId: number, aId: number, q: number) => {
                const stockRow = await StockAvailableService.getByProductAndAttribute(pId, aId);
                const currentStock = Number(stockRow?.quantity) || 0;
                const stockId = stockRow?.id;
                const newStock = currentStock + q;

                if (stockId) {
                  await StockAvailableService.update(stockId, {
                    id: stockId,
                    quantity: newStock,
                    id_product: pId,
                    id_product_attribute: aId,
                    id_shop: 1,
                    id_shop_group: 0
                  });
                } else {
                  await StockAvailableService.upsert({
                    id_product: pId,
                    id_product_attribute: aId,
                    quantity: newStock,
                    id_shop: 1,
                    id_shop_group: 0,
                    out_of_stock: 2,
                    depends_on_stock: 0
                  });
                }
              };

              await adjustStock(prodId, attrId, qty);
              if (attrId > 0) {
                await adjustStock(prodId, 0, qty);
              }
            }
          }
          if (orderId) {
            try {
              await OrderService.updateState(orderId, currentState);
              addLog(`  -> Statut mis à jour à ${currentState} pour la commande #${orderId}`);
            } catch (stateErr: any) {
              addLog(`  -> Avertissement: Impossible de définir le statut de la commande #${orderId}: ${stateErr.message}`);
            }
          }
          localSuccessOrders++;
          setSuccessCount(prev => ({ ...prev, orders: localSuccessOrders }));
        } catch (e: any) {
          reportError("Commande", `Client: ${name} (${email})`, e, row);
        }
      }

      setStatus("success");
      setProgressMsg("Importation terminée !");
      addLog(`Importation complétée: ${localSuccessProducts} produits, ${localSuccessCombinations} déclinaisons, ${localSuccessOrders} commandes importés avec succès. (${localErrors.length} erreurs détectées)`);
    } catch (err: any) {
      console.error("Critical Import failure:", err);
      setStatus("error");
      setProgressMsg("Erreur critique durant le déroulement de l'importation.");
      reportError("Général", "Pipeline d'importation", err.message || "Erreur de connexion", null);
    }
  };

  return (
    <div className="import-container">
      <div className="import-card">
        <div className="import-header">
          <h1>Importateur de données PrestaShop</h1>
          <p>Chargez vos fichiers CSV et ZIP pour synchroniser les produits, déclinaisons, images et commandes.</p>
        </div>

        <div className="import-settings">
          <h3>Paramètres de l'import</h3>
          <div className="settings-grid">
            <div className="setting-group">
              <label htmlFor="field-sep">Séparateur de champs CSV</label>
              <input
                id="field-sep"
                type="text"
                maxLength={1}
                value={fieldSeparator}
                onChange={(e) => setFieldSeparator(e.target.value)}
              />
            </div>
            <div className="setting-group">
              <label htmlFor="multi-sep">Séparateur à valeurs multiples</label>
              <input
                id="multi-sep"
                type="text"
                maxLength={1}
                value={multiValueSeparator}
                onChange={(e) => setMultiValueSeparator(e.target.value)}
              />
            </div>
            <div className="setting-group" style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'flex-start' }}>
              <button
                type="button"
                onClick={handlePreloadDefaultFiles}
                className="preload-btn"
                style={{
                  padding: '10px 16px',
                  backgroundColor: '#3b82f6',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: '0.85rem',
                  transition: 'background-color 0.2s',
                  height: '42px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  marginBottom: '4px'
                }}
              >
                📥 Charger Fichiers Locaux
              </button>
            </div>
            <div className="setting-group checkbox-group" style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: '2' }}>
              <input
                id="reset-before"
                type="checkbox"
                checked={resetBeforeImport}
                onChange={(e) => setResetBeforeImport(e.target.checked)}
                style={{ width: '20px', height: '20px', cursor: 'pointer', margin: 0 }}
              />
              <label htmlFor="reset-before" style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <span style={{ fontWeight: 700, color: '#dc2626', fontSize: '0.9rem' }}>Réinitialiser la base avant l'import</span>
                <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>Vide tous les produits, déclinaisons, catégories et commandes existants.</span>
              </label>
            </div>
            <div className="setting-group checkbox-group" style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: '2' }}>
              <input
                id="skip-images"
                type="checkbox"
                checked={skipImageImport}
                onChange={(e) => {
                  const checked = e.target.checked;
                  setSkipImageImport(checked);
                  if (checked) {
                    setZipFile(null);
                  }
                }}
                style={{ width: '20px', height: '20px', cursor: 'pointer', margin: 0 }}
              />
              <label htmlFor="skip-images" style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <span style={{ fontWeight: 700, color: '#111827', fontSize: '0.9rem' }}>Ne pas importer les images</span>
                <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>Désactive l'import des images produits depuis le ZIP.</span>
              </label>
            </div>
          </div>
        </div>

        <div className="files-grid">
          <div className={`file-upload-box ${productFile ? "active" : ""}`}>
            <div className="box-icon">📊</div>
            <div className="box-details">
              <h4>CSV Produits</h4>
              <p>{productFile ? productFile.name : "Sélectionnez le fichier produit"}</p>
            </div>
            <label className="file-select-label">
              Choisir
              <input type="file" accept=".csv" onChange={(e) => handleFileChange(e, "product")} />
            </label>
          </div>

          <div className={`file-upload-box ${combinationFile ? "active" : ""}`}>
            <div className="box-icon">⚙️</div>
            <div className="box-details">
              <h4>CSV Déclinaisons</h4>
              <p>{combinationFile ? combinationFile.name : "Sélectionnez le fichier déclinaison"}</p>
            </div>
            <label className="file-select-label">
              Choisir
              <input type="file" accept=".csv" onChange={(e) => handleFileChange(e, "combination")} />
            </label>
          </div>

          <div className={`file-upload-box ${orderFile ? "active" : ""}`}>
            <div className="box-icon">🛍️</div>
            <div className="box-details">
              <h4>CSV Commandes</h4>
              <p>{orderFile ? orderFile.name : "Sélectionnez le fichier commandes"}</p>
            </div>
            <label className="file-select-label">
              Choisir
              <input type="file" accept=".csv" onChange={(e) => handleFileChange(e, "order")} />
            </label>
          </div>

          <div className={`file-upload-box ${zipFile ? "active" : ""}`}>
            <div className="box-icon">🖼️</div>
            <div className="box-details">
              <h4>ZIP Images</h4>
              <p>{skipImageImport ? "Import des images désactivé" : (zipFile ? zipFile.name : "images.zip (requis)")}</p>
            </div>
            <label className="file-select-label">
              Choisir
              <input
                type="file"
                accept=".zip"
                onChange={(e) => handleFileChange(e, "zip")}
                disabled={skipImageImport}
              />
            </label>
          </div>
        </div>

        <div className="import-action">
          <button
            className="import-btn"
            onClick={handleImport}
            disabled={status === "importing" || !productFile || !combinationFile || !orderFile || (!skipImageImport && !zipFile)}
          >
            {status === "importing" ? "Importation en cours..." : "Lancer l'importation"}
          </button>
        </div>

        {(status === "importing" || status === "success" || status === "error") && (
          <div className="import-progress-area">
            <div className="progress-status">
              <span className={`status-tag ${status}`}>{status}</span>
              <p className="progress-message">{progressMsg}</p>
            </div>

            <div className="stats-dashboard" style={{ display: 'flex', gap: '20px', marginBottom: '20px' }}>
              <div className="stat-card" style={{ flex: 1, backgroundColor: '#f3f4f6', padding: '12px 16px', borderRadius: '8px', borderLeft: '4px solid #4f46e5' }}>
                <div style={{ fontSize: '0.8rem', color: '#6b7280', fontWeight: 600 }}>Produits Importés</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#1f2937' }}>{successCount.products}</div>
              </div>
              <div className="stat-card" style={{ flex: 1, backgroundColor: '#f3f4f6', padding: '12px 16px', borderRadius: '8px', borderLeft: '4px solid #10b981' }}>
                <div style={{ fontSize: '0.8rem', color: '#6b7280', fontWeight: 600 }}>Déclinaisons Importées</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#1f2937' }}>{successCount.combinations}</div>
              </div>
              <div className="stat-card" style={{ flex: 1, backgroundColor: '#f3f4f6', padding: '12px 16px', borderRadius: '8px', borderLeft: '4px solid #d97706' }}>
                <div style={{ fontSize: '0.8rem', color: '#6b7280', fontWeight: 600 }}>Commandes Importées</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#1f2937' }}>{successCount.orders}</div>
              </div>
              <div className="stat-card" style={{ flex: 1, backgroundColor: '#fef2f2', padding: '12px 16px', borderRadius: '8px', borderLeft: '4px solid #ef4444' }}>
                <div style={{ fontSize: '0.8rem', color: '#b91c1c', fontWeight: 600 }}>Échecs / Erreurs</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#ef4444' }}>{errorsList.length}</div>
              </div>
            </div>

            <div className="console-terminal" style={{ marginBottom: '24px' }}>
              <div className="terminal-header">
                <span>Terminal d'importation</span>
                <span className="dot-green"></span>
              </div>
              <div className="terminal-body">
                {logs.map((log, idx) => (
                  <div key={idx} className="log-line">{log}</div>
                ))}
              </div>
            </div>

            {errorsList.length > 0 && (
              <div className="errors-panel" style={{ marginTop: '24px', backgroundColor: '#fff', border: '1px solid #fee2e2', borderRadius: '12px', overflow: 'hidden' }}>
                <div className="errors-panel-header" style={{ backgroundColor: '#fef2f2', padding: '14px 20px', borderBottom: '1px solid #fee2e2', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: '#b91c1c', fontWeight: 800, fontSize: '0.95rem' }}>⚠️ Rapport des Lignes en Échec ({errorsList.length})</span>
                  <span style={{ fontSize: '0.8rem', color: '#991b1b', backgroundColor: '#fee2e2', padding: '4px 10px', borderRadius: '20px', fontWeight: 700 }}>Action Recommandée: Vérifier les lignes indiquées dans les fichiers CSV</span>
                </div>
                <div className="errors-panel-body" style={{ maxHeight: '300px', overflowY: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', textAlign: 'left' }}>
                    <thead>
                      <tr style={{ backgroundColor: '#fafafa', borderBottom: '1px solid #e5e7eb' }}>
                        <th style={{ padding: '12px 16px', color: '#4b5563', fontWeight: 700 }}>Étape</th>
                        <th style={{ padding: '12px 16px', color: '#4b5563', fontWeight: 700 }}>Identifiant</th>
                        <th style={{ padding: '12px 16px', color: '#4b5563', fontWeight: 700 }}>Description de l'erreur</th>
                        <th style={{ padding: '12px 16px', color: '#4b5563', fontWeight: 700 }}>Données de la ligne</th>
                      </tr>
                    </thead>
                    <tbody>
                      {errorsList.map((err, i) => (
                        <tr key={i} style={{ borderBottom: '1px solid #f3f4f6' }}>
                          <td style={{ padding: '12px 16px', color: '#dc2626', fontWeight: 700 }}>{err.type}</td>
                          <td style={{ padding: '12px 16px', color: '#1f2937', fontWeight: 600 }}>{err.identifier}</td>
                          <td style={{ padding: '12px 16px', color: '#6b7280', fontStyle: 'italic' }}>{err.error}</td>
                          <td style={{ padding: '12px 16px', color: '#4b5563', fontFamily: 'monospace', fontSize: '0.75rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '300px' }}>
                            {err.row ? JSON.stringify(err.row) : "N/A"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Import;
