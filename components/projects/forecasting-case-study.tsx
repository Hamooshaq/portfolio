"use client";

import type { ReactNode } from "react";
import { useMemo, useState } from "react";
import { Download, RotateCcw, Upload } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { SectionHeading } from "@/components/ui/section-heading";
import { LiveDeploymentLauncher } from "@/components/projects/live-deployment-launcher";
import { liveDeployments } from "@/config/deployments";
import { cn } from "@/lib/cn";
import { repositoryIntelligence } from "@/config/repository-intelligence";

const forecasting = repositoryIntelligence.repositories.forecasting;
const appData = forecasting.showcase.appData;

type MenuForecast = (typeof appData.menuForecast)[number];
type InventoryItem = (typeof appData.inventory)[number];
type ComputedAlert = InventoryItem & {
  currentStock: number;
  projectedUsage: number;
  effectiveDailyUsage: number;
  daysOfCover: number;
  recommendedReorderQty: number;
  estimatedCost: number;
  status: "critical" | "warning" | "healthy";
};
type UploadStatus = {
  filename: string;
  parsedRows: number;
  matchedItems: number;
  changedItems: number;
  ignoredRows: number;
  changedExamples: Array<{
    item: string;
    from: number;
    to: number;
  }>;
};

const tabs = ["Summary", "Sales", "Ingredients", "Stock", "Suppliers"] as const;

export function ForecastingCaseStudy() {
  const [horizon, setHorizon] = useState(appData.defaultHorizon);
  const [weather, setWeather] = useState("Historical mix");
  const [promotion, setPromotion] = useState(false);
  const [event, setEvent] = useState(false);
  const [activeTab, setActiveTab] = useState<(typeof tabs)[number]>("Summary");
  const [selectedMenu, setSelectedMenu] = useState("Kaya Toast Set");
  const [selectedIngredient, setSelectedIngredient] = useState("Rice");
  const [stockUpdates, setStockUpdates] = useState<Record<string, number>>({});
  const [inventoryOverrides, setInventoryOverrides] = useState<Record<string, number>>({});
  const [uploadStatus, setUploadStatus] = useState<UploadStatus | null>(null);

  const multiplier = useMemo(() => {
    const weatherMultiplier =
      weather === "Historical mix"
        ? 1
        : appData.scenarioMultipliers.weather[weather as keyof typeof appData.scenarioMultipliers.weather] ?? 1;
    const promotionMultiplier = promotion ? appData.scenarioMultipliers.promotion : 1;
    const eventMultiplier = event ? appData.scenarioMultipliers.event : 1;
    return weatherMultiplier * promotionMultiplier * eventMultiplier;
  }, [event, promotion, weather]);

  const forecastRows = useMemo(
    () => buildForecastRows(appData.menuForecast, horizon, multiplier),
    [horizon, multiplier]
  );
  const ingredientDemand = useMemo(() => buildIngredientDemand(forecastRows), [forecastRows]);
  const alerts = useMemo(
    () => buildAlerts(ingredientDemand, horizon, stockUpdates, inventoryOverrides),
    [horizon, ingredientDemand, inventoryOverrides, stockUpdates]
  );
  const reorderItems = alerts
    .filter((item) => item.recommendedReorderQty > 0)
    .sort((a, b) => b.estimatedCost - a.estimatedCost);
  const supplierOrders = useMemo(() => buildSupplierOrders(reorderItems), [reorderItems]);
  const menuItems = [...new Set(appData.menuForecast.map((row) => row.menuItem))].sort();
  const ingredients = alerts.map((item) => item.item).sort();
  const dailyForecast = groupByDate(forecastRows);
  const selectedMenuForecast = forecastRows.filter((row) => row.menuItem === selectedMenu);
  const selectedAlert = alerts.find((item) => item.item === selectedIngredient) ?? alerts[0];
  const totalDemand = sum(forecastRows, "predictedQuantity");
  const criticalCount = alerts.filter((item) => item.status === "critical").length;
  const warningCount = alerts.filter((item) => item.status === "warning").length;
  const totalOrderValue = sum(reorderItems, "estimatedCost");

  return (
    <div className="rounded-[2rem] border border-slate-200 bg-white p-4 shadow-sm sm:p-6 lg:p-8">
      <div className="grid gap-8 xl:grid-cols-[0.8fr_1.2fr]">
        <div>
          <SectionHeading eyebrow="Live planning tool" title={forecasting.title}>
            <p>
              This section rebuilds the Streamlit planner interaction from the repository: adjust the
              scenario, update stock, inspect alerts, and see supplier orders update.
            </p>
          </SectionHeading>
          <div className="mt-6 flex flex-wrap gap-2">
            {forecasting.stack.map((item) => (
              <Badge key={item}>{item}</Badge>
            ))}
          </div>
          <LiveDeploymentLauncher deployment={liveDeployments.forecasting} />
        </div>

        <PlannerControls
          horizon={horizon}
          setHorizon={setHorizon}
          weather={weather}
          setWeather={setWeather}
          promotion={promotion}
          setPromotion={setPromotion}
          event={event}
          setEvent={setEvent}
          ingredients={ingredients}
          selectedIngredient={selectedIngredient}
          setSelectedIngredient={setSelectedIngredient}
          stockUpdates={stockUpdates}
          setStockUpdates={setStockUpdates}
          setInventoryOverrides={setInventoryOverrides}
          setActiveTab={setActiveTab}
          uploadStatus={uploadStatus}
          setUploadStatus={setUploadStatus}
        />
      </div>

      <div className="mt-8 grid gap-3 md:grid-cols-5">
        <Stat label="Expected demand" value={`${format(totalDemand)} portions`} tone="amber" />
        <Stat label="Critical stock" value={String(criticalCount)} tone="red" />
        <Stat label="Watch list" value={String(warningCount)} tone="amber" />
        <Stat label="Order value" value={format(totalOrderValue)} tone="green" />
        <Stat label="Supplier drafts" value={String(supplierOrders.length)} />
      </div>

      <div className="mt-8 flex gap-2 overflow-x-auto rounded-full border border-slate-200 bg-slate-50 p-1">
        {tabs.map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={cn(
              "whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium transition",
              activeTab === tab ? "bg-slate-950 text-white shadow-sm" : "text-slate-500 hover:text-slate-950"
            )}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="mt-6">
        {activeTab === "Summary" ? (
          <SummaryTab dailyForecast={dailyForecast} alerts={alerts} />
        ) : null}
        {activeTab === "Sales" ? (
          <SalesTab
            menuItems={menuItems}
            selectedMenu={selectedMenu}
            setSelectedMenu={setSelectedMenu}
            rows={selectedMenuForecast}
          />
        ) : null}
        {activeTab === "Ingredients" && selectedAlert ? (
          <IngredientTab
            ingredients={ingredients}
            selectedIngredient={selectedIngredient}
            setSelectedIngredient={setSelectedIngredient}
            alert={selectedAlert}
            demand={ingredientDemand[normalizeIngredientKey(selectedIngredient)] ?? 0}
          />
        ) : null}
        {activeTab === "Stock" ? <StockTab alerts={alerts} /> : null}
        {activeTab === "Suppliers" ? <SuppliersTab orders={supplierOrders} /> : null}
      </div>
    </div>
  );
}

function PlannerControls({
  horizon,
  setHorizon,
  weather,
  setWeather,
  promotion,
  setPromotion,
  event,
  setEvent,
  ingredients,
  selectedIngredient,
  setSelectedIngredient,
  stockUpdates,
  setStockUpdates,
  setInventoryOverrides,
  setActiveTab,
  uploadStatus,
  setUploadStatus
}: {
  horizon: number;
  setHorizon: (value: number) => void;
  weather: string;
  setWeather: (value: string) => void;
  promotion: boolean;
  setPromotion: (value: boolean) => void;
  event: boolean;
  setEvent: (value: boolean) => void;
  ingredients: string[];
  selectedIngredient: string;
  setSelectedIngredient: (value: string) => void;
  stockUpdates: Record<string, number>;
  setStockUpdates: (value: Record<string, number>) => void;
  setInventoryOverrides: (value: Record<string, number>) => void;
  setActiveTab: (value: (typeof tabs)[number]) => void;
  uploadStatus: UploadStatus | null;
  setUploadStatus: (value: UploadStatus | null) => void;
}) {
  const [quantity, setQuantity] = useState(0);

  async function handleUpload(file: File | undefined) {
    if (!file) return;
    const text = await file.text();
    const rows = parseCsv(text);
    const inventoryKeys = new Set(ingredients.map(normalizeIngredientKey));
    const defaultStockByKey = new Map(
      appData.inventory.map((item) => [normalizeIngredientKey(item.item), item.currentStock ?? 0])
    );
    const ingredientByKey = new Map(appData.inventory.map((item) => [normalizeIngredientKey(item.item), item.item]));
    const latestByItem = new Map<string, { stock: number; dateValue: number; rowIndex: number }>();
    let ignoredRows = 0;

    rows.forEach((row, rowIndex) => {
      const item = getCsvValue(row, ["Item_Name", "item_name", "Ingredient", "ingredient", "name"]);
      const stock = parseNumeric(getCsvValue(row, ["Current_Stock", "current_stock", "Current Stock", "Stock", "stock"]));
      const itemKey = normalizeIngredientKey(item);

      if (!itemKey || !inventoryKeys.has(itemKey) || !Number.isFinite(stock)) {
        ignoredRows += 1;
        return;
      }

      const dateValue = parseDateValue(getCsvValue(row, ["Date", "date", "snapshot_date", "Snapshot Date"]));
      const previous = latestByItem.get(itemKey);
      if (!previous || dateValue > previous.dateValue || (dateValue === previous.dateValue && rowIndex > previous.rowIndex)) {
        latestByItem.set(itemKey, { stock, dateValue, rowIndex });
      }
    });

    const overrides = Object.fromEntries(
      [...latestByItem.entries()].map(([itemKey, value]) => [itemKey, value.stock])
    );
    const changedExamples = [...latestByItem.entries()]
      .map(([itemKey, value]) => ({
        item: ingredientByKey.get(itemKey) ?? itemKey,
        from: defaultStockByKey.get(itemKey) ?? value.stock,
        to: value.stock
      }))
      .filter((item) => Math.abs(item.to - item.from) > 0.001);

    setInventoryOverrides(overrides);
    setUploadStatus({
      filename: file.name,
      parsedRows: rows.length,
      matchedItems: latestByItem.size,
      changedItems: changedExamples.length,
      ignoredRows,
      changedExamples: changedExamples.slice(0, 4)
    });
    if (changedExamples[0]) {
      setSelectedIngredient(changedExamples[0].item);
      setActiveTab("Ingredients");
    }
  }

  return (
    <div className="rounded-3xl border border-slate-200 bg-slate-950 p-5 text-white">
      <div className="grid gap-5 md:grid-cols-2">
        <label className="block">
          <span className="text-sm font-medium text-white/70">Planning horizon: {horizon} days</span>
          <input
            type="range"
            min={7}
            max={30}
            value={horizon}
            onChange={(event) => setHorizon(Number(event.target.value))}
            className="mt-3 w-full accent-amber-400"
          />
        </label>
        <label className="block">
          <span className="text-sm font-medium text-white/70">Weather pattern</span>
          <select
            value={weather}
            onChange={(event) => setWeather(event.target.value)}
            className="mt-3 w-full rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-sm text-white"
          >
            {["Historical mix", "Sunny", "Cloudy", "Rainy"].map((item) => (
              <option key={item} className="text-slate-950">
                {item}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <Toggle label="Include promotion effect" checked={promotion} setChecked={setPromotion} />
        <Toggle label="Include special event" checked={event} setChecked={setEvent} />
      </div>

      <div className="mt-6 grid gap-4 border-t border-white/10 pt-5 lg:grid-cols-[1fr_0.75fr]">
        <div>
          <p className="text-sm font-semibold">Quick stock update</p>
          <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_0.7fr]">
            <select
              value={selectedIngredient}
              onChange={(event) => setSelectedIngredient(event.target.value)}
              className="rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-sm text-white"
            >
              {ingredients.map((item) => (
                <option key={item} className="text-slate-950">
                  {item}
                </option>
              ))}
            </select>
            <input
              type="number"
              min={0}
              value={quantity}
              onChange={(event) => setQuantity(Number(event.target.value))}
              className="rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-sm text-white"
              placeholder="Qty received"
            />
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                if (quantity <= 0) return;
                const itemKey = normalizeIngredientKey(selectedIngredient);
                setStockUpdates({
                  ...stockUpdates,
                  [itemKey]: (stockUpdates[itemKey] ?? 0) + quantity
                });
                setQuantity(0);
              }}
              className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-950"
            >
              Apply partial restock
            </button>
            <button
              type="button"
              onClick={() => setStockUpdates({})}
              className="inline-flex items-center gap-2 rounded-full border border-white/15 px-4 py-2 text-sm text-white/75"
            >
              <RotateCcw className="h-4 w-4" /> Clear
            </button>
          </div>
        </div>

        <label className="rounded-2xl border border-dashed border-white/15 bg-white/[0.04] p-4">
          <span className="inline-flex items-center gap-2 text-sm font-semibold">
            <Upload className="h-4 w-4" /> Inventory CSV override
          </span>
          <span className="mt-2 block text-xs leading-5 text-white/50">
            Uses the same Streamlit idea: uploaded inventory changes stock and supplier planning for
            this session.
          </span>
          <input
            type="file"
            accept=".csv,text/csv"
            onChange={(event) => void handleUpload(event.target.files?.[0])}
            className="mt-3 block w-full text-xs text-white/60 file:mr-3 file:rounded-full file:border-0 file:bg-white file:px-3 file:py-2 file:text-xs file:font-semibold file:text-slate-950"
          />
          {uploadStatus ? (
            <div className="mt-3 rounded-xl border border-white/10 bg-white/[0.06] p-3 text-xs leading-5 text-white/65">
              <span className="block font-semibold text-white">{uploadStatus.filename}</span>
              {uploadStatus.matchedItems} items matched, {uploadStatus.changedItems} stock values changed.
              {uploadStatus.changedItems === 0 ? (
                <span className="mt-1 block text-amber-200">
                  Values match the current baseline, so the metrics may not move.
                </span>
              ) : null}
              {(uploadStatus.changedExamples?.length ?? 0) > 0 ? (
                <div className="mt-3 grid gap-1.5">
                  {(uploadStatus.changedExamples ?? []).map((item) => (
                    <div key={item.item} className="flex items-center justify-between gap-3 rounded-lg bg-white/[0.06] px-2.5 py-1.5">
                      <span className="truncate text-white/75">{item.item}</span>
                      <span className="font-mono text-white">
                        {format(item.from, 2)}
                        {" -> "}
                        {format(item.to, 2)}
                      </span>
                    </div>
                  ))}
                </div>
              ) : null}
              {uploadStatus.ignoredRows > 0 ? (
                <span className="mt-1 block">{uploadStatus.ignoredRows} rows ignored.</span>
              ) : null}
              <button
                type="button"
                onClick={() => {
                  setInventoryOverrides({});
                  setUploadStatus(null);
                }}
                className="mt-2 rounded-full border border-white/15 px-3 py-1 text-white/75"
              >
                Clear CSV override
              </button>
            </div>
          ) : null}
        </label>
      </div>
    </div>
  );
}

function SummaryTab({ dailyForecast, alerts }: { dailyForecast: Array<{ date: string; value: number }>; alerts: ComputedAlert[] }) {
  const priority = alerts.filter((item) => item.recommendedReorderQty > 0).slice(0, 8);

  return (
    <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
      <Panel title="Historical demand vs current scenario">
        <LineChart
          primary={appData.historicalDemand.map((row) => ({ date: row.date, value: row.demand }))}
          secondary={dailyForecast}
          primaryLabel="Historical"
          secondaryLabel="Forecast"
        />
      </Panel>
      <Panel title="Morning warehouse checklist">
        <div className="space-y-3">
          {priority.map((item) => (
            <div key={item.item} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="font-medium text-slate-950">{item.item}</p>
                <StatusPill status={item.status} />
              </div>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Order {format(item.recommendedReorderQty, 2)} {item.unit} from {item.supplier}.
                Current cover: {format(item.daysOfCover, 1)} days.
              </p>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}

function SalesTab({
  menuItems,
  selectedMenu,
  setSelectedMenu,
  rows
}: {
  menuItems: string[];
  selectedMenu: string;
  setSelectedMenu: (value: string) => void;
  rows: MenuForecast[];
}) {
  return (
    <Panel title="Sales outlook by menu item">
      <select
        value={selectedMenu}
        onChange={(event) => setSelectedMenu(event.target.value)}
        className="mb-5 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm"
      >
        {menuItems.map((item) => (
          <option key={item}>{item}</option>
        ))}
      </select>
      <LineChart
        primary={rows.map((row) => ({ date: row.date, value: row.predictedQuantity ?? 0 }))}
        primaryLabel="Forecast"
      />
      <DataTable
        rows={rows.slice(0, 12).map((row) => ({
          Date: row.date,
          Forecast: format(row.predictedQuantity ?? 0),
          Restaurants: row.activeRestaurants,
          "Avg / Restaurant": format(row.averagePerRestaurant ?? 0, 1)
        }))}
      />
    </Panel>
  );
}

function IngredientTab({
  ingredients,
  selectedIngredient,
  setSelectedIngredient,
  alert,
  demand
}: {
  ingredients: string[];
  selectedIngredient: string;
  setSelectedIngredient: (value: string) => void;
  alert: ComputedAlert;
  demand: number;
}) {
  return (
    <div className="grid gap-6 xl:grid-cols-[0.75fr_1.25fr]">
      <Panel title="Ingredient controls">
        <select
          value={selectedIngredient}
          onChange={(event) => setSelectedIngredient(event.target.value)}
          className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm"
        >
          {ingredients.map((item) => (
            <option key={item}>{item}</option>
          ))}
        </select>
        <div className="mt-5 grid gap-3">
          <Stat label="Current stock" value={`${format(alert.currentStock, 2)} ${alert.unit}`} />
          <Stat label="Projected usage" value={`${format(demand, 2)} ${alert.unit}`} tone="amber" />
          <Stat label="Suggested order" value={`${format(alert.recommendedReorderQty, 2)} ${alert.unit}`} tone="red" />
        </div>
      </Panel>
      <Panel title={`${selectedIngredient}: stock pressure`}>
        <div className="space-y-4">
          <Progress label="Current stock" value={alert.currentStock} max={Math.max(alert.currentStock, demand, alert.reorderLevel)} />
          <Progress label="Projected usage" value={demand} max={Math.max(alert.currentStock, demand, alert.reorderLevel)} tone="amber" />
          <Progress label="Reorder level" value={alert.reorderLevel} max={Math.max(alert.currentStock, demand, alert.reorderLevel)} tone="red" />
        </div>
      </Panel>
    </div>
  );
}

function StockTab({ alerts }: { alerts: ComputedAlert[] }) {
  const [statuses, setStatuses] = useState(["critical", "warning", "healthy"]);
  const rows = alerts
    .filter((item) => statuses.includes(item.status))
    .sort((a, b) => b.recommendedReorderQty - a.recommendedReorderQty)
    .map((item) => ({
      Ingredient: item.item,
      Status: item.status,
      Stock: `${format(item.currentStock, 2)} ${item.unit}`,
      Cover: `${format(item.daysOfCover, 1)} days`,
      "Suggested order": `${format(item.recommendedReorderQty, 2)} ${item.unit}`,
      Supplier: item.supplier
    }));

  return (
    <Panel title="Stock health table">
      <div className="mb-5 flex flex-wrap gap-2">
        {(["critical", "warning", "healthy"] as const).map((status) => (
          <button
            key={status}
            type="button"
            onClick={() =>
              setStatuses((current) =>
                current.includes(status) ? current.filter((item) => item !== status) : [...current, status]
              )
            }
            className={cn(
              "rounded-full border px-3 py-1 text-sm capitalize",
              statuses.includes(status)
                ? "border-slate-950 bg-slate-950 text-white"
                : "border-slate-200 bg-white text-slate-500"
            )}
          >
            {status}
          </button>
        ))}
      </div>
      <DataTable rows={rows} />
    </Panel>
  );
}

function SuppliersTab({ orders }: { orders: ReturnType<typeof buildSupplierOrders> }) {
  return (
    <div className="grid gap-5 lg:grid-cols-3">
      {orders.map((order) => (
        <article key={order.supplier} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-semibold text-slate-950">{order.supplier}</p>
          <p className="mt-1 text-sm text-slate-500">{order.items.length} line items</p>
          <p className="mt-4 text-3xl font-semibold tracking-[-0.04em] text-slate-950">
            {format(order.totalCost)}
          </p>
          <div className="mt-5 space-y-2">
            {order.items.slice(0, 5).map((item) => (
              <p key={item.item} className="text-sm text-slate-600">
                {item.item}: {format(item.recommendedReorderQty, 1)} {item.unit}
              </p>
            ))}
          </div>
          <button
            type="button"
            className="mt-5 inline-flex items-center gap-2 rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700"
          >
            <Download className="h-4 w-4" /> Draft ready
          </button>
        </article>
      ))}
    </div>
  );
}

function buildForecastRows(rows: MenuForecast[], horizon: number, multiplier: number): MenuForecast[] {
  const dates = [...new Set(rows.map((row) => row.date))].sort();
  const byDate = new Map(dates.map((date) => [date, rows.filter((row) => row.date === date)]));

  return Array.from({ length: horizon }).flatMap((_, index) => {
    const sourceDate = dates[index % dates.length];
    const date = addDays(dates[0], index);
    return (byDate.get(sourceDate) ?? []).map((row) => ({
      ...row,
      date,
      predictedQuantity: Number(((row.predictedQuantity ?? 0) * multiplier).toFixed(2)),
      averagePerRestaurant: Number(((row.averagePerRestaurant ?? 0) * multiplier).toFixed(2))
    }));
  });
}

function buildIngredientDemand(rows: MenuForecast[]) {
  const demand: Record<string, number> = {};
  for (const forecast of rows) {
    const recipeMatches = appData.recipeMapping.filter(
      (recipe) => recipe.menuItem.toLowerCase() === forecast.menuItem.toLowerCase()
    );
    for (const recipe of recipeMatches) {
      const ingredientKey = normalizeIngredientKey(recipe.ingredient);
      demand[ingredientKey] =
        (demand[ingredientKey] ?? 0) +
        (forecast.predictedQuantity ?? 0) * (recipe.quantityPerOrder ?? 0);
    }
  }
  return Object.fromEntries(Object.entries(demand).map(([key, value]) => [key, Number(value.toFixed(2))]));
}

function buildAlerts(
  ingredientDemand: Record<string, number>,
  horizon: number,
  stockUpdates: Record<string, number>,
  overrides: Record<string, number>
): ComputedAlert[] {
  return appData.inventory.map((item) => {
    const itemKey = normalizeIngredientKey(item.item);
    const projectedUsage = ingredientDemand[itemKey] ?? (item.forecastDailyUsage ?? 0) * horizon;
    const currentStock = (overrides[itemKey] ?? item.currentStock ?? 0) + (stockUpdates[itemKey] ?? 0);
    const effectiveDailyUsage = Math.max(item.historicalDailyUsage ?? 0, projectedUsage / Math.max(horizon, 1));
    const recommendedReorderQty = Math.max(
      effectiveDailyUsage * (item.leadTime ?? 1) + (item.reorderLevel ?? 0) - currentStock,
      0
    );
    const daysOfCover = effectiveDailyUsage > 0 ? currentStock / effectiveDailyUsage : 999;
    const status =
      currentStock <= (item.reorderLevel ?? 0) || daysOfCover < 1
        ? "critical"
        : recommendedReorderQty > 0
          ? "warning"
          : "healthy";

    return {
      ...item,
      currentStock,
      projectedUsage,
      effectiveDailyUsage,
      daysOfCover,
      recommendedReorderQty,
      estimatedCost: recommendedReorderQty * (item.pricePerUnit ?? 0),
      status
    };
  });
}

function buildSupplierOrders(items: ComputedAlert[]) {
  const grouped = new Map<string, ComputedAlert[]>();
  for (const item of items) {
    grouped.set(item.supplier, [...(grouped.get(item.supplier) ?? []), item]);
  }
  return [...grouped.entries()].map(([supplier, supplierItems]) => ({
    supplier,
    items: supplierItems,
    totalCost: sum(supplierItems, "estimatedCost"),
    totalQuantity: sum(supplierItems, "recommendedReorderQty")
  }));
}

function groupByDate(rows: MenuForecast[]) {
  const map = new Map<string, number>();
  for (const row of rows) {
    map.set(row.date, (map.get(row.date) ?? 0) + (row.predictedQuantity ?? 0));
  }
  return [...map.entries()].map(([date, value]) => ({ date, value }));
}

function LineChart({
  primary,
  secondary,
  primaryLabel,
  secondaryLabel
}: {
  primary: Array<{ date: string; value: number }>;
  secondary?: Array<{ date: string; value: number }>;
  primaryLabel: string;
  secondaryLabel?: string;
}) {
  const all = [...primary, ...(secondary ?? [])];
  const max = Math.max(...all.map((item) => item.value), 1);
  const draw = (series: Array<{ value: number }>) =>
    series
      .map((point, index) => {
        const x = series.length <= 1 ? 0 : (index / (series.length - 1)) * 100;
        const y = 92 - (point.value / max) * 84;
        return `${x},${y}`;
      })
      .join(" ");

  return (
    <div>
      <div className="mb-3 flex gap-4 text-xs text-slate-500">
        <span>{primaryLabel}</span>
        {secondaryLabel ? <span>{secondaryLabel}</span> : null}
      </div>
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="h-64 w-full rounded-2xl bg-slate-50">
        <polyline points={draw(primary)} fill="none" stroke="rgb(148 163 184)" strokeWidth="2" vectorEffect="non-scaling-stroke" />
        {secondary ? (
          <polyline points={draw(secondary)} fill="none" stroke="rgb(245 158 11)" strokeWidth="2.4" vectorEffect="non-scaling-stroke" />
        ) : null}
      </svg>
    </div>
  );
}

function DataTable({ rows }: { rows: Array<Record<string, string | number>> }) {
  const headers = Object.keys(rows[0] ?? {});
  return (
    <div className="mt-5 overflow-x-auto rounded-2xl border border-slate-200">
      <table className="w-full min-w-[680px] text-sm">
        <thead className="bg-slate-50 text-left text-xs uppercase tracking-[0.12em] text-slate-400">
          <tr>{headers.map((header) => <th key={header} className="px-4 py-3 font-medium">{header}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={index} className="border-t border-slate-100">
              {headers.map((header) => (
                <td key={header} className="px-4 py-3 text-slate-600">{row[header]}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <h3 className="text-sm font-semibold text-slate-950">{title}</h3>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: "amber" | "red" | "green" }) {
  return (
    <div className={cn("rounded-2xl border bg-slate-50 p-4", tone === "red" && "border-red-200 bg-red-50", tone === "amber" && "border-amber-200 bg-amber-50", tone === "green" && "border-emerald-200 bg-emerald-50")}>
      <p className="text-xs font-medium uppercase tracking-[0.14em] text-slate-400">{label}</p>
      <p className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-slate-950">{value}</p>
    </div>
  );
}

function Toggle({ label, checked, setChecked }: { label: string; checked: boolean; setChecked: (value: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => setChecked(!checked)}
      className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm"
    >
      {label}
      <span className={cn("h-5 w-9 rounded-full p-1 transition", checked ? "bg-amber-400" : "bg-white/15")}>
        <span className={cn("block h-3 w-3 rounded-full bg-white transition", checked && "translate-x-4")} />
      </span>
    </button>
  );
}

function StatusPill({ status }: { status: ComputedAlert["status"] }) {
  return (
    <span className={cn("rounded-full px-3 py-1 text-xs font-semibold capitalize", status === "critical" && "bg-red-100 text-red-700", status === "warning" && "bg-amber-100 text-amber-700", status === "healthy" && "bg-emerald-100 text-emerald-700")}>
      {status}
    </span>
  );
}

function Progress({ label, value, max, tone }: { label: string; value: number; max: number; tone?: "amber" | "red" }) {
  return (
    <div>
      <div className="flex justify-between text-sm">
        <span className="text-slate-600">{label}</span>
        <span className="font-mono text-slate-500">{format(value, 2)}</span>
      </div>
      <div className="mt-2 h-3 overflow-hidden rounded-full bg-slate-100">
        <div className={cn("h-full bg-slate-950", tone === "amber" && "bg-amber-500", tone === "red" && "bg-red-500")} style={{ width: `${Math.min(100, (value / Math.max(max, 1)) * 100)}%` }} />
      </div>
    </div>
  );
}

function parseCsv(text: string) {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];

    if (char === '"' && inQuotes && next === '"') {
      field += '"';
      index += 1;
      continue;
    }

    if (char === '"') {
      inQuotes = !inQuotes;
      continue;
    }

    if (char === "," && !inQuotes) {
      row.push(field.trim());
      field = "";
      continue;
    }

    if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && next === "\n") index += 1;
      row.push(field.trim());
      if (row.some(Boolean)) rows.push(row);
      row = [];
      field = "";
      continue;
    }

    field += char;
  }

  if (field || row.length) {
    row.push(field.trim());
    if (row.some(Boolean)) rows.push(row);
  }

  const headers = rows.shift() ?? [];
  return rows.map((values) =>
    Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ""]))
  );
}

function normalizeIngredientKey(value: string | undefined) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ");
}

function getCsvValue(row: Record<string, string>, candidates: string[]) {
  const normalized = new Map(Object.entries(row).map(([key, value]) => [normalizeHeader(key), value]));
  for (const candidate of candidates) {
    const value = normalized.get(normalizeHeader(candidate));
    if (value !== undefined) return value;
  }
  return "";
}

function normalizeHeader(value: string) {
  return value.trim().toLowerCase().replace(/[\s_-]+/g, "");
}

function parseNumeric(value: string) {
  return Number(String(value).replace(/[^\d.-]/g, ""));
}

function parseDateValue(value: string) {
  if (!value) return 0;
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? 0 : parsed;
}

function addDays(date: string, days: number) {
  const value = new Date(`${date}T00:00:00`);
  value.setDate(value.getDate() + days);
  return value.toISOString().slice(0, 10);
}

function sum<T extends Record<string, unknown>>(rows: T[], key: keyof T) {
  return rows.reduce((total, row) => total + (Number(row[key]) || 0), 0);
}

function format(value: number | null | undefined, decimals = 0) {
  return new Intl.NumberFormat("en", {
    maximumFractionDigits: decimals,
    minimumFractionDigits: decimals > 0 ? Math.min(decimals, 2) : 0
  }).format(Number(value) || 0);
}
