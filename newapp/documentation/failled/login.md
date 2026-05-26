# Documentation des Erreurs et Échecs de Connexion (Login / Authentification)

Dans PrestaShop, les erreurs de l'API REST (Web Service) sont retournées sous forme de structure XML standardisée avec des balises `<errors>` et `<error>`.

---

## 1. Structure Générale d'une Erreur PrestaShop (Format XML)

Chaque fois qu'une requête échoue au niveau de l'API PrestaShop, la réponse retourne un code HTTP d'erreur (ex: `400 Bad Request`, `401 Unauthorized`, `404 Not Found`, etc.) avec le corps XML suivant :

```xml
<?xml version="1.0" encoding="UTF-8"?>
<prestashop xmlns:xlink="http://www.w3.org/1999/xlink">
    <errors>
        <error>
            <code><![CDATA[CODE_ERREUR]]></code>
            <message><![CDATA[Message explicatif de l'erreur]]></message>
        </error>
    </errors>
</prestashop>
```

---

## 2. Cas d'Échec : Clé API non valide ou manquante (401 Unauthorized)
Si la clé de sécurité du Web Service (`ws_key`) passée dans l'URL ou dans l'authentification HTTP Basic est incorrecte ou expirée.

**Requête :**
```http
GET http://localhost/api/customers?ws_key=MAUVAISE_CLE_API
```

**Réponse (HTTP 401 Unauthorized) :**
```xml
<?xml version="1.0" encoding="UTF-8"?>
<prestashop xmlns:xlink="http://www.w3.org/1999/xlink">
    <errors>
        <error>
            <code><![CDATA[1]]></code>
            <message><![CDATA[Access denied for this key / Bad API key]]></message>
        </error>
    </errors>
</prestashop>
```

---

## 3. Cas d'Échec : Client Introuvable (Email inexistant)
Lors du processus de login, la première étape consiste généralement à rechercher le client via son adresse email. Si aucun compte ne correspond à cet email, l'API retourne une liste vide.

**Requête :**
```http
GET http://localhost/api/customers?filter[email]=email_inexistant@example.com&display=full&ws_key=A9IBmZ4Ake4NJ36RPAjSJ8sVsLxQ4CGn
```

**Réponse (HTTP 200 OK - Liste Vide) :**
```xml
<?xml version="1.0" encoding="UTF-8"?>
<prestashop xmlns:xlink="http://www.w3.org/1999/xlink">
    <customers/>
</prestashop>
```
*Note : Si la balise `<customers>` est vide ou absente, cela signifie que le compte n'existe pas.*

---

## 4. Cas d'Échec : Validation de Données / Mot de passe invalide
Si vous tentez de créer ou mettre à jour un client avec des paramètres incorrects (par exemple, un mot de passe trop court ou mal formaté).

**Requête (POST/PUT sur `/api/customers`) avec mot de passe vide ou invalide :**
```xml
<?xml version="1.0" encoding="UTF-8"?>
<prestashop xmlns:xlink="http://www.w3.org/1999/xlink">
    <customer>
        <lastname>Dupont</lastname>
        <firstname>Jean</firstname>
        <email>jean.dupont@example.com</email>
        <passwd></passwd> <!-- Mot de passe invalide -->
        <active>1</active>
    </customer>
</prestashop>
```

**Réponse (HTTP 400 Bad Request) :**
```xml
<?xml version="1.0" encoding="UTF-8"?>
<prestashop xmlns:xlink="http://www.w3.org/1999/xlink">
    <errors>
        <error>
            <code><![CDATA[85]]></code>
            <message><![CDATA[Validation error: "Property Customer->passwd is empty."]]></message>
        </error>
    </errors>
</prestashop>
```

---

## 5. Gestion des erreurs dans le code React (Exemple)

Voici comment intercepter et traiter ces échecs de connexion ou d'appel API dans votre application React :

```typescript
import axios from "axios";

async function loginUser(email, password) {
    try {
        // 1. Rechercher le client par email
        const response = await axios.get(`http://localhost/api/customers`, {
            params: {
                filter: { email: email },
                display: "full",
                output_format: "JSON",
                ws_key: "A9IBmZ4Ake4NJ36RPAjSJ8sVsLxQ4CGn"
            }
        });

        const customers = response.data.customers;

        if (!customers || customers.length === 0) {
            throw new Error("Aucun compte associé à cet email.");
        }

        const customer = customers[0];
        
        // 2. Vérification locale du mot de passe (si hashé/géré côté client ou via un endpoint d'authentification externe)
        // Note: PrestaShop hash les mots de passe avec bcrypt ou md5+cookie_key.
        // Si vous utilisez un script d'authentification personnalisé :
        if (customer.passwd !== password) { 
            throw new Error("Mot de passe incorrect.");
        }

        return customer; // Connexion réussie

    } catch (error) {
        console.error("Échec de la connexion :", error.message);
        return {
            success: false,
            message: error.message || "Une erreur est survenue lors de l'authentification."
        };
    }
}
```
