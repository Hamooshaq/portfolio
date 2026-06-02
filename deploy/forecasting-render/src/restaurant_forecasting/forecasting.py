from __future__ import annotations

from dataclasses import dataclass

import numpy as np
import pandas as pd


@dataclass(frozen=True)
class ForecastMetrics:
    mae: float
    rmse: float
    wape: float


class RidgeDemandForecaster:
    def __init__(self, alpha: float = 5.0) -> None:
        self.alpha = alpha
        self.feature_columns_: list[str] = []
        self.coefficients_: np.ndarray | None = None

    def fit(self, sales_df: pd.DataFrame) -> "RidgeDemandForecaster":
        design_matrix = self._prepare_feature_matrix(sales_df, fit=True)
        target = sales_df["quantity_sold"].to_numpy(dtype=float)
        self.coefficients_ = self._solve_ridge(design_matrix, target)
        return self

    def predict(self, feature_df: pd.DataFrame) -> np.ndarray:
        if self.coefficients_ is None:
            raise RuntimeError("The forecaster must be fitted before calling predict().")

        design_matrix = self._prepare_feature_matrix(feature_df, fit=False)
        predictions = design_matrix @ self.coefficients_
        return np.clip(predictions, 0.0, None)

    def evaluate(self, sales_df: pd.DataFrame, holdout_days: int = 30) -> ForecastMetrics:
        cutoff_date = sales_df["date"].max() - pd.Timedelta(days=holdout_days)
        train_df = sales_df[sales_df["date"] <= cutoff_date].copy()
        test_df = sales_df[sales_df["date"] > cutoff_date].copy()

        if train_df.empty or test_df.empty:
            raise ValueError("Unable to create a valid time-based split for model evaluation.")

        self.fit(train_df)
        predictions = self.predict(test_df)
        actuals = test_df["quantity_sold"].to_numpy(dtype=float)

        mae = float(np.mean(np.abs(actuals - predictions)))
        rmse = float(np.sqrt(np.mean((actuals - predictions) ** 2)))
        wape = float(np.sum(np.abs(actuals - predictions)) / max(np.sum(np.abs(actuals)), 1.0) * 100.0)
        return ForecastMetrics(mae=mae, rmse=rmse, wape=wape)

    def forecast(
        self,
        sales_df: pd.DataFrame,
        horizon_days: int = 14,
        weather_condition: str | None = None,
        has_promotion: bool = False,
        special_event: bool = False,
    ) -> tuple[pd.DataFrame, pd.DataFrame]:
        self.fit(sales_df)
        scenario_df = self._build_future_scenarios(
            sales_df=sales_df,
            horizon_days=horizon_days,
            weather_condition=weather_condition,
            has_promotion=has_promotion,
            special_event=special_event,
        )
        scenario_df = scenario_df.copy()
        scenario_df["predicted_quantity_sold"] = np.round(self.predict(scenario_df), 2)

        row_level_forecast = scenario_df[
            [
                "date",
                "source_template_date",
                "restaurant_id",
                "restaurant_type",
                "menu_item_name",
                "meal_type",
                "weather_condition",
                "has_promotion",
                "special_event",
                "predicted_quantity_sold",
            ]
        ].rename(columns={"date": "forecast_date"})

        menu_forecast = (
            row_level_forecast.groupby(["forecast_date", "menu_item_name"], as_index=False)
            .agg(
                predicted_quantity_sold=("predicted_quantity_sold", "sum"),
                active_restaurant_count=("restaurant_id", "nunique"),
            )
            .sort_values(["forecast_date", "predicted_quantity_sold"], ascending=[True, False])
            .reset_index(drop=True)
        )
        menu_forecast["average_per_active_restaurant"] = (
            menu_forecast["predicted_quantity_sold"] / menu_forecast["active_restaurant_count"]
        )

        return row_level_forecast, menu_forecast

    def _prepare_feature_matrix(self, source_df: pd.DataFrame, fit: bool) -> np.ndarray:
        feature_frame = self._build_feature_frame(source_df)

        if fit:
            self.feature_columns_ = feature_frame.columns.tolist()
            aligned = feature_frame
        else:
            aligned = feature_frame.reindex(columns=self.feature_columns_, fill_value=0.0)

        design_matrix = aligned.to_numpy(dtype=float)
        intercept = np.ones((len(aligned), 1), dtype=float)
        return np.hstack([intercept, design_matrix])

    def _build_feature_frame(self, source_df: pd.DataFrame) -> pd.DataFrame:
        frame = source_df.copy()
        frame["restaurant_id"] = frame["restaurant_id"].astype(str)
        frame["weekday_name"] = frame["date"].dt.day_name()
        frame["month_name"] = frame["date"].dt.month_name()
        frame["day_of_year"] = frame["date"].dt.dayofyear
        frame["sin_day_of_year"] = np.sin(2 * np.pi * frame["day_of_year"] / 366.0)
        frame["cos_day_of_year"] = np.cos(2 * np.pi * frame["day_of_year"] / 366.0)
        frame["has_promotion"] = frame["has_promotion"].astype(int)
        frame["special_event"] = frame["special_event"].astype(int)

        numeric_columns = [
            "typical_ingredient_cost",
            "observed_market_price",
            "actual_selling_price",
            "has_promotion",
            "special_event",
            "sin_day_of_year",
            "cos_day_of_year",
        ]
        categorical_columns = [
            "restaurant_id",
            "restaurant_type",
            "menu_item_name",
            "meal_type",
            "weather_condition",
            "weekday_name",
            "month_name",
        ]

        encoded = pd.get_dummies(
            frame[numeric_columns + categorical_columns],
            columns=categorical_columns,
            dtype=float,
        )
        return encoded.sort_index(axis=1)

    def _solve_ridge(self, design_matrix: np.ndarray, target: np.ndarray) -> np.ndarray:
        xtx = design_matrix.T @ design_matrix
        penalty = self.alpha * np.eye(xtx.shape[0], dtype=float)
        penalty[0, 0] = 0.0
        xty = design_matrix.T @ target
        return np.linalg.solve(xtx + penalty, xty)

    def _build_future_scenarios(
        self,
        sales_df: pd.DataFrame,
        horizon_days: int,
        weather_condition: str | None,
        has_promotion: bool,
        special_event: bool,
    ) -> pd.DataFrame:
        latest_date = sales_df["date"].max().normalize()
        future_dates = pd.date_range(latest_date + pd.Timedelta(days=1), periods=horizon_days, freq="D")

        available_dates = sorted(sales_df["date"].dt.normalize().unique())
        scenarios: list[pd.DataFrame] = []

        for future_date in future_dates:
            matching_dates = [date for date in available_dates if pd.Timestamp(date).dayofweek == future_date.dayofweek]
            if not matching_dates:
                raise ValueError(f"No historical template date found for weekday {future_date.day_name()}.")

            template_date = pd.Timestamp(matching_dates[-1])
            template_rows = sales_df[sales_df["date"].dt.normalize() == template_date].copy()
            template_rows["source_template_date"] = template_date
            template_rows["date"] = future_date
            template_rows["has_promotion"] = has_promotion
            template_rows["special_event"] = special_event
            if weather_condition is not None:
                template_rows["weather_condition"] = weather_condition
            scenarios.append(template_rows)

        return pd.concat(scenarios, ignore_index=True)
