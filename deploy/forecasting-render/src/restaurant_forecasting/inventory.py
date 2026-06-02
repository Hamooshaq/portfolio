from __future__ import annotations

import hashlib
import math
from itertools import cycle

import numpy as np
import pandas as pd

SUPPLIER_PROFILES = {
    "Supplier A": {
        "email": "orders.suppliera@example.com",
        "contact_person": "Alicia Pratama",
        "phone": "+62-811-1000-0001",
        "lead_time_days": 1,
    },
    "Supplier B": {
        "email": "orders.supplierb@example.com",
        "contact_person": "Bima Santoso",
        "phone": "+62-811-1000-0002",
        "lead_time_days": 2,
    },
    "Supplier C": {
        "email": "orders.supplierc@example.com",
        "contact_person": "Clara Wijaya",
        "phone": "+62-811-1000-0003",
        "lead_time_days": 4,
    },
}

UNIT_DAILY_USAGE_FLOORS = {
    "kg": 0.15,
    "liter": 0.20,
    "pieces": 2.0,
}


def latest_inventory_snapshot(inventory_df: pd.DataFrame) -> pd.DataFrame:
    latest_date = inventory_df["Date"].max()
    latest = inventory_df[inventory_df["Date"] == latest_date].copy()
    latest = latest.rename(columns={"Date": "snapshot_date"})
    return latest.sort_values("Item_Name").reset_index(drop=True)


def build_historical_ingredient_usage(sales_df: pd.DataFrame, recipe_mapping_df: pd.DataFrame) -> pd.DataFrame:
    merged = sales_df.merge(recipe_mapping_df, on="menu_item_name", how="inner")
    merged["historical_ingredient_usage"] = merged["quantity_sold"] * merged["quantity_per_order"]

    historical_usage = (
        merged.groupby(["date", "ingredient_name", "unit"], as_index=False)
        .agg(
            historical_ingredient_usage=("historical_ingredient_usage", "sum"),
            contributing_menu_items=("menu_item_name", "nunique"),
            covered_menu_quantity=("quantity_sold", "sum"),
        )
        .sort_values(["date", "ingredient_name"])
        .reset_index(drop=True)
    )
    return historical_usage


def ensure_supplier_contacts(
    supplier_contacts_df: pd.DataFrame,
    inventory_df: pd.DataFrame,
    recipe_mapping_df: pd.DataFrame,
) -> pd.DataFrame:
    ingredient_catalog = sorted(recipe_mapping_df["ingredient_name"].dropna().unique())
    supplier_contacts = supplier_contacts_df.copy()

    latest_inventory = latest_inventory_snapshot(inventory_df)
    inventory_supplier_map = latest_inventory.set_index("Item_Name")["Supplier_Name"].to_dict()
    supplier_defaults = cycle(sorted(SUPPLIER_PROFILES))

    existing_rows = {
        ingredient: group.iloc[0].to_dict()
        for ingredient, group in supplier_contacts.groupby("ingredient_name", sort=False)
    }

    rows: list[dict[str, object]] = []
    for ingredient in ingredient_catalog:
        row = existing_rows.get(ingredient, {})
        supplier_name = row.get("supplier_name") or inventory_supplier_map.get(ingredient) or next(supplier_defaults)
        profile = SUPPLIER_PROFILES[supplier_name]

        rows.append(
            {
                "supplier_name": supplier_name,
                "ingredient_name": ingredient,
                "email": row.get("email") or profile["email"],
                "contact_person": row.get("contact_person") or profile["contact_person"],
                "phone": row.get("phone") or profile["phone"],
                "lead_time_days": int(row.get("lead_time_days") or profile["lead_time_days"]),
                "notes": row.get("notes") or f"Dummy supplier record for {ingredient}.",
            }
        )

    return pd.DataFrame(rows).sort_values(["supplier_name", "ingredient_name"]).reset_index(drop=True)


def build_augmented_inventory(
    inventory_df: pd.DataFrame,
    recipe_mapping_df: pd.DataFrame,
    historical_ingredient_usage_df: pd.DataFrame,
    supplier_contacts_df: pd.DataFrame,
) -> pd.DataFrame:
    raw_inventory = inventory_df.copy()
    raw_inventory["Record_Source"] = "Raw Inventory"

    all_dates = sorted(raw_inventory["Date"].drop_duplicates())
    latest_raw_snapshot = latest_inventory_snapshot(raw_inventory)
    existing_items = set(latest_raw_snapshot["Item_Name"].unique())
    max_item_id = int(raw_inventory["Item_ID"].max())
    average_daily_usage = _average_daily_usage_by_ingredient(historical_ingredient_usage_df)
    supplier_lookup = supplier_contacts_df.set_index("ingredient_name").to_dict("index")

    ingredient_units = recipe_mapping_df[["ingredient_name", "unit"]].drop_duplicates().sort_values("ingredient_name")
    synthetic_rows: list[pd.DataFrame] = []

    for offset, ingredient_row in enumerate(ingredient_units.itertuples(index=False), start=1):
        ingredient_name = ingredient_row.ingredient_name
        if ingredient_name in existing_items:
            continue

        unit = ingredient_row.unit
        supplier = supplier_lookup[ingredient_name]
        base_daily_usage = max(average_daily_usage.get(ingredient_name, 0.0), UNIT_DAILY_USAGE_FLOORS.get(unit, 0.10))
        reorder_level = _round_quantity(base_daily_usage * 2.0, unit)
        price_per_unit = _deterministic_price_per_unit(ingredient_name, unit)
        category, subcategory = _infer_inventory_category(ingredient_name)
        seed = _stable_int(ingredient_name)
        phase = (seed % 17) / 3.0
        period = 9 + (seed % 7)

        generated_rows = []
        for date_index, inventory_date in enumerate(all_dates):
            coverage_days = 6.0 + 2.0 * math.sin((date_index + phase) * (2.0 * math.pi / period))
            coverage_days = min(max(coverage_days, 4.0), 8.0)
            current_stock = _round_quantity(base_daily_usage * coverage_days, unit)
            seasonal_factor = round(1.0 + 0.08 * math.sin((date_index + seed % 11) / 5.0), 2)
            waste_percentage = round(1.0 + ((seed % 9) * 0.35) + ((date_index % 5) * 0.15), 2)

            generated_rows.append(
                {
                    "Date": inventory_date,
                    "Item_ID": max_item_id + offset,
                    "Item_Name": ingredient_name,
                    "Category": category,
                    "Subcategory": subcategory,
                    "Unit": unit,
                    "Current_Stock": current_stock,
                    "Reorder_Level": reorder_level,
                    "Daily_Usage": _round_quantity(base_daily_usage, unit),
                    "Lead_Time": int(supplier["lead_time_days"]),
                    "Price_per_Unit": price_per_unit,
                    "Supplier_Name": supplier["supplier_name"],
                    "Seasonal_Factor": seasonal_factor,
                    "Waste_Percentage": waste_percentage,
                    "Record_Source": "Generated Inventory",
                }
            )

        synthetic_rows.append(pd.DataFrame(generated_rows))

    if not synthetic_rows:
        return raw_inventory.sort_values(["Date", "Item_Name"]).reset_index(drop=True)

    augmented_inventory = pd.concat([raw_inventory, *synthetic_rows], ignore_index=True)
    return augmented_inventory.sort_values(["Date", "Item_Name"]).reset_index(drop=True)


def build_ingredient_forecast(menu_forecast_df: pd.DataFrame, recipe_mapping_df: pd.DataFrame) -> pd.DataFrame:
    merged = menu_forecast_df.merge(recipe_mapping_df, on="menu_item_name", how="inner")
    if merged.empty:
        return pd.DataFrame(
            columns=[
                "forecast_date",
                "ingredient_name",
                "unit",
                "projected_ingredient_usage",
                "covered_menu_quantity",
            ]
        )

    merged = merged.copy()
    merged["projected_ingredient_usage"] = merged["predicted_quantity_sold"] * merged["quantity_per_order"]

    ingredient_forecast = (
        merged.groupby(["forecast_date", "ingredient_name", "unit"], as_index=False)
        .agg(
            projected_ingredient_usage=("projected_ingredient_usage", "sum"),
            covered_menu_quantity=("predicted_quantity_sold", "sum"),
        )
        .sort_values(["forecast_date", "projected_ingredient_usage"], ascending=[True, False])
        .reset_index(drop=True)
    )
    return ingredient_forecast


def calculate_mapping_coverage(menu_forecast_df: pd.DataFrame, recipe_mapping_df: pd.DataFrame) -> dict[str, float]:
    mapped_menu_items = set(recipe_mapping_df["menu_item_name"].unique())
    total_forecast_quantity = float(menu_forecast_df["predicted_quantity_sold"].sum())
    covered_forecast_quantity = float(
        menu_forecast_df[menu_forecast_df["menu_item_name"].isin(mapped_menu_items)]["predicted_quantity_sold"].sum()
    )
    coverage_ratio = covered_forecast_quantity / total_forecast_quantity if total_forecast_quantity else 0.0

    return {
        "total_forecast_quantity": total_forecast_quantity,
        "covered_forecast_quantity": covered_forecast_quantity,
        "coverage_ratio": coverage_ratio,
    }


def build_inventory_alerts(
    inventory_df: pd.DataFrame,
    ingredient_forecast_df: pd.DataFrame,
    historical_ingredient_usage_df: pd.DataFrame,
) -> pd.DataFrame:
    latest = latest_inventory_snapshot(inventory_df)
    historical_daily_usage = _average_daily_usage_by_ingredient(historical_ingredient_usage_df)
    history_usage_frame = pd.DataFrame(
        [{"Item_Name": ingredient, "historical_daily_usage": usage} for ingredient, usage in historical_daily_usage.items()]
    )
    if history_usage_frame.empty:
        history_usage_frame = pd.DataFrame(columns=["Item_Name", "historical_daily_usage"])

    if ingredient_forecast_df.empty:
        projected_daily_usage = pd.DataFrame(columns=["Item_Name", "forecast_daily_usage"])
    else:
        horizon_days = ingredient_forecast_df["forecast_date"].nunique()
        projected_daily_usage = (
            ingredient_forecast_df.groupby("ingredient_name", as_index=False)["projected_ingredient_usage"]
            .sum()
            .rename(columns={"ingredient_name": "Item_Name"})
        )
        projected_daily_usage["forecast_daily_usage"] = (
            projected_daily_usage["projected_ingredient_usage"] / max(horizon_days, 1)
        )
        projected_daily_usage = projected_daily_usage[["Item_Name", "forecast_daily_usage"]]

    alerts = latest.merge(history_usage_frame, on="Item_Name", how="left").merge(projected_daily_usage, on="Item_Name", how="left")
    alerts["historical_daily_usage"] = alerts["historical_daily_usage"].fillna(0.0)
    alerts["forecast_daily_usage"] = alerts["forecast_daily_usage"].fillna(0.0)
    alerts["effective_daily_usage"] = alerts[["Daily_Usage", "historical_daily_usage", "forecast_daily_usage"]].max(axis=1)
    alerts["days_of_cover"] = np.where(
        alerts["effective_daily_usage"] > 0,
        alerts["Current_Stock"] / alerts["effective_daily_usage"],
        np.inf,
    )
    alerts["lead_time_demand"] = alerts["effective_daily_usage"] * alerts["Lead_Time"]
    alerts["recommended_reorder_qty"] = np.maximum(
        alerts["lead_time_demand"] + alerts["Reorder_Level"] - alerts["Current_Stock"],
        0.0,
    )
    alerts["estimated_reorder_cost"] = alerts["recommended_reorder_qty"] * alerts["Price_per_Unit"]
    alerts["stock_gap_vs_target"] = alerts["Current_Stock"] - (alerts["lead_time_demand"] + alerts["Reorder_Level"])
    alerts["alert_status"] = alerts.apply(_classify_alert_status, axis=1)

    severity_rank = {"critical": 0, "warning": 1, "healthy": 2}
    alerts["severity_rank"] = alerts["alert_status"].map(severity_rank)

    display_columns = [
        "snapshot_date",
        "Item_Name",
        "Record_Source",
        "Category",
        "Subcategory",
        "Unit",
        "Current_Stock",
        "Reorder_Level",
        "Daily_Usage",
        "historical_daily_usage",
        "forecast_daily_usage",
        "effective_daily_usage",
        "Lead_Time",
        "days_of_cover",
        "recommended_reorder_qty",
        "estimated_reorder_cost",
        "alert_status",
        "Supplier_Name",
        "Price_per_Unit",
        "stock_gap_vs_target",
    ]
    return (
        alerts[display_columns + ["severity_rank"]]
        .sort_values(["severity_rank", "estimated_reorder_cost"], ascending=[True, False])
        .drop(columns="severity_rank")
        .reset_index(drop=True)
    )


def build_supplier_reorders(alerts_df: pd.DataFrame, supplier_contacts_df: pd.DataFrame) -> pd.DataFrame:
    reorder_items = alerts_df[alerts_df["recommended_reorder_qty"] > 0].copy()
    if reorder_items.empty:
        return pd.DataFrame(
            columns=[
                "supplier_name",
                "email",
                "contact_person",
                "phone",
                "lead_time_days",
                "items_to_order",
                "total_reorder_quantity",
                "total_estimated_cost",
                "notes",
            ]
        )

    reorder_items = _attach_supplier_routing(reorder_items, supplier_contacts_df)
    reorder_items["item_summary"] = reorder_items.apply(
        lambda row: f"{row['Item_Name']} ({row['recommended_reorder_qty']:.2f} {row['Unit']})",
        axis=1,
    )

    supplier_summary = (
        reorder_items.groupby(
            ["supplier_name", "email", "contact_person", "phone", "lead_time_days"],
            as_index=False,
        )
        .agg(
            items_to_order=("item_summary", lambda values: "; ".join(values)),
            total_reorder_quantity=("recommended_reorder_qty", "sum"),
            total_estimated_cost=("estimated_reorder_cost", "sum"),
            notes=("notes", "first"),
        )
        .sort_values("total_estimated_cost", ascending=False)
        .reset_index(drop=True)
    )
    return supplier_summary


def build_supplier_order_drafts(alerts_df: pd.DataFrame, supplier_contacts_df: pd.DataFrame) -> pd.DataFrame:
    reorder_items = alerts_df[alerts_df["recommended_reorder_qty"] > 0].copy()
    if reorder_items.empty:
        return pd.DataFrame(
            columns=[
                "supplier_name",
                "email",
                "contact_person",
                "phone",
                "email_subject",
                "email_body",
                "total_reorder_quantity",
                "total_estimated_cost",
            ]
        )

    reorder_items = _attach_supplier_routing(reorder_items, supplier_contacts_df)

    draft_rows: list[dict[str, object]] = []
    order_reference_date = alerts_df["snapshot_date"].max()
    for supplier_name, group in reorder_items.groupby("supplier_name"):
        first_row = group.iloc[0]
        line_items = "\n".join(
            f"- {row.Item_Name}: {row.recommended_reorder_qty:.2f} {row.Unit} "
            f"(estimated cost {row.estimated_reorder_cost:.2f})"
            for row in group.itertuples(index=False)
        )
        subject = f"Central Warehouse Reorder Request - {supplier_name} - {order_reference_date:%Y-%m-%d}"
        body = (
            f"Dear {first_row.contact_person},\n\n"
            "Please prepare the following reorder for the central warehouse that supports all restaurant locations.\n\n"
            f"{line_items}\n\n"
            f"Requested lead time: {int(first_row.lead_time_days)} day(s)\n"
            f"Total estimated order value: {group['estimated_reorder_cost'].sum():.2f}\n\n"
            "Please confirm availability and expected delivery timing.\n\n"
            "Best regards,\n"
            "Central Warehouse Planner"
        )

        draft_rows.append(
            {
                "supplier_name": supplier_name,
                "email": first_row.email,
                "contact_person": first_row.contact_person,
                "phone": first_row.phone,
                "email_subject": subject,
                "email_body": body,
                "total_reorder_quantity": group["recommended_reorder_qty"].sum(),
                "total_estimated_cost": group["estimated_reorder_cost"].sum(),
            }
        )

    return pd.DataFrame(draft_rows).sort_values("total_estimated_cost", ascending=False).reset_index(drop=True)


def _attach_supplier_routing(reorder_items: pd.DataFrame, supplier_contacts_df: pd.DataFrame) -> pd.DataFrame:
    supplier_master = supplier_contacts_df.drop_duplicates("ingredient_name").copy()
    routed = reorder_items.merge(
        supplier_master,
        left_on="Item_Name",
        right_on="ingredient_name",
        how="left",
    )

    fallback_names = routed["Supplier_Name"].where(routed["Supplier_Name"].isin(SUPPLIER_PROFILES), "Supplier A")
    routed["supplier_name"] = routed["supplier_name"].fillna(fallback_names)
    routed["email"] = routed.apply(
        lambda row: row["email"]
        if pd.notna(row["email"]) and str(row["email"]).strip()
        else SUPPLIER_PROFILES[row["supplier_name"]]["email"],
        axis=1,
    )
    routed["contact_person"] = routed.apply(
        lambda row: row["contact_person"]
        if pd.notna(row["contact_person"]) and str(row["contact_person"]).strip()
        else SUPPLIER_PROFILES[row["supplier_name"]]["contact_person"],
        axis=1,
    )
    routed["phone"] = routed.apply(
        lambda row: row["phone"]
        if pd.notna(row["phone"]) and str(row["phone"]).strip()
        else SUPPLIER_PROFILES[row["supplier_name"]]["phone"],
        axis=1,
    )
    routed["lead_time_days"] = routed.apply(
        lambda row: int(row["lead_time_days"])
        if pd.notna(row["lead_time_days"])
        else int(SUPPLIER_PROFILES[row["supplier_name"]]["lead_time_days"]),
        axis=1,
    )
    routed["notes"] = routed["notes"].fillna(
        routed["Item_Name"].map(lambda ingredient: f"Fallback supplier routing for {ingredient}.")
    )
    return routed


def _classify_alert_status(row: pd.Series) -> str:
    if row["Current_Stock"] <= row["Reorder_Level"] or row["days_of_cover"] <= row["Lead_Time"]:
        return "critical"
    if row["days_of_cover"] <= row["Lead_Time"] + 2 or row["Current_Stock"] <= row["Reorder_Level"] * 1.25:
        return "warning"
    return "healthy"


def _average_daily_usage_by_ingredient(historical_ingredient_usage_df: pd.DataFrame) -> dict[str, float]:
    total_days = max(historical_ingredient_usage_df["date"].nunique(), 1)
    usage = (
        historical_ingredient_usage_df.groupby("ingredient_name")["historical_ingredient_usage"]
        .sum()
        .div(total_days)
        .to_dict()
    )
    return {ingredient: float(value) for ingredient, value in usage.items()}


def _stable_int(value: str) -> int:
    digest = hashlib.md5(value.encode("utf-8")).hexdigest()
    return int(digest[:8], 16)


def _round_quantity(value: float, unit: str) -> float:
    if unit == "pieces":
        return float(max(round(value), 1))
    return round(float(value), 2)


def _deterministic_price_per_unit(ingredient_name: str, unit: str) -> float:
    seed = _stable_int(ingredient_name)
    base_price = {
        "kg": 24.0,
        "liter": 12.0,
        "pieces": 3.0,
    }.get(unit, 15.0)
    multiplier = 1.0 + ((seed % 19) / 8.0)
    return round(base_price * multiplier, 2)


def _infer_inventory_category(ingredient_name: str) -> tuple[str, str]:
    normalized = ingredient_name.casefold()
    if any(token in normalized for token in ["beef", "chicken", "fish", "prawns", "cockles"]):
        return "Protein", "Animal Protein"
    if any(token in normalized for token in ["milk", "cheese", "butter", "yogurt", "cream", "ghee"]):
        return "Dairy", "Dairy Base"
    if any(token in normalized for token in ["onion", "cucumber", "ginger", "galangal", "lemongrass", "mint", "mushrooms", "lemon", "chives", "bean sprouts", "chili"]):
        return "Produce", "Fresh Produce"
    if any(token in normalized for token in ["tea", "broth", "water"]):
        return "Beverage Base", "Liquid Ingredient"
    return "Pantry", "Dry Goods"
