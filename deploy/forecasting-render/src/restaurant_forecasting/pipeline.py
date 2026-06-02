from __future__ import annotations

from dataclasses import dataclass

import pandas as pd

from .config import ProjectPaths
from .data_loader import (
    load_inventory_data,
    load_recipe_mapping,
    load_sales_data,
    load_supplier_contacts,
    prepare_inventory_data,
    prepare_recipe_mapping,
    prepare_sales_data,
    prepare_supplier_contacts,
)
from .forecasting import ForecastMetrics, RidgeDemandForecaster
from .inventory import (
    build_augmented_inventory,
    build_historical_ingredient_usage,
    build_ingredient_forecast,
    build_inventory_alerts,
    build_supplier_order_drafts,
    build_supplier_reorders,
    calculate_mapping_coverage,
    ensure_supplier_contacts,
)


@dataclass
class PipelineResult:
    sales: pd.DataFrame
    raw_inventory: pd.DataFrame
    inventory: pd.DataFrame
    recipe_mapping: pd.DataFrame
    supplier_contacts: pd.DataFrame
    metrics: ForecastMetrics
    historical_daily_sales: pd.DataFrame
    historical_ingredient_usage: pd.DataFrame
    top_menu_items: pd.DataFrame
    row_forecast: pd.DataFrame
    menu_forecast: pd.DataFrame
    ingredient_forecast: pd.DataFrame
    inventory_alerts: pd.DataFrame
    supplier_reorders: pd.DataFrame
    supplier_order_drafts: pd.DataFrame
    mapping_coverage: dict[str, float]


def run_pipeline(
    paths: ProjectPaths,
    horizon_days: int = 14,
    weather_condition: str | None = None,
    has_promotion: bool = False,
    special_event: bool = False,
    holdout_days: int = 30,
    sales_df: pd.DataFrame | None = None,
    inventory_df: pd.DataFrame | None = None,
    recipe_mapping_df: pd.DataFrame | None = None,
    supplier_contacts_df: pd.DataFrame | None = None,
) -> PipelineResult:
    sales = prepare_sales_data(sales_df) if sales_df is not None else load_sales_data(paths.sales_data)
    raw_inventory = prepare_inventory_data(inventory_df) if inventory_df is not None else load_inventory_data(paths.inventory_data)
    recipe_mapping = (
        prepare_recipe_mapping(recipe_mapping_df) if recipe_mapping_df is not None else load_recipe_mapping(paths.recipe_mapping_data)
    )
    supplier_contacts = (
        prepare_supplier_contacts(supplier_contacts_df)
        if supplier_contacts_df is not None
        else load_supplier_contacts(paths.supplier_contacts_data)
    )
    supplier_contacts = ensure_supplier_contacts(supplier_contacts, raw_inventory, recipe_mapping)

    historical_daily_sales = sales.groupby("date", as_index=False)["quantity_sold"].sum()
    historical_ingredient_usage = build_historical_ingredient_usage(sales, recipe_mapping)
    inventory = build_augmented_inventory(raw_inventory, recipe_mapping, historical_ingredient_usage, supplier_contacts)
    top_menu_items = (
        sales.groupby("menu_item_name", as_index=False)["quantity_sold"]
        .sum()
        .sort_values("quantity_sold", ascending=False)
        .reset_index(drop=True)
    )

    forecaster = RidgeDemandForecaster(alpha=5.0)
    metrics = forecaster.evaluate(sales, holdout_days=holdout_days)
    row_forecast, menu_forecast = forecaster.forecast(
        sales_df=sales,
        horizon_days=horizon_days,
        weather_condition=weather_condition,
        has_promotion=has_promotion,
        special_event=special_event,
    )

    ingredient_forecast = build_ingredient_forecast(menu_forecast, recipe_mapping)
    inventory_alerts = build_inventory_alerts(inventory, ingredient_forecast, historical_ingredient_usage)
    supplier_reorders = build_supplier_reorders(inventory_alerts, supplier_contacts)
    supplier_order_drafts = build_supplier_order_drafts(inventory_alerts, supplier_contacts)
    mapping_coverage = calculate_mapping_coverage(menu_forecast, recipe_mapping)

    return PipelineResult(
        sales=sales,
        raw_inventory=raw_inventory,
        inventory=inventory,
        recipe_mapping=recipe_mapping,
        supplier_contacts=supplier_contacts,
        metrics=metrics,
        historical_daily_sales=historical_daily_sales,
        historical_ingredient_usage=historical_ingredient_usage,
        top_menu_items=top_menu_items,
        row_forecast=row_forecast,
        menu_forecast=menu_forecast,
        ingredient_forecast=ingredient_forecast,
        inventory_alerts=inventory_alerts,
        supplier_reorders=supplier_reorders,
        supplier_order_drafts=supplier_order_drafts,
        mapping_coverage=mapping_coverage,
    )
