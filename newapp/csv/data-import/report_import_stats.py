#!/usr/bin/env python3
from __future__ import annotations

import argparse
import csv
import re
from collections import Counter, defaultdict
from dataclasses import dataclass
from pathlib import Path
from typing import Dict, Iterable, List


BASE_DIR = Path(__file__).resolve().parent
PRODUCTS_FILE = BASE_DIR / "import-csv-data-18-mai-26 - produit.csv"
DECLINAISON_FILE = BASE_DIR / "import-csv-data-18-mai-26 - produit_declinaison.csv"
ORDERS_FILE = BASE_DIR / "import-csv-data-18-mai-26 - commande.csv"


@dataclass(frozen=True)
class AchatLine:
    reference: str
    quantity: int
    attribute: str


def read_csv_rows(path: Path) -> List[Dict[str, str]]:
    with path.open("r", encoding="utf-8-sig", newline="") as handle:
        return list(csv.DictReader(handle))


def clean_text(value: str | None) -> str:
    return (value or "").strip()


def parse_achat(raw: str | None) -> List[AchatLine]:
    if not raw:
        return []

    text = raw.strip()
    if text.startswith("[") and text.endswith("]"):
        text = text[1:-1]

    # Normalise the doubled quotes coming from CSV escaping.
    text = text.replace('""', '"')

    pattern = re.compile(r'"([^"]*)"\s*;\s*(\d+)\s*;\s*"([^"]*)"')
    lines: List[AchatLine] = []
    for reference, quantity, attribute in pattern.findall(text):
        lines.append(
            AchatLine(
                reference=reference.strip(),
                quantity=int(quantity),
                attribute=attribute.strip(),
            )
        )
    return lines


def normalize_status(value: str | None) -> str:
    status = clean_text(value).lower()
    if not status:
        return "vide"
    if status in {"paiement accepté", "paiement accepte"}:
        return "paiement accepté"
    if status in {"livré", "livre"}:
        return "livré"
    if status in {"annuler", "annulé", "annule"}:
        return "annulé"
    return status


def build_declination_maps(rows: Iterable[Dict[str, str]]):
    combo_values: Dict[str, set[str]] = defaultdict(set)
    simple_refs: set[str] = set()
    all_refs: set[str] = set()
    combo_refs: set[str] = set()

    for row in rows:
        ref = clean_text(row.get("reference"))
        spec = clean_text(row.get("specificité"))
        value = clean_text(row.get("karazany"))

        if not ref:
            continue

        all_refs.add(ref)
        if spec and value:
            combo_refs.add(ref)
            combo_values[ref].add(value.lower())
        elif not spec and not value:
            simple_refs.add(ref)

    # If a reference has at least one real combination row, it should be treated as a combo product.
    simple_refs = {ref for ref in simple_refs if ref not in combo_refs}
    return all_refs, combo_refs, combo_values, simple_refs


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Report CSV import statistics for PrestaShop tables, carts and orders."
    )
    parser.add_argument("--products", type=Path, default=PRODUCTS_FILE)
    parser.add_argument("--declinaisons", type=Path, default=DECLINAISON_FILE)
    parser.add_argument("--orders", type=Path, default=ORDERS_FILE)
    parser.add_argument(
        "--hide-order-quantities",
        action="store_true",
        help="Do not print per-order product quantities and cumulative totals.",
    )
    args = parser.parse_args()

    products = read_csv_rows(args.products)
    declinaisons = read_csv_rows(args.declinaisons)
    orders = read_csv_rows(args.orders)

    product_refs = {clean_text(row.get("reference")) for row in products if clean_text(row.get("reference"))}
    all_decl_refs, combo_refs, combo_values, simple_refs = build_declination_maps(declinaisons)

    order_status_counter = Counter()
    unique_customers = set()
    unique_addresses = set()
    customer_order_counter = Counter()
    total_order_lines = 0
    total_quantity = 0
    valid_order_lines = 0
    invalid_order_lines = 0
    fully_valid_orders = 0
    orders_with_any_valid_line = 0
    repeated_product_refs = Counter()
    repeated_combo_keys = Counter()
    cumulative_paid_qty = Counter()
    cumulative_delivered_qty = Counter()
    per_order_details: List[str] = []

    # Build initial stock per product from declinaisons file
    initial_stock_by_ref = Counter()
    detailed_stock_entries = defaultdict(list)  # ref -> list of (attribute, qty, row_index)
    for i, drow in enumerate(declinaisons, start=1):
        ref = clean_text(drow.get("reference"))
        if not ref:
            continue
        try:
            qty = int(clean_text(drow.get("stock_initial") or "0"))
        except ValueError:
            qty = 0
        attr = clean_text(drow.get("karazany")) or ""
        initial_stock_by_ref[ref] += qty
        detailed_stock_entries[ref].append((attr, qty, i))

    for idx, row in enumerate(orders, start=1):
        email = clean_text(row.get("email")).lower()
        date_value = clean_text(row.get("date"))
        address = clean_text(row.get("adresse"))
        unique_customers.add(email)
        if email:
            customer_order_counter[email] += 1
        if address:
            unique_addresses.add(address)

        status = normalize_status(row.get("etat"))
        order_status_counter[status] += 1

        achat_lines = parse_achat(row.get("achat"))
        total_order_lines += len(achat_lines)
        line_validity: List[bool] = []
        has_valid_line = False
        order_product_qty = Counter()
        invalid_in_order = 0

        for item in achat_lines:
            total_quantity += item.quantity
            repeated_product_refs[item.reference] += 1

            if item.attribute:
                repeated_combo_keys[f"{item.reference}::{item.attribute.lower()}"] += 1

            if item.reference not in product_refs:
                invalid_order_lines += 1
                line_validity.append(False)
                invalid_in_order += 1
                continue

            if item.attribute:
                is_valid_combo = item.reference in combo_refs and item.attribute.lower() in combo_values.get(item.reference, set())
                if is_valid_combo:
                    valid_order_lines += 1
                    line_validity.append(True)
                    has_valid_line = True
                    order_product_qty[item.reference] += item.quantity
                else:
                    invalid_order_lines += 1
                    line_validity.append(False)
                    invalid_in_order += 1
            else:
                # Simple products are valid when the reference exists and the declination file marks them as simple.
                is_valid_simple = item.reference in simple_refs or item.reference not in combo_refs
                if is_valid_simple:
                    valid_order_lines += 1
                    line_validity.append(True)
                    has_valid_line = True
                    order_product_qty[item.reference] += item.quantity
                else:
                    invalid_order_lines += 1
                    line_validity.append(False)
                    invalid_in_order += 1

        for ref, qty in order_product_qty.items():
            if status in {"paiement accepté", "livré"}:
                cumulative_paid_qty[ref] += qty
            if status == "livré":
                cumulative_delivered_qty[ref] += qty

        if order_product_qty:
            per_order_display = ", ".join(
                f"{ref}={qty}" for ref, qty in sorted(order_product_qty.items())
            )
            paid_display = ", ".join(
                f"{ref}={cumulative_paid_qty[ref]}" for ref in sorted(order_product_qty.keys())
            )
            delivered_display = ", ".join(
                f"{ref}={cumulative_delivered_qty[ref]}" for ref in sorted(order_product_qty.keys())
            )
        else:
            per_order_display = "aucune ligne valide"
            paid_display = "aucun changement"
            delivered_display = "aucun changement"

        per_order_details.append(
            f"Commande #{idx:03d} | date={date_value or '-'} | client={email or '-'} | etat={status} | "
            f"valides={sum(order_product_qty.values())} | invalides={invalid_in_order}"
            f"\n  - qte commande: {per_order_display}"
            f"\n  - qte payee: {paid_display}"
            f"\n  - qte livree: {delivered_display}"
        )

        if has_valid_line:
            orders_with_any_valid_line += 1

        if achat_lines and all(line_validity):
            fully_valid_orders += 1

    product_rows = len(products)
    declination_rows = len(declinaisons)
    declination_combo_rows = sum(1 for row in declinaisons if clean_text(row.get("specificité")) and clean_text(row.get("karazany")))
    declination_simple_rows = declination_rows - declination_combo_rows
    order_rows = len(orders)
    orders_with_empty_status = order_status_counter["vide"]
    orders_with_paid_or_delivered = order_status_counter["paiement accepté"] + order_status_counter["livré"]

    print("=== Résumé d'import CSV ===")
    print(f"Produits à créer: {product_rows}")
    print(f"Références produits uniques: {len(product_refs)}")
    print(f"Déclinaisons / stocks à créer: {declination_rows}")
    print(f"  - Lignes avec variantes: {declination_combo_rows}")
    print(f"  - Lignes simples sans variante: {declination_simple_rows}")
    print(f"Références produits concernées par les déclinaisons: {len(all_decl_refs)}")
    print()
    print(f"Commandes à lire: {order_rows}")
    print(f"Clients uniques: {len(unique_customers)}")
    print(f"Adresses uniques: {len(unique_addresses)}")
    print(f"Lignes d'achat totales: {total_order_lines}")
    print(f"Quantité totale commandée: {total_quantity}")
    print()
    print("=== Validation des paniers / commandes ===")
    print(f"Lignes d'achat valides: {valid_order_lines}")
    print(f"Lignes d'achat invalides: {invalid_order_lines}")
    print(f"Paniers totalement valides: {fully_valid_orders}")
    print(f"Commandes avec au moins une ligne valide: {orders_with_any_valid_line}")
    print(f"Commandes avec statut renseigné: {order_rows - orders_with_empty_status}")
    print(f"Commandes paiement accepté ou livré: {orders_with_paid_or_delivered}")
    print(f"Commandes sans statut: {orders_with_empty_status}")
    print()
    print("=== Réutilisations / doublons utiles ===")
    print(f"Références produit répétées dans les commandes: {sum(1 for count in repeated_product_refs.values() if count > 1)}")
    print(f"Paires produit/attribut répétées: {sum(1 for count in repeated_combo_keys.values() if count > 1)}")
    print(f"Clients répétés dans plusieurs commandes: {sum(1 for count in customer_order_counter.values() if count > 1)}")

    if not args.hide_order_quantities:
        print()
        print("=== Quantité de chaque produit après chaque commande (cumul) ===")
        for line in per_order_details:
            print(line)

    # Stock report
    print()
    print("=== Rapport Stock Produit (initial vs commandes -> attendu) ===")
    stock_rows = []
    for row in products:
        ref = clean_text(row.get("reference"))
        name = clean_text(row.get("nom")) or "-"
        init_stock = initial_stock_by_ref.get(ref, 0)
        paid = cumulative_paid_qty.get(ref, 0)
        delivered = cumulative_delivered_qty.get(ref, 0)
        expected = init_stock - delivered
        warn = "-" if expected >= 0 else "NEGATIF"
        stock_rows.append((ref, name, init_stock, paid, delivered, expected, warn))

    ref_label = "Réf"
    name_label = "Nom"
    init_label = "Stock init"
    paid_label = "Qté payée"
    delivered_label = "Qté livrée"
    expected_label = "Stock att"
    warn_label = "Alerte"

    ref_width = max([len(ref_label)] + [len(ref) for ref, _, _, _, _, _, _ in stock_rows])
    name_width = max([len(name_label)] + [len(name) for _, name, _, _, _, _, _ in stock_rows])
    init_width = max([len(init_label)] + [len(str(init_stock)) for _, _, init_stock, _, _, _, _ in stock_rows])
    paid_width = max([len(paid_label)] + [len(str(paid)) for _, _, _, paid, _, _, _ in stock_rows])
    delivered_width = max([len(delivered_label)] + [len(str(delivered)) for _, _, _, _, delivered, _, _ in stock_rows])
    expected_width = max([len(expected_label)] + [len(str(expected)) for _, _, _, _, _, expected, _ in stock_rows])
    warn_width = max([len(warn_label)] + [len(warn) for _, _, _, _, _, _, warn in stock_rows])

    header = (
        f"{ref_label:<{ref_width}} "
        f"{name_label:<{name_width}} "
        f"{init_label:>{init_width}} "
        f"{paid_label:>{paid_width}} "
        f"{delivered_label:>{delivered_width}} "
        f"{expected_label:>{expected_width}} "
        f"{warn_label:<{warn_width}}"
    )
    print(header)
    for ref, name, init_stock, paid, delivered, expected, warn in stock_rows:
        print(
            f"{ref:<{ref_width}} "
            f"{name:<{name_width}} "
            f"{init_stock:>{init_width}} "
            f"{paid:>{paid_width}} "
            f"{delivered:>{delivered_width}} "
            f"{expected:>{expected_width}} "
            f"{warn:<{warn_width}}"
        )

    # Detailed per-ref stock entries (to spot duplicate stock_available rows)
    print()
    print("=== Entrées de stock détaillées par référence (données CSV déclinaison) ===")
    for ref, entries in sorted(detailed_stock_entries.items()):
        if len(entries) <= 1:
            continue
        print(f"Réf {ref} — {len(entries)} entrées:")
        for attr, qty, idx in entries:
            attr_label = attr or "(simple)"
            print(f"  - ligne#{idx}: attr={attr_label} qty={qty}")

    # Calcul dynamique par catégorie
    category_stats = defaultdict(lambda: {"physique": 0, "reservee": 0})
    for row in products:
        ref = clean_text(row.get("reference"))
        cat = clean_text(row.get("categorie"))
        if ref and cat:
            init_stock = initial_stock_by_ref.get(ref, 0)
            # On considère comme "réservée" toute la quantité livrée (dans l'historique d'import)
            ordered = cumulative_delivered_qty.get(ref, 0)
            category_stats[cat]["physique"] += init_stock
            category_stats[cat]["reservee"] += ordered

    print()
    print("Catégorie\tQté physique\tQté livrée\tQté disponible")
    for cat, stats in sorted(category_stats.items()):
        phys = stats["physique"]
        res = stats["reservee"]
        disp = phys - res
        print(f"{cat}\t{phys}\t{res}\t{disp}")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())