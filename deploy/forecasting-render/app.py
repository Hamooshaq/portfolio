from __future__ import annotations

import html
import importlib
import sys
from io import BytesIO
from pathlib import Path

import altair as alt
import pandas as pd
import streamlit as st

PROJECT_ROOT = Path(__file__).resolve().parents[1]
SRC_DIR = PROJECT_ROOT / "src"
if str(SRC_DIR) not in sys.path:
    sys.path.insert(0, str(SRC_DIR))


st.set_page_config(page_title="Central Warehouse Inventory Planner", layout="wide")


def _load_pipeline_api():
    module_names = [
        "restaurant_forecasting.data_loader",
        "restaurant_forecasting.forecasting",
        "restaurant_forecasting.inventory",
        "restaurant_forecasting.config",
        "restaurant_forecasting.pipeline",
    ]
    loaded_modules = {}
    for module_name in module_names:
        if module_name in sys.modules:
            loaded_modules[module_name] = importlib.reload(sys.modules[module_name])
        else:
            loaded_modules[module_name] = importlib.import_module(module_name)

    config_module = loaded_modules["restaurant_forecasting.config"]
    pipeline_module = loaded_modules["restaurant_forecasting.pipeline"]
    return config_module.ProjectPaths, pipeline_module.run_pipeline


def load_capstone_result(
    horizon_days: int,
    weather_condition: str | None,
    has_promotion: bool,
    special_event: bool,
    sales_df: pd.DataFrame | None,
    inventory_df: pd.DataFrame | None,
    recipe_mapping_df: pd.DataFrame | None,
    supplier_contacts_df: pd.DataFrame | None,
) -> object:
    ProjectPaths, run_pipeline = _load_pipeline_api()
    paths = ProjectPaths.from_root(PROJECT_ROOT)
    return run_pipeline(
        paths=paths,
        horizon_days=horizon_days,
        weather_condition=weather_condition,
        has_promotion=has_promotion,
        special_event=special_event,
        sales_df=sales_df,
        inventory_df=inventory_df,
        recipe_mapping_df=recipe_mapping_df,
        supplier_contacts_df=supplier_contacts_df,
    )


def _get_project_paths():
    ProjectPaths, _ = _load_pipeline_api()
    return ProjectPaths.from_root(PROJECT_ROOT)


def _inject_styles() -> None:
    st.markdown(
        """
        <style>
            [data-testid="stAppViewContainer"] {
                background:
                    radial-gradient(circle at top left, rgba(193, 154, 107, 0.16), transparent 25%),
                    linear-gradient(180deg, #0b1116 0%, #0f1720 100%);
            }
            .block-container {
                max-width: 1380px;
                padding-top: 1.4rem;
                padding-bottom: 2.5rem;
            }
            [data-testid="stSidebar"] {
                background: #10171d;
                border-right: 1px solid rgba(255, 255, 255, 0.05);
            }
            [data-testid="stSidebar"] h1,
            [data-testid="stSidebar"] h2,
            [data-testid="stSidebar"] h3,
            [data-testid="stSidebar"] label,
            [data-testid="stSidebar"] p,
            [data-testid="stSidebar"] span,
            [data-testid="stSidebar"] small {
                color: #e5edf6 !important;
            }
            [data-testid="stSidebar"] [data-testid="stMarkdownContainer"] p {
                color: #d5dee9 !important;
            }
            [data-testid="stSidebar"] [data-testid="stFileUploaderDropzone"] {
                background: rgba(255, 255, 255, 0.04);
                border: 1px dashed rgba(255, 255, 255, 0.14);
            }
            [data-testid="stSidebar"] [data-testid="stFileUploaderDropzoneInstructions"] div {
                color: #d5dee9 !important;
            }
            [data-testid="stSidebar"] .stSlider,
            [data-testid="stSidebar"] .stCheckbox,
            [data-testid="stSidebar"] .stSelectbox,
            [data-testid="stSidebar"] .stFileUploader {
                margin-bottom: 0.5rem;
            }
            [data-testid="stTabs"] button {
                border-radius: 999px;
                padding: 0.45rem 0.95rem;
            }
            .hero-card {
                background: linear-gradient(135deg, #efe5d7 0%, #f6f0e7 100%);
                border: 1px solid rgba(157, 123, 79, 0.28);
                border-radius: 28px;
                padding: 1.55rem 1.7rem;
                margin-bottom: 1.2rem;
                color: #1f2937;
                box-shadow: 0 18px 40px rgba(0, 0, 0, 0.12);
            }
            .hero-eyebrow {
                color: #8a6740;
                font-size: 0.72rem;
                font-weight: 700;
                letter-spacing: 0.18em;
                text-transform: uppercase;
                margin-bottom: 0.65rem;
            }
            .hero-title {
                color: #1f2937;
                font-size: 2.4rem;
                line-height: 1.08;
                font-weight: 750;
                margin: 0;
            }
            .hero-copy {
                color: #475467;
                font-size: 1rem;
                line-height: 1.6;
                margin: 0.8rem 0 0 0;
                max-width: 840px;
            }
            .hero-meta {
                display: flex;
                gap: 0.7rem;
                flex-wrap: wrap;
                margin-top: 1rem;
            }
            .hero-pill {
                border-radius: 999px;
                padding: 0.38rem 0.8rem;
                background: rgba(255, 255, 255, 0.7);
                color: #344054;
                border: 1px solid rgba(157, 123, 79, 0.2);
                font-size: 0.84rem;
                font-weight: 600;
            }
            .stat-card {
                background: rgba(16, 23, 29, 0.94);
                border: 1px solid rgba(130, 143, 156, 0.18);
                border-radius: 22px;
                padding: 1rem 1rem 0.95rem 1rem;
                min-height: 126px;
                box-shadow: 0 16px 36px rgba(0, 0, 0, 0.14);
            }
            .stat-card.accent {
                border-color: rgba(217, 119, 6, 0.45);
            }
            .stat-card.success {
                border-color: rgba(34, 197, 94, 0.35);
            }
            .stat-card.warning {
                border-color: rgba(245, 158, 11, 0.4);
            }
            .stat-card.critical {
                border-color: rgba(239, 68, 68, 0.42);
            }
            .stat-label {
                color: #9aa4b2;
                font-size: 0.76rem;
                font-weight: 700;
                letter-spacing: 0.08em;
                text-transform: uppercase;
            }
            .stat-value {
                color: #f8fafc;
                font-size: 1.85rem;
                line-height: 1.1;
                font-weight: 750;
                margin-top: 0.55rem;
            }
            .stat-note {
                color: #cbd5e1;
                font-size: 0.92rem;
                line-height: 1.45;
                margin-top: 0.45rem;
            }
            .note-card {
                background: rgba(18, 25, 33, 0.9);
                border: 1px solid rgba(130, 143, 156, 0.18);
                border-radius: 20px;
                padding: 1rem 1.1rem;
                margin-bottom: 1rem;
            }
            .note-title {
                color: #f8fafc;
                font-size: 1rem;
                font-weight: 700;
                margin-bottom: 0.45rem;
            }
            .note-copy {
                color: #cbd5e1;
                font-size: 0.95rem;
                line-height: 1.55;
                margin: 0;
            }
            .mini-label {
                color: #98a2b3;
                font-size: 0.8rem;
                font-weight: 700;
                letter-spacing: 0.08em;
                text-transform: uppercase;
            }
            .chip {
                display: inline-block;
                border-radius: 999px;
                padding: 0.22rem 0.6rem;
                font-size: 0.76rem;
                font-weight: 700;
                border: 1px solid transparent;
                margin-right: 0.35rem;
            }
            .chip.critical {
                color: #fecaca;
                background: rgba(220, 38, 38, 0.16);
                border-color: rgba(220, 38, 38, 0.36);
            }
            .chip.warning {
                color: #fde68a;
                background: rgba(245, 158, 11, 0.16);
                border-color: rgba(245, 158, 11, 0.36);
            }
            .chip.healthy {
                color: #bbf7d0;
                background: rgba(34, 197, 94, 0.14);
                border-color: rgba(34, 197, 94, 0.3);
            }
            .source-card {
                background: rgba(17, 24, 32, 0.95);
                border: 1px solid rgba(130, 143, 156, 0.18);
                border-radius: 18px;
                padding: 0.95rem 1rem;
                min-height: 104px;
            }
            .source-name {
                color: #f8fafc;
                font-size: 1rem;
                font-weight: 700;
                margin-top: 0.15rem;
            }
            .source-meta {
                color: #cbd5e1;
                font-size: 0.88rem;
                margin-top: 0.4rem;
                line-height: 1.45;
            }
            .action-list {
                margin: 0;
                padding-left: 1.1rem;
                color: #dbe4ee;
                line-height: 1.65;
            }
            .action-list li {
                margin-bottom: 0.65rem;
            }
        </style>
        """,
        unsafe_allow_html=True,
    )


def _format_number(value: float | int | None, decimals: int = 0) -> str:
    if value is None or pd.isna(value):
        return "N/A"
    return f"{float(value):,.{decimals}f}"


def _format_cost(value: float | int | None) -> str:
    if value is None or pd.isna(value):
        return "N/A"
    return _format_number(value, 0)


def _format_days(value: float | int | None) -> str:
    if value is None or pd.isna(value):
        return "N/A"
    if value == float("inf"):
        return "Very high"
    return f"{_format_number(value, 1)} days"


def _format_date(value) -> str:
    if value is None or pd.isna(value):
        return "N/A"
    return pd.to_datetime(value).strftime("%d %b %Y")


def _status_rank(status: str) -> int:
    return {"critical": 0, "warning": 1, "healthy": 2}.get(str(status).lower(), 99)


def _status_chip(status: str) -> str:
    label = html.escape(str(status).title())
    css_class = html.escape(str(status).lower())
    return f'<span class="chip {css_class}">{label}</span>'


def _render_stat_cards(cards: list[dict[str, str]]) -> None:
    columns = st.columns(len(cards))
    for column, card in zip(columns, cards):
        tone = card.get("tone", "")
        column.markdown(
            f"""
            <div class="stat-card {tone}">
                <div class="stat-label">{html.escape(card['label'])}</div>
                <div class="stat-value">{html.escape(card['value'])}</div>
                <div class="stat-note">{html.escape(card['note'])}</div>
            </div>
            """,
            unsafe_allow_html=True,
        )


def _render_source_cards(source_details: pd.DataFrame) -> None:
    columns = st.columns(len(source_details))
    for column, row in zip(columns, source_details.itertuples(index=False)):
        column.markdown(
            f"""
            <div class="source-card">
                <div class="mini-label">{html.escape(str(row.Dataset))}</div>
                <div class="source-name">{html.escape(str(row.Source))}</div>
                <div class="source-meta">{html.escape(str(row.Filename))}<br>{int(row.Rows):,} rows</div>
            </div>
            """,
            unsafe_allow_html=True,
        )


def _render_note(title: str, copy: str) -> None:
    st.markdown(
        f"""
        <div class="note-card">
            <div class="note-title">{html.escape(title)}</div>
            <p class="note-copy">{html.escape(copy)}</p>
        </div>
        """,
        unsafe_allow_html=True,
    )


def _plot_dual_series(
    history: pd.DataFrame,
    forecast: pd.DataFrame,
    history_label: str,
    forecast_label: str,
    y_label: str,
    title: str,
    decimals: int = 0,
    history_color: str = "#94a3b8",
    forecast_color: str = "#f59e0b",
) -> None:
    frames: list[pd.DataFrame] = []
    if not history.empty:
        history_frame = history[["Date", history_label]].copy()
        history_frame["Series"] = history_label
        history_frame = history_frame.rename(columns={history_label: "Value"})
        frames.append(history_frame)
    if not forecast.empty and forecast_label in forecast.columns:
        forecast_frame = forecast[["Date", forecast_label]].copy()
        forecast_frame["Series"] = forecast_label
        forecast_frame = forecast_frame.rename(columns={forecast_label: "Value"})
        frames.append(forecast_frame)

    if not frames:
        st.info("No chart data is available for this view.")
        return

    chart_data = pd.concat(frames, ignore_index=True)
    chart_data["Date"] = pd.to_datetime(chart_data["Date"])
    series_order = list(dict.fromkeys(chart_data["Series"].tolist()))
    color_map = {history_label: history_color, forecast_label: forecast_color}

    nearest = alt.selection_point(nearest=True, on="pointerover", fields=["Date"], empty=False)
    base = (
        alt.Chart(chart_data)
        .encode(
            x=alt.X("Date:T", title="Date", axis=alt.Axis(labelColor="#cbd5e1", titleColor="#cbd5e1", grid=False)),
            y=alt.Y("Value:Q", title=y_label, axis=alt.Axis(labelColor="#cbd5e1", titleColor="#cbd5e1", gridColor="#243244")),
            color=alt.Color(
                "Series:N",
                title=None,
                scale=alt.Scale(
                    domain=series_order,
                    range=[color_map.get(series, "#94a3b8") for series in series_order],
                ),
                legend=alt.Legend(orient="top", labelColor="#e2e8f0"),
            ),
            strokeDash=alt.StrokeDash(
                "Series:N",
                title=None,
                scale=alt.Scale(
                    domain=series_order,
                    range=[[1, 0]] if len(series_order) == 1 else [[1, 0], [8, 5]],
                ),
            ),
            tooltip=[
                alt.Tooltip("Date:T", title="Date"),
                alt.Tooltip("Series:N", title="Series"),
                alt.Tooltip("Value:Q", title=y_label, format=f",.{decimals}f"),
            ],
        )
        .properties(height=330, title=alt.TitleParams(title, anchor="start", color="#f8fafc", fontSize=15))
    )

    line = base.mark_line(strokeWidth=3)
    points = base.mark_circle(size=70).encode(
        opacity=alt.condition(nearest, alt.value(1), alt.value(0))
    ).add_params(nearest)
    rule = (
        alt.Chart(chart_data)
        .mark_rule(color="#475569")
        .encode(x="Date:T")
        .transform_filter(nearest)
    )

    st.altair_chart(
        (line + points + rule).configure_view(strokeWidth=0).configure(background="#0f1720"),
        use_container_width=True,
    )


def _plot_ranked_bars(
    data: pd.DataFrame,
    category_col: str,
    value_col: str,
    title: str,
    value_title: str,
    decimals: int = 0,
    color: str = "#f59e0b",
) -> None:
    if data.empty:
        st.info("No chart data is available for this ranking.")
        return

    chart = (
        alt.Chart(data)
        .mark_bar(cornerRadiusTopRight=8, cornerRadiusBottomRight=8, color=color)
        .encode(
            x=alt.X(f"{value_col}:Q", title=value_title, axis=alt.Axis(labelColor="#cbd5e1", titleColor="#cbd5e1")),
            y=alt.Y(f"{category_col}:N", sort="-x", title=None, axis=alt.Axis(labelColor="#cbd5e1")),
            tooltip=[
                alt.Tooltip(f"{category_col}:N", title=category_col.replace("_", " ")),
                alt.Tooltip(f"{value_col}:Q", title=value_title, format=f",.{decimals}f"),
            ],
        )
        .properties(height=320, title=alt.TitleParams(title, anchor="start", color="#f8fafc", fontSize=15))
        .configure_view(strokeWidth=0)
        .configure(background="#0f1720")
    )
    st.altair_chart(chart, use_container_width=True)


def _ensure_adjustment_state() -> None:
    if "inventory_adjustments" not in st.session_state:
        st.session_state.inventory_adjustments = []


def _get_adjustment_rows() -> list[dict[str, object]]:
    _ensure_adjustment_state()
    return st.session_state.inventory_adjustments


def _build_adjustments_frame() -> pd.DataFrame:
    rows = _get_adjustment_rows()
    if not rows:
        return pd.DataFrame(columns=["Item_Name", "Unit", "Quantity_Added"])
    frame = pd.DataFrame(rows)
    return frame[["Item_Name", "Unit", "Quantity_Added"]].sort_values("Item_Name").reset_index(drop=True)


def _add_inventory_adjustment(item_name: str, unit: str, quantity_added: float) -> None:
    if quantity_added <= 0:
        return

    rows = _get_adjustment_rows()
    item_key = str(item_name).strip().casefold()
    for row in rows:
        if row["item_key"] == item_key:
            row["Quantity_Added"] = round(float(row["Quantity_Added"]) + float(quantity_added), 2)
            return

    rows.append(
        {
            "item_key": item_key,
            "Item_Name": item_name,
            "Unit": unit,
            "Quantity_Added": round(float(quantity_added), 2),
        }
    )


def _clear_inventory_adjustments() -> None:
    st.session_state.inventory_adjustments = []


def _resolve_base_inventory_df(uploaded_inventory_df: pd.DataFrame | None) -> pd.DataFrame:
    if uploaded_inventory_df is not None:
        return uploaded_inventory_df.copy()
    paths = _get_project_paths()
    return pd.read_csv(paths.inventory_data)


def _apply_inventory_adjustments(
    inventory_df: pd.DataFrame | None, adjustments_frame: pd.DataFrame
) -> pd.DataFrame | None:
    if inventory_df is None or adjustments_frame.empty:
        return inventory_df

    adjusted = inventory_df.copy()
    adjusted["Date"] = pd.to_datetime(adjusted["Date"])
    latest_date = adjusted["Date"].max()
    item_keys = adjusted["Item_Name"].astype(str).str.strip().str.casefold()

    for adjustment in adjustments_frame.itertuples(index=False):
        latest_item_mask = (adjusted["Date"] == latest_date) & (item_keys == str(adjustment.Item_Name).strip().casefold())
        if latest_item_mask.any():
            adjusted.loc[latest_item_mask, "Current_Stock"] = (
                adjusted.loc[latest_item_mask, "Current_Stock"].astype(float) + float(adjustment.Quantity_Added)
            )

    return adjusted


def main() -> None:
    _inject_styles()

    with st.sidebar:
        st.header("Planning Controls")
        st.caption("Set the planning scenario, then review stock risk and supplier orders.")
        horizon_days = st.slider("Planning horizon", min_value=7, max_value=30, value=14, step=1)
        weather_label = st.selectbox("Weather pattern", ["Historical mix", "Sunny", "Cloudy", "Rainy"])
        has_promotion = st.checkbox("Include promotion effect", value=False)
        special_event = st.checkbox("Include special event", value=False)

        st.divider()
        st.subheader("Use Your Own Data")
        st.caption("Optional. Uploaded files override the sample data for the current session only.")
        sales_upload = st.file_uploader("Sales CSV", type="csv")
        inventory_upload = st.file_uploader("Inventory CSV", type="csv")
        recipe_upload = st.file_uploader("Recipe mapping CSV", type="csv")
        supplier_upload = st.file_uploader("Supplier directory CSV", type="csv")

        st.divider()
        st.caption(
            "Tip: Sales uploads change demand charts. Inventory uploads change stock, reorder, and supplier planning views."
        )

    weather_condition = None if weather_label == "Historical mix" else weather_label
    sales_df = _read_uploaded_csv(sales_upload)
    uploaded_inventory_df = _read_uploaded_csv(inventory_upload)
    recipe_mapping_df = _read_uploaded_csv(recipe_upload)
    supplier_contacts_df = _read_uploaded_csv(supplier_upload)
    dataset_sources = _build_dataset_sources(sales_upload, inventory_upload, recipe_upload, supplier_upload)
    adjustments_frame = _build_adjustments_frame()
    base_inventory_df = _resolve_base_inventory_df(uploaded_inventory_df)
    effective_inventory_df = _apply_inventory_adjustments(base_inventory_df, adjustments_frame)

    with st.spinner("Refreshing planning view..."):
        result = load_capstone_result(
            horizon_days=horizon_days,
            weather_condition=weather_condition,
            has_promotion=has_promotion,
            special_event=special_event,
            sales_df=sales_df,
            inventory_df=effective_inventory_df,
            recipe_mapping_df=recipe_mapping_df,
            supplier_contacts_df=supplier_contacts_df,
        )

    forecast_daily = (
        result.menu_forecast.groupby("forecast_date", as_index=False)["predicted_quantity_sold"]
        .sum()
        .rename(columns={"forecast_date": "Date", "predicted_quantity_sold": "Forecast Demand"})
    )
    historical_daily = result.historical_daily_sales.rename(
        columns={"date": "Date", "quantity_sold": "Historical Demand"}
    )
    reorder_now = result.inventory_alerts[result.inventory_alerts["recommended_reorder_qty"] > 0].copy()
    reorder_now["status_rank"] = reorder_now["alert_status"].map(_status_rank)
    reorder_now = reorder_now.sort_values(
        ["status_rank", "estimated_reorder_cost", "recommended_reorder_qty"],
        ascending=[True, False, False],
    )

    critical_alerts = int((result.inventory_alerts["alert_status"] == "critical").sum())
    warning_alerts = int((result.inventory_alerts["alert_status"] == "warning").sum())
    healthy_items = int((result.inventory_alerts["alert_status"] == "healthy").sum())
    total_reorder_cost = float(reorder_now["estimated_reorder_cost"].sum())
    total_forecast_quantity = float(result.menu_forecast["predicted_quantity_sold"].sum())
    suppliers_ready = int(result.supplier_reorders["supplier_name"].nunique())
    coverage_pct = result.mapping_coverage["coverage_ratio"] * 100
    median_cover = (
        result.inventory_alerts["days_of_cover"].replace([float("inf"), -float("inf")], pd.NA).dropna().median()
    )
    peak_forecast_row = forecast_daily.loc[forecast_daily["Forecast Demand"].idxmax()]
    latest_data_date = historical_daily["Date"].max()

    with st.sidebar:
        st.divider()
        st.subheader("Quick Stock Update")
        st.caption(
            "Use this when a supplier delivery arrives and you only want to top up a few ingredients. "
            "Only the latest inventory snapshot is updated for this session."
        )

        latest_snapshot = result.raw_inventory[result.raw_inventory["Date"] == result.raw_inventory["Date"].max()].copy()
        adjustment_item_options = latest_snapshot.sort_values("Item_Name")["Item_Name"].tolist()
        selected_adjustment_item = st.selectbox(
            "Ingredient received",
            adjustment_item_options,
            key="adjustment_item",
        )
        selected_adjustment_row = latest_snapshot[latest_snapshot["Item_Name"] == selected_adjustment_item].iloc[0]
        adjustment_step = 1.0 if selected_adjustment_row["Unit"] == "pieces" else 0.5
        quantity_received = st.number_input(
            f"Quantity received ({selected_adjustment_row['Unit']})",
            min_value=0.0,
            step=adjustment_step,
            value=0.0,
            key="adjustment_qty",
        )
        st.caption(
            f"Current stock in latest snapshot: {_format_number(selected_adjustment_row['Current_Stock'], 2)} "
            f"{selected_adjustment_row['Unit']}"
        )
        if st.button("Apply partial restock", use_container_width=True):
            _add_inventory_adjustment(
                item_name=selected_adjustment_item,
                unit=selected_adjustment_row["Unit"],
                quantity_added=quantity_received,
            )
            st.rerun()

        if adjustments_frame.empty:
            st.caption("No manual stock updates have been applied yet.")
        else:
            st.dataframe(
                adjustments_frame.rename(
                    columns={
                        "Item_Name": "Ingredient",
                        "Unit": "Unit",
                        "Quantity_Added": "Quantity Added",
                    }
                ),
                use_container_width=True,
                hide_index=True,
            )
            st.download_button(
                "Download updated inventory CSV",
                data=_dataframe_to_csv_bytes(effective_inventory_df),
                file_name="inventory_updated_latest_snapshot.csv",
                mime="text/csv",
                use_container_width=True,
            )
            if st.button("Clear stock updates", use_container_width=True):
                _clear_inventory_adjustments()
                st.rerun()

    source_details = pd.DataFrame(
        [
            {
                "Dataset": "Sales",
                "Source": dataset_sources["sales"]["label"],
                "Filename": dataset_sources["sales"]["filename"],
                "Rows": len(result.sales),
            },
            {
                "Dataset": "Inventory",
                "Source": dataset_sources["inventory"]["label"],
                "Filename": dataset_sources["inventory"]["filename"],
                "Rows": len(result.raw_inventory),
            },
            {
                "Dataset": "Recipes",
                "Source": dataset_sources["recipe"]["label"],
                "Filename": dataset_sources["recipe"]["filename"],
                "Rows": len(result.recipe_mapping),
            },
            {
                "Dataset": "Suppliers",
                "Source": dataset_sources["supplier"]["label"],
                "Filename": dataset_sources["supplier"]["filename"],
                "Rows": len(result.supplier_contacts),
            },
        ]
    )

    st.markdown(
        f"""
        <div class="hero-card">
            <div class="hero-eyebrow">Central Warehouse Planner</div>
            <h1 class="hero-title">Inventory, demand, and supplier planning in one clear workspace</h1>
            <p class="hero-copy">
                Review expected demand for the next {horizon_days} days, see which ingredients are at risk,
                and prepare supplier orders from the same dashboard. The view below is built for daily warehouse
                operations, not just model output.
            </p>
            <div class="hero-meta">
                <span class="hero-pill">Latest sales date: {_format_date(latest_data_date)}</span>
                <span class="hero-pill">Forecast scenario: {html.escape(weather_label)}</span>
                <span class="hero-pill">Promotion: {"On" if has_promotion else "Off"}</span>
                <span class="hero-pill">Special event: {"On" if special_event else "Off"}</span>
            </div>
        </div>
        """,
        unsafe_allow_html=True,
    )

    if not adjustments_frame.empty:
        st.info(
            f"{len(adjustments_frame)} partial stock update(s) are currently applied to the latest inventory snapshot. "
            "Use the sidebar to add more, clear them, or download the updated inventory file."
        )

    _render_stat_cards(
        [
            {
                "label": "Expected Demand",
                "value": f"{_format_number(total_forecast_quantity)} portions",
                "note": f"Projected chain demand for the next {horizon_days} days.",
                "tone": "accent",
            },
            {
                "label": "Urgent Stock Issues",
                "value": str(critical_alerts),
                "note": "Items already in critical territory and needing immediate attention.",
                "tone": "critical",
            },
            {
                "label": "Watch List",
                "value": str(warning_alerts),
                "note": "Items that are still serviceable but getting close to the reorder point.",
                "tone": "warning",
            },
            {
                "label": "Estimated Order Value",
                "value": _format_cost(total_reorder_cost),
                "note": "Approximate total based on the price-per-unit values in the source data.",
                "tone": "success",
            },
            {
                "label": "Supplier Drafts Ready",
                "value": str(suppliers_ready),
                "note": "Supplier summaries and draft order emails prepared for review.",
                "tone": "",
            },
        ]
    )
    summary_tab, sales_tab, ingredient_tab, stock_tab, supplier_tab, setup_tab = st.tabs(
        ["Executive Summary", "Sales Outlook", "Ingredient Planning", "Stock Health", "Supplier Orders", "Data Setup"]
    )

    with summary_tab:
        summary_left, summary_right = st.columns([1.75, 1], gap="large")
        with summary_left:
            _render_note(
                "Demand outlook",
                "Historical demand and forward demand are shown on the same scale so planners can compare current volume with the upcoming window without mental math.",
            )
            _plot_dual_series(
                historical_daily[["Date", "Historical Demand"]],
                forecast_daily[["Date", "Forecast Demand"]],
                history_label="Historical Demand",
                forecast_label="Forecast Demand",
                y_label="Portions sold",
                title="Historical demand vs upcoming demand",
            )
            st.caption("Hover over the lines to see exact daily values for historical demand and the forecast window.")

        with summary_right:
            _render_note(
                "What needs action today",
                "Use this panel as the warehouse morning checklist. It highlights immediate stock risk and where the busiest demand is expected.",
            )
            st.markdown(
                f"""
                <ul class="action-list">
                    <li>Peak demand is expected on <strong>{html.escape(_format_date(peak_forecast_row['Date']))}</strong> with about <strong>{html.escape(_format_number(peak_forecast_row['Forecast Demand']))}</strong> portions.</li>
                    <li><strong>{critical_alerts}</strong> items are critical, <strong>{warning_alerts}</strong> are warning, and <strong>{healthy_items}</strong> are currently healthy.</li>
                    <li>Median stock cover across tracked ingredients is <strong>{html.escape(_format_days(median_cover))}</strong>.</li>
                    <li>Recipe coverage is <strong>{html.escape(_format_number(coverage_pct, 1))}%</strong> of forecasted menu volume.</li>
                </ul>
                """,
                unsafe_allow_html=True,
            )
            if reorder_now.empty:
                st.success("No ingredient currently requires an immediate reorder under this scenario.")
            else:
                priority_preview = reorder_now.head(5)
                for row in priority_preview.itertuples(index=False):
                    st.markdown(
                        f"{_status_chip(row.alert_status)} <strong>{html.escape(str(row.Item_Name))}</strong>: "
                        f"order about <strong>{html.escape(_format_number(row.recommended_reorder_qty, 2))} {html.escape(str(row.Unit))}</strong> "
                        f"from {html.escape(str(row.Supplier_Name))}. Current cover: {html.escape(_format_days(row.days_of_cover))}.",
                        unsafe_allow_html=True,
                    )

        menu_summary_col, reorder_summary_col = st.columns(2, gap="large")
        with menu_summary_col:
            st.subheader("Best-selling menu items")
            top_items_chart = result.top_menu_items.head(8).rename(
                columns={"menu_item_name": "Menu Item", "quantity_sold": "Historical Demand"}
            )
            _plot_ranked_bars(
                top_items_chart,
                category_col="Menu Item",
                value_col="Historical Demand",
                title="Best-selling menu items",
                value_title="Historical demand",
                decimals=0,
                color="#c084fc",
            )
            st.caption("Hover to compare demand volume by menu item.")

        with reorder_summary_col:
            action_table = reorder_now.head(10)[
                [
                    "Item_Name",
                    "alert_status",
                    "days_of_cover",
                    "recommended_reorder_qty",
                    "Unit",
                    "Supplier_Name",
                ]
            ].rename(
                columns={
                    "Item_Name": "Ingredient",
                    "alert_status": "Status",
                    "days_of_cover": "Days Of Cover",
                    "recommended_reorder_qty": "Suggested Order",
                    "Unit": "Unit",
                    "Supplier_Name": "Supplier",
                }
            )
            action_table["Status"] = action_table["Status"].str.title()
            action_table["Days Of Cover"] = action_table["Days Of Cover"].map(_format_days)
            action_table["Suggested Order"] = action_table["Suggested Order"].map(lambda value: _format_number(value, 2))
            st.subheader("Top items to reorder")
            st.dataframe(action_table, use_container_width=True, hide_index=True)

    with sales_tab:
        st.subheader("Sales outlook by menu item")
        st.caption("Pick a menu item to compare its historical demand against the current forecast scenario.")
        menu_items = sorted(result.menu_forecast["menu_item_name"].unique())
        selected_item = st.selectbox("Menu item", menu_items)

        item_history = (
            result.sales[result.sales["menu_item_name"] == selected_item]
            .groupby("date", as_index=False)["quantity_sold"]
            .sum()
            .rename(columns={"date": "Date", "quantity_sold": "Historical Demand"})
        )
        item_forecast = (
            result.menu_forecast[result.menu_forecast["menu_item_name"] == selected_item][
                ["forecast_date", "predicted_quantity_sold", "active_restaurant_count"]
            ]
            .rename(columns={"forecast_date": "Date", "predicted_quantity_sold": "Forecast Demand"})
        )
        item_peak = item_forecast.loc[item_forecast["Forecast Demand"].idxmax()]
        average_active_restaurants = item_forecast["active_restaurant_count"].mean()

        _render_stat_cards(
            [
                {
                    "label": "Historical Total",
                    "value": _format_number(item_history["Historical Demand"].sum()),
                    "note": "Total chain demand seen in the historical sales data.",
                    "tone": "",
                },
                {
                    "label": "Average Daily Demand",
                    "value": _format_number(item_history["Historical Demand"].mean(), 1),
                    "note": "Average daily historical demand for the selected item.",
                    "tone": "",
                },
                {
                    "label": "Forecast For Horizon",
                    "value": _format_number(item_forecast["Forecast Demand"].sum()),
                    "note": f"Expected demand over the next {horizon_days} days.",
                    "tone": "accent",
                },
                {
                    "label": "Busiest Forecast Day",
                    "value": _format_number(item_peak["Forecast Demand"]),
                    "note": f"{_format_date(item_peak['Date'])} is expected to be the peak day.",
                    "tone": "success",
                },
                {
                    "label": "Active Restaurants",
                    "value": _format_number(average_active_restaurants, 1),
                    "note": "Average number of restaurants contributing to this menu item's demand.",
                    "tone": "",
                },
            ]
        )
        _plot_dual_series(
            item_history[["Date", "Historical Demand"]],
            item_forecast[["Date", "Forecast Demand"]],
            history_label="Historical Demand",
            forecast_label="Forecast Demand",
            y_label="Portions sold",
            title=f"{selected_item}: historical demand vs forecast",
        )
        st.caption("Hover to inspect the exact daily demand for the selected menu item.")

        forecast_table = item_forecast.copy()
        forecast_table["Date"] = forecast_table["Date"].map(_format_date)
        forecast_table["Forecast Demand"] = forecast_table["Forecast Demand"].map(lambda value: _format_number(value, 0))
        forecast_table["active_restaurant_count"] = forecast_table["active_restaurant_count"].map(
            lambda value: _format_number(value, 0)
        )
        forecast_table = forecast_table.rename(columns={"active_restaurant_count": "Active Restaurants"})
        st.dataframe(forecast_table, use_container_width=True, hide_index=True)

        accuracy_col, detail_col = st.columns([1, 1.35], gap="large")
        with accuracy_col:
            st.subheader("Forecast accuracy")
            accuracy_frame = pd.DataFrame(
                [
                    {"Metric": "MAE", "Value": f"{result.metrics.mae:.2f}"},
                    {"Metric": "RMSE", "Value": f"{result.metrics.rmse:.2f}"},
                    {"Metric": "WAPE", "Value": f"{result.metrics.wape:.2f}%"},
                ]
            )
            st.dataframe(accuracy_frame, use_container_width=True, hide_index=True)
        with detail_col:
            _render_note(
                "How to read this view",
                "A high forecast total means the selected item will put more pressure on ingredients and warehouse capacity. Use the ingredient and stock tabs next to translate this demand into replenishment decisions.",
            )

    with ingredient_tab:
        st.subheader("Ingredient planning")
        st.caption("Translate menu demand into ingredient requirements and compare it with current stock coverage.")
        ingredient_options = sorted(result.inventory_alerts["Item_Name"].unique())
        selected_ingredient = st.selectbox("Ingredient", ingredient_options)

        historical_usage = (
            result.historical_ingredient_usage[result.historical_ingredient_usage["ingredient_name"] == selected_ingredient][
                ["date", "historical_ingredient_usage"]
            ]
            .rename(columns={"date": "Date", "historical_ingredient_usage": "Historical Usage"})
        )
        forecast_usage = (
            result.ingredient_forecast[result.ingredient_forecast["ingredient_name"] == selected_ingredient][
                ["forecast_date", "projected_ingredient_usage"]
            ]
            .rename(columns={"forecast_date": "Date", "projected_ingredient_usage": "Forecast Usage"})
        )
        ingredient_snapshot = result.inventory_alerts[result.inventory_alerts["Item_Name"] == selected_ingredient].iloc[0]

        _render_stat_cards(
            [
                {
                    "label": "Current Stock",
                    "value": f"{_format_number(ingredient_snapshot['Current_Stock'], 2)} {ingredient_snapshot['Unit']}",
                    "note": "Stock available in the latest warehouse snapshot.",
                    "tone": "",
                },
                {
                    "label": "Projected Usage",
                    "value": f"{_format_number(forecast_usage['Forecast Usage'].sum(), 2)} {ingredient_snapshot['Unit']}",
                    "note": f"Expected usage over the next {horizon_days} days.",
                    "tone": "accent",
                },
                {
                    "label": "Days Of Cover",
                    "value": _format_days(ingredient_snapshot["days_of_cover"]),
                    "note": "How long the current stock is expected to last at the effective usage rate.",
                    "tone": "warning" if ingredient_snapshot["alert_status"] != "healthy" else "success",
                },
                {
                    "label": "Suggested Order",
                    "value": f"{_format_number(ingredient_snapshot['recommended_reorder_qty'], 2)} {ingredient_snapshot['Unit']}",
                    "note": f"Recommended replenishment from {ingredient_snapshot['Supplier_Name']}.",
                    "tone": "critical" if ingredient_snapshot["alert_status"] == "critical" else "",
                },
            ]
        )
        _plot_dual_series(
            historical_usage[["Date", "Historical Usage"]],
            forecast_usage[["Date", "Forecast Usage"]],
            history_label="Historical Usage",
            forecast_label="Forecast Usage",
            y_label=f"Usage ({ingredient_snapshot['Unit']})",
            title=f"{selected_ingredient}: historical usage vs forecast requirement",
            decimals=2,
            history_color="#7dd3fc",
            forecast_color="#fb923c",
        )
        st.caption("Hover to compare how much of the ingredient was used historically versus what is expected next.")

        ingredient_cols = st.columns([1, 1], gap="large")
        with ingredient_cols[0]:
            projected_top_ingredients = (
                result.ingredient_forecast.groupby("ingredient_name", as_index=False)["projected_ingredient_usage"]
                .sum()
                .sort_values("projected_ingredient_usage", ascending=False)
                .head(10)
                .rename(
                    columns={
                        "ingredient_name": "Ingredient",
                        "projected_ingredient_usage": "Projected Usage",
                    }
                )
            )
            st.subheader("Top projected ingredients")
            _plot_ranked_bars(
                projected_top_ingredients,
                category_col="Ingredient",
                value_col="Projected Usage",
                title="Top projected ingredients",
                value_title="Projected usage",
                decimals=2,
                color="#38bdf8",
            )
            st.caption("Hover to see which ingredients will carry the largest demand load.")

        with ingredient_cols[1]:
            ingredient_schedule = forecast_usage.copy()
            ingredient_schedule["Date"] = ingredient_schedule["Date"].map(_format_date)
            ingredient_schedule["Forecast Usage"] = ingredient_schedule["Forecast Usage"].map(
                lambda value: _format_number(value, 2)
            )
            st.subheader("Selected ingredient schedule")
            st.dataframe(ingredient_schedule, use_container_width=True, hide_index=True)

    with stock_tab:
        st.subheader("Stock health")
        st.caption("Review cover days, reorder quantities, and supplier assignments for the shared warehouse.")
        latest_raw_date = result.raw_inventory["Date"].max()
        raw_snapshot = result.raw_inventory[result.raw_inventory["Date"] == latest_raw_date]

        _render_stat_cards(
            [
                {
                    "label": "Critical Items",
                    "value": str(critical_alerts),
                    "note": "Immediate action recommended.",
                    "tone": "critical",
                },
                {
                    "label": "Warning Items",
                    "value": str(warning_alerts),
                    "note": "Watch closely and plan replenishment.",
                    "tone": "warning",
                },
                {
                    "label": "Healthy Items",
                    "value": str(healthy_items),
                    "note": "Currently above the reorder threshold.",
                    "tone": "success",
                },
                {
                    "label": "Latest Raw Snapshot",
                    "value": _format_date(latest_raw_date),
                    "note": f"{len(raw_snapshot):,} ingredients were present in the latest raw inventory file.",
                    "tone": "",
                },
            ]
        )

        status_filter = st.multiselect(
            "Show status",
            options=["critical", "warning", "healthy"],
            default=["critical", "warning", "healthy"],
            format_func=lambda value: value.title(),
        )
        inventory_items = sorted(result.inventory_alerts["Item_Name"].unique())
        selected_inventory_item = st.selectbox("Ingredient to inspect", inventory_items)

        inventory_history = result.inventory[result.inventory["Item_Name"] == selected_inventory_item][["Date", "Current_Stock"]]
        inventory_history = inventory_history.rename(columns={"Current_Stock": "Current Stock"})
        selected_inventory_snapshot = result.inventory_alerts[result.inventory_alerts["Item_Name"] == selected_inventory_item].iloc[0]

        stock_detail_col, stock_chart_col = st.columns([1, 1.6], gap="large")
        with stock_detail_col:
            st.markdown(
                f"{_status_chip(selected_inventory_snapshot['alert_status'])} <strong>{html.escape(selected_inventory_item)}</strong>",
                unsafe_allow_html=True,
            )
            stock_summary = pd.DataFrame(
                [
                    {"Metric": "Current stock", "Value": f"{_format_number(selected_inventory_snapshot['Current_Stock'], 2)} {selected_inventory_snapshot['Unit']}"},
                    {"Metric": "Reorder level", "Value": f"{_format_number(selected_inventory_snapshot['Reorder_Level'], 2)} {selected_inventory_snapshot['Unit']}"},
                    {"Metric": "Effective daily usage", "Value": f"{_format_number(selected_inventory_snapshot['effective_daily_usage'], 2)} {selected_inventory_snapshot['Unit']}"},
                    {"Metric": "Days of cover", "Value": _format_days(selected_inventory_snapshot['days_of_cover'])},
                    {"Metric": "Suggested order", "Value": f"{_format_number(selected_inventory_snapshot['recommended_reorder_qty'], 2)} {selected_inventory_snapshot['Unit']}"},
                    {"Metric": "Supplier", "Value": str(selected_inventory_snapshot['Supplier_Name'])},
                ]
            )
            st.dataframe(stock_summary, use_container_width=True, hide_index=True)

        with stock_chart_col:
            _plot_dual_series(
                inventory_history[["Date", "Current Stock"]],
                pd.DataFrame(
                    {
                        "Date": inventory_history["Date"],
                        "Reorder Level": selected_inventory_snapshot["Reorder_Level"],
                    }
                ),
                history_label="Current Stock",
                forecast_label="Reorder Level",
                y_label=f"Stock ({selected_inventory_snapshot['Unit']})",
                title=f"{selected_inventory_item}: stock history",
                decimals=2,
                history_color="#a78bfa",
                forecast_color="#f97316",
            )
            st.caption("Hover to compare current stock movement against the reorder threshold.")

        stock_table = result.inventory_alerts[result.inventory_alerts["alert_status"].isin(status_filter)].copy()
        stock_table["status_rank"] = stock_table["alert_status"].map(_status_rank)
        stock_table = stock_table.sort_values(
            ["status_rank", "recommended_reorder_qty", "estimated_reorder_cost"],
            ascending=[True, False, False],
        )
        stock_table = stock_table[
            [
                "Item_Name",
                "alert_status",
                "Current_Stock",
                "Reorder_Level",
                "effective_daily_usage",
                "days_of_cover",
                "recommended_reorder_qty",
                "estimated_reorder_cost",
                "Supplier_Name",
            ]
        ].rename(
            columns={
                "Item_Name": "Ingredient",
                "alert_status": "Status",
                "Current_Stock": "Current Stock",
                "Reorder_Level": "Reorder Level",
                "effective_daily_usage": "Daily Usage",
                "days_of_cover": "Days Of Cover",
                "recommended_reorder_qty": "Suggested Order",
                "estimated_reorder_cost": "Estimated Value",
                "Supplier_Name": "Supplier",
            }
        )
        stock_table["Status"] = stock_table["Status"].str.title()
        stock_table["Current Stock"] = stock_table["Current Stock"].map(lambda value: _format_number(value, 2))
        stock_table["Reorder Level"] = stock_table["Reorder Level"].map(lambda value: _format_number(value, 2))
        stock_table["Daily Usage"] = stock_table["Daily Usage"].map(lambda value: _format_number(value, 2))
        stock_table["Days Of Cover"] = stock_table["Days Of Cover"].map(_format_days)
        stock_table["Suggested Order"] = stock_table["Suggested Order"].map(lambda value: _format_number(value, 2))
        stock_table["Estimated Value"] = stock_table["Estimated Value"].map(_format_cost)
        st.subheader("Current stock table")
        st.dataframe(stock_table, use_container_width=True, hide_index=True)

    with supplier_tab:
        st.subheader("Supplier orders")
        st.caption(
            "Review grouped reorder quantities and copy a ready-to-send supplier draft when needed. "
            "Order values follow the source pricing data and do not assume a specific currency."
        )

        _render_stat_cards(
            [
                {
                    "label": "Suppliers With Orders",
                    "value": str(suppliers_ready),
                    "note": "Only suppliers with active reorder lines are shown below.",
                    "tone": "",
                },
                {
                    "label": "Total Reorder Quantity",
                    "value": _format_number(reorder_now["recommended_reorder_qty"].sum(), 2),
                    "note": "Combined quantity across all ingredients that need replenishment.",
                    "tone": "accent",
                },
                {
                    "label": "Estimated Order Value",
                    "value": _format_cost(total_reorder_cost),
                    "note": "Approximate total based on source pricing, before any negotiation or pack-size adjustment.",
                    "tone": "success",
                },
                {
                    "label": "Order Lines",
                    "value": str(len(reorder_now)),
                    "note": "Individual ingredient lines currently included in supplier drafts.",
                    "tone": "",
                },
            ]
        )

        supplier_lookup = result.supplier_reorders.sort_values("total_estimated_cost", ascending=False)
        selected_supplier = st.selectbox("Supplier", supplier_lookup["supplier_name"].tolist())
        supplier_summary = supplier_lookup[supplier_lookup["supplier_name"] == selected_supplier].iloc[0]
        supplier_lines = reorder_now[reorder_now["Supplier_Name"] == selected_supplier].copy()
        supplier_lines = supplier_lines[
            [
                "Item_Name",
                "recommended_reorder_qty",
                "Unit",
                "estimated_reorder_cost",
                "alert_status",
            ]
        ].rename(
            columns={
                "Item_Name": "Ingredient",
                "recommended_reorder_qty": "Suggested Order",
                "Unit": "Unit",
                "estimated_reorder_cost": "Estimated Value",
                "alert_status": "Status",
            }
        )
        supplier_lines["Suggested Order"] = supplier_lines["Suggested Order"].map(lambda value: _format_number(value, 2))
        supplier_lines["Estimated Value"] = supplier_lines["Estimated Value"].map(_format_cost)
        supplier_lines["Status"] = supplier_lines["Status"].str.title()

        supplier_col, draft_col = st.columns([1, 1.2], gap="large")
        with supplier_col:
            supplier_summary_table = pd.DataFrame(
                [
                    {"Metric": "Contact person", "Value": supplier_summary["contact_person"]},
                    {"Metric": "Email", "Value": supplier_summary["email"]},
                    {"Metric": "Phone", "Value": supplier_summary["phone"]},
                    {"Metric": "Lead time", "Value": f"{int(supplier_summary['lead_time_days'])} day(s)"},
                    {"Metric": "Ingredients in order", "Value": str(supplier_summary["items_to_order"])},
                    {"Metric": "Total quantity", "Value": _format_number(supplier_summary["total_reorder_quantity"], 2)},
                    {"Metric": "Estimated order value", "Value": _format_cost(supplier_summary["total_estimated_cost"])},
                ]
            )
            st.dataframe(supplier_summary_table, use_container_width=True, hide_index=True)
            st.dataframe(supplier_lines, use_container_width=True, hide_index=True)
            supplier_chart = supplier_lookup.rename(
                columns={"supplier_name": "Supplier", "total_estimated_cost": "Estimated Value"}
            )
            _plot_ranked_bars(
                supplier_chart,
                category_col="Supplier",
                value_col="Estimated Value",
                title="Supplier order value comparison",
                value_title="Estimated order value",
                decimals=0,
                color="#34d399",
            )
            st.caption("Hover to compare which supplier groups carry the largest order value in this scenario.")

        with draft_col:
            draft = result.supplier_order_drafts[result.supplier_order_drafts["supplier_name"] == selected_supplier].iloc[0]
            st.markdown(
                f"""
                <div class="note-card">
                    <div class="note-title">Draft email for {html.escape(selected_supplier)}</div>
                    <p class="note-copy">This is a draft-only output. Review and send it through your normal supplier communication channel.</p>
                </div>
                """,
                unsafe_allow_html=True,
            )
            st.write(f"**To:** {draft['email']}")
            st.write(f"**Subject:** {draft['email_subject']}")
            st.text_area("Email body", draft["email_body"], height=280)

        download_col_1, download_col_2 = st.columns(2)
        with download_col_1:
            st.download_button(
                "Download supplier summary",
                data=_dataframe_to_csv_bytes(result.supplier_reorders),
                file_name="supplier_reorders.csv",
                mime="text/csv",
                use_container_width=True,
            )
        with download_col_2:
            st.download_button(
                "Download draft emails",
                data=_dataframe_to_csv_bytes(result.supplier_order_drafts),
                file_name="supplier_order_drafts.csv",
                mime="text/csv",
                use_container_width=True,
            )

    with setup_tab:
        st.subheader("Data setup")
        st.caption("This page shows which files are active and how complete the planning inputs are.")
        _render_note(
            "How uploads work",
            "Uploaded files replace the bundled samples only for the current session. If no file is uploaded, the dashboard uses the built-in sample datasets.",
        )
        _render_source_cards(source_details)

        setup_summary = pd.DataFrame(
            [
                {"Dataset": "Sales rows", "Count": f"{len(result.sales):,}"},
                {"Dataset": "Raw inventory rows", "Count": f"{len(result.raw_inventory):,}"},
                {"Dataset": "Augmented inventory rows", "Count": f"{len(result.inventory):,}"},
                {"Dataset": "Recipe rows", "Count": f"{len(result.recipe_mapping):,}"},
                {"Dataset": "Supplier rows", "Count": f"{len(result.supplier_contacts):,}"},
                {"Dataset": "Historical ingredient usage rows", "Count": f"{len(result.historical_ingredient_usage):,}"},
                {"Dataset": "Recipe coverage", "Count": f"{coverage_pct:.1f}%"},
            ]
        )
        st.dataframe(setup_summary, use_container_width=True, hide_index=True)
        st.dataframe(source_details, use_container_width=True, hide_index=True)

        setup_left, setup_right = st.columns(2, gap="large")
        with setup_left:
            st.subheader("Recipe mapping preview")
            st.dataframe(result.recipe_mapping.head(20), use_container_width=True, hide_index=True)
        with setup_right:
            st.subheader("Supplier directory preview")
            st.dataframe(result.supplier_contacts.head(20), use_container_width=True, hide_index=True)


def _read_uploaded_csv(uploaded_file: st.runtime.uploaded_file_manager.UploadedFile | None) -> pd.DataFrame | None:
    if uploaded_file is None:
        return None
    return pd.read_csv(BytesIO(uploaded_file.getvalue()))


def _dataframe_to_csv_bytes(df: pd.DataFrame) -> bytes:
    return df.to_csv(index=False).encode("utf-8")


def _build_dataset_sources(sales_upload, inventory_upload, recipe_upload, supplier_upload) -> dict[str, dict[str, str]]:
    def source(uploaded_file, default_name: str) -> dict[str, str]:
        if uploaded_file is None:
            return {"label": "Bundled sample", "filename": default_name}
        return {"label": "Uploaded file", "filename": uploaded_file.name}

    return {
        "sales": source(sales_upload, "restaurant_sales_data.csv"),
        "inventory": source(inventory_upload, "restaurant_inventory_2024_by_ingredients.csv"),
        "recipe": source(recipe_upload, "recipe_mapping.csv"),
        "supplier": source(supplier_upload, "supplier_contacts.csv"),
    }


if __name__ == "__main__":
    main()
