# Statistiques & Monitoring (Backoffice)

## Logique Métier
Aide à la prise de décision (Business Intelligence). Aiguille l'admin sur la santé financière de l'entreprise : Evolution journalière ou mensuelle du C.A., top des ventes, et états des stocks critiques.

## Interfaces & Types Communs
*   `StatsDaily` / `StatsGlobal` : Regroupements et agrégations (ex: `total_sales`, `orders_count`).

## Fonctions Principales
*   **Extraction & Agrégation (`fetchAggregatedData()`)** : Utilise les APIs sur les commandes et les filtre par date/temps pour en extraire des sommes ou des moyennes.
*   **`renderCharts()`** : Implémentation de bibliothèques (Recharts ou Chart.js) appelées via des composants pour afficher graphiquement les ventes de manière temporelle ("stock_daily_evolution").
*   **Calcul des KPIs** : Fonctions internes additionnant, par exemple, le total du chiffre d'affaires du mois en cours comparé au mois dernier.
