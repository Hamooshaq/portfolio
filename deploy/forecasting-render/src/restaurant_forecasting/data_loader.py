from __future__ import annotations

from pathlib import Path

import pandas as pd

SALES_REQUIRED_COLUMNS = {
    "date",
    "restaurant_id",
    "restaurant_type",
    "menu_item_name",
    "meal_type",
    "key_ingredients_tags",
    "typical_ingredient_cost",
    "observed_market_price",
    "actual_selling_price",
    "quantity_sold",
    "has_promotion",
    "special_event",
    "weather_condition",
}

INVENTORY_REQUIRED_COLUMNS = {
    "Date",
    "Item_ID",
    "Item_Name",
    "Category",
    "Subcategory",
    "Unit",
    "Current_Stock",
    "Reorder_Level",
    "Daily_Usage",
    "Lead_Time",
    "Price_per_Unit",
    "Supplier_Name",
    "Seasonal_Factor",
    "Waste_Percentage",
}

RECIPE_REQUIRED_COLUMNS = {
    "menu_item_name",
    "ingredient_name",
    "quantity_per_order",
    "unit",
}

SUPPLIER_REQUIRED_COLUMNS = {
    "supplier_name",
    "ingredient_name",
    "email",
    "contact_person",
    "phone",
    "lead_time_days",
    "notes",
}

UNIT_NORMALIZATION_MAP = {
    "kg": "kg",
    "kgs": "kg",
    "kilogram": "kg",
    "kilograms": "kg",
    "g": "g",
    "gram": "g",
    "grams": "g",
    "l": "liter",
    "liter": "liter",
    "liters": "liter",
    "litre": "liter",
    "litres": "liter",
    "piece": "pieces",
    "pieces": "pieces",
    "pcs": "pieces",
    "pc": "pieces",
}


def _validate_columns(df: pd.DataFrame, required_columns: set[str], dataset_name: str) -> None:
    missing = sorted(required_columns - set(df.columns))
    if missing:
        raise ValueError(f"{dataset_name} is missing required columns: {', '.join(missing)}")


def _clean_text(value: object) -> str:
    if pd.isna(value):
        return ""
    return " ".join(str(value).strip().split())


def _title_case(value: object) -> str:
    cleaned = _clean_text(value)
    return cleaned.title()


def _normalize_unit(value: object) -> str:
    cleaned = _clean_text(value).casefold()
    if not cleaned:
        return ""
    return UNIT_NORMALIZATION_MAP.get(cleaned, cleaned)


def _normalize_tag_list(value: object) -> str:
    tags = [_title_case(tag) for tag in _clean_text(value).split(",") if _clean_text(tag)]
    return ", ".join(tags)


def _to_bool(value: object) -> bool:
    if isinstance(value, bool):
        return value
    return _clean_text(value).casefold() in {"1", "true", "yes", "y"}


def prepare_sales_data(sales: pd.DataFrame) -> pd.DataFrame:
    _validate_columns(sales, SALES_REQUIRED_COLUMNS, "sales dataset")

    prepared = sales.copy()
    prepared["date"] = pd.to_datetime(prepared["date"])
    prepared["restaurant_id"] = prepared["restaurant_id"].astype(int)
    prepared["restaurant_type"] = prepared["restaurant_type"].map(_title_case)
    prepared["menu_item_name"] = prepared["menu_item_name"].map(_title_case)
    prepared["meal_type"] = prepared["meal_type"].map(_title_case)
    prepared["key_ingredients_tags"] = prepared["key_ingredients_tags"].map(_normalize_tag_list)
    prepared["weather_condition"] = prepared["weather_condition"].map(_title_case)
    prepared["has_promotion"] = prepared["has_promotion"].map(_to_bool)
    prepared["special_event"] = prepared["special_event"].map(_to_bool)
    prepared["quantity_sold"] = prepared["quantity_sold"].astype(float)

    return prepared.sort_values(["date", "restaurant_id", "menu_item_name"]).reset_index(drop=True)


def prepare_inventory_data(inventory: pd.DataFrame) -> pd.DataFrame:
    _validate_columns(inventory, INVENTORY_REQUIRED_COLUMNS, "inventory dataset")

    prepared = inventory.copy()
    prepared["Date"] = pd.to_datetime(prepared["Date"])
    prepared["Item_Name"] = prepared["Item_Name"].map(_title_case)
    prepared["Category"] = prepared["Category"].map(_title_case)
    prepared["Subcategory"] = prepared["Subcategory"].map(_title_case)
    prepared["Unit"] = prepared["Unit"].map(_normalize_unit)
    prepared["Supplier_Name"] = prepared["Supplier_Name"].map(_title_case)

    return prepared.sort_values(["Date", "Item_Name"]).reset_index(drop=True)


def prepare_recipe_mapping(recipe_mapping: pd.DataFrame) -> pd.DataFrame:
    _validate_columns(recipe_mapping, RECIPE_REQUIRED_COLUMNS, "recipe mapping dataset")

    prepared = recipe_mapping.copy()
    prepared["menu_item_name"] = prepared["menu_item_name"].map(_title_case)
    prepared["ingredient_name"] = prepared["ingredient_name"].map(_title_case)
    prepared["quantity_per_order"] = prepared["quantity_per_order"].astype(float)
    prepared["unit"] = prepared["unit"].map(_normalize_unit)

    return prepared.sort_values(["menu_item_name", "ingredient_name"]).reset_index(drop=True)


def prepare_supplier_contacts(supplier_contacts: pd.DataFrame) -> pd.DataFrame:
    _validate_columns(supplier_contacts, SUPPLIER_REQUIRED_COLUMNS, "supplier contacts dataset")

    prepared = supplier_contacts.copy()
    prepared["supplier_name"] = prepared["supplier_name"].map(_title_case)
    prepared["ingredient_name"] = prepared["ingredient_name"].map(_title_case)
    prepared["email"] = prepared["email"].map(_clean_text)
    prepared["contact_person"] = prepared["contact_person"].map(_title_case)
    prepared["phone"] = prepared["phone"].map(_clean_text)
    prepared["lead_time_days"] = prepared["lead_time_days"].fillna(0).astype(int)
    prepared["notes"] = prepared["notes"].map(_clean_text)

    return prepared.sort_values(["ingredient_name", "supplier_name"]).reset_index(drop=True)


def load_sales_data(path: str | Path) -> pd.DataFrame:
    return prepare_sales_data(pd.read_csv(path))


def load_inventory_data(path: str | Path) -> pd.DataFrame:
    return prepare_inventory_data(pd.read_csv(path))


def load_recipe_mapping(path: str | Path) -> pd.DataFrame:
    return prepare_recipe_mapping(pd.read_csv(path))


def load_supplier_contacts(path: str | Path) -> pd.DataFrame:
    return prepare_supplier_contacts(pd.read_csv(path))
