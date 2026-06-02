import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const outputPath = path.join(root, "config", "generated", "repository-intelligence.json");
const publicArtifactsDir = path.join(root, "public", "portfolio-artifacts");

const paths = {
  forecasting: process.env.REPO_FORECASTING_PATH ?? path.join(root, "project", "forecasting"),
  crowdRequested: process.env.REPO_CROWD_REQUESTED_PATH ?? path.join(root, "project", "crawdetection_test"),
  crowdSource:
    process.env.REPO_CROWD_SOURCE_PATH ??
    (fs.existsSync(path.join(root, "project", "CrowdDetection"))
      ? path.join(root, "project", "CrowdDetection")
      : "/Users/project/CrowdDetection"),
  deepfake: process.env.REPO_DEEPFAKE_PATH ?? path.join(root, "project", "deepfake")
};

const heavyPathParts = new Set([
  ".git",
  ".venv",
  ".venv-crowd",
  "__pycache__",
  ".ipynb_checkpoints",
  "node_modules",
  "data",
  "datasets",
  "outputs",
  "output",
  "tmp",
  "cache"
]);

const heavyExtensions = new Set([".pt", ".pth", ".zip", ".npy", ".h5", ".hdf5"]);

function exists(filePath) {
  return fs.existsSync(filePath);
}

function readText(filePath) {
  return fs.readFileSync(filePath, "utf8");
}

function readJson(filePath) {
  return JSON.parse(readText(filePath));
}

function relativeToRoot(filePath) {
  return path.relative(root, filePath).replaceAll(path.sep, "/");
}

function isIgnored(filePath) {
  if (path.basename(filePath) === ".DS_Store") {
    return true;
  }

  const parts = filePath.split(path.sep);
  return parts.some((part) => heavyPathParts.has(part)) || heavyExtensions.has(path.extname(filePath));
}

function walkFiles(dir, matcher = () => true, limit = 80) {
  if (!exists(dir)) {
    return [];
  }

  const results = [];
  const walk = (current) => {
    if (results.length >= limit) {
      return;
    }

    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const fullPath = path.join(current, entry.name);
      if (isIgnored(fullPath)) {
        continue;
      }

      if (entry.isDirectory()) {
        walk(fullPath);
        continue;
      }

      if (entry.isFile() && matcher(fullPath)) {
        results.push(fullPath);
      }
    }
  };

  walk(dir);
  return results.sort();
}

function selectedTree(dir, keepPrefixes) {
  return walkFiles(dir, (filePath) => {
    const relative = path.relative(dir, filePath).replaceAll(path.sep, "/");
    return keepPrefixes.some((prefix) => relative.startsWith(prefix));
  }, 120).map((filePath) => path.relative(dir, filePath).replaceAll(path.sep, "/"));
}

function lineCount(filePath) {
  if (!exists(filePath)) {
    return 0;
  }

  const text = readText(filePath);
  if (!text) {
    return 0;
  }

  return text.split(/\r?\n/).length - (text.endsWith("\n") ? 1 : 0);
}

function csvRowCount(filePath) {
  return Math.max(lineCount(filePath) - 1, 0);
}

function fileSizeKb(filePath) {
  if (!exists(filePath)) {
    return null;
  }

  return Math.max(1, Math.round(fs.statSync(filePath).size / 1024));
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function publicUrl(...parts) {
  return `/portfolio-artifacts/${parts.join("/")}`;
}

function copyPublicAsset(source, ...parts) {
  if (!exists(source)) {
    return null;
  }

  const destination = path.join(publicArtifactsDir, ...parts);
  ensureDir(path.dirname(destination));
  fs.copyFileSync(source, destination);

  return {
    src: publicUrl(...parts),
    sizeKb: fileSizeKb(destination)
  };
}

function parseCsv(text) {
  const rows = [];
  let row = [];
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
      row.push(field);
      field = "";
      continue;
    }

    if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && next === "\n") {
        index += 1;
      }
      row.push(field);
      if (row.some((value) => value !== "")) {
        rows.push(row);
      }
      row = [];
      field = "";
      continue;
    }

    field += char;
  }

  if (field || row.length) {
    row.push(field);
    rows.push(row);
  }

  const headers = rows.shift() ?? [];
  return rows.map((values) =>
    Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ""]))
  );
}

function readCsvRows(filePath) {
  return exists(filePath) ? parseCsv(readText(filePath)) : [];
}

function csvNumber(value, digits = 2) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? number(parsed, digits) : null;
}

function rawNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function sortByNumber(rows, key, direction = "desc") {
  return [...rows].sort((a, b) => {
    const left = Number(a[key]) || 0;
    const right = Number(b[key]) || 0;
    return direction === "desc" ? right - left : left - right;
  });
}

function latestForecastingScreenshot(repo) {
  const preferred = path.join(repo, ".playwright-cli", "page-2026-03-19T17-58-43-469Z.png");
  if (exists(preferred)) {
    return preferred;
  }

  const screenshotDir = path.join(repo, ".playwright-cli");
  const screenshots = filesInDirectory(screenshotDir, (filePath) => filePath.endsWith(".png"));
  return screenshots.at(-1) ?? null;
}

function parseNpyFloatArray(filePath) {
  if (!exists(filePath)) {
    return null;
  }

  const buffer = fs.readFileSync(filePath);
  if (buffer.slice(1, 6).toString("latin1") !== "NUMPY") {
    return null;
  }

  const major = buffer[6];
  const headerLength = major === 1 ? buffer.readUInt16LE(8) : buffer.readUInt32LE(8);
  const headerOffset = major === 1 ? 10 : 12;
  const header = buffer.slice(headerOffset, headerOffset + headerLength).toString("latin1");
  const shapeMatch = header.match(/'shape':\s*\(([^)]*)\)/);
  const descriptorMatch = header.match(/'descr':\s*'([^']+)'/);

  if (!shapeMatch || !descriptorMatch) {
    return null;
  }

  const shape = shapeMatch[1]
    .split(",")
    .map((part) => Number(part.trim()))
    .filter((value) => Number.isFinite(value));
  const count = shape.reduce((total, value) => total * value, 1);
  const dataStart = headerOffset + headerLength;
  const dataBuffer = buffer.buffer.slice(
    buffer.byteOffset + dataStart,
    buffer.byteOffset + buffer.length
  );
  const descriptor = descriptorMatch[1];

  if (descriptor.endsWith("f4")) {
    return { shape, values: new Float32Array(dataBuffer, 0, count) };
  }

  if (descriptor.endsWith("f8")) {
    return { shape, values: new Float64Array(dataBuffer, 0, count) };
  }

  return null;
}

function heatColor(t) {
  const stops = [
    [15, 23, 42],
    [30, 64, 175],
    [14, 165, 233],
    [250, 204, 21],
    [248, 113, 113]
  ];
  const scaled = Math.max(0, Math.min(0.999, t)) * (stops.length - 1);
  const index = Math.floor(scaled);
  const mix = scaled - index;
  const start = stops[index];
  const end = stops[index + 1];
  const rgb = start.map((channel, channelIndex) =>
    Math.round(channel + (end[channelIndex] - channel) * mix)
  );
  return `rgb(${rgb.join(" ")})`;
}

function writeDensitySvg(npyPath, ...parts) {
  const parsed = parseNpyFloatArray(npyPath);
  if (!parsed || parsed.shape.length < 2) {
    return null;
  }

  const [height, width] = parsed.shape;
  const cols = 64;
  const rows = Math.max(24, Math.round((cols * height) / width));
  const cells = [];

  for (let rowIndex = 0; rowIndex < rows; rowIndex += 1) {
    for (let colIndex = 0; colIndex < cols; colIndex += 1) {
      const yStart = Math.floor((rowIndex / rows) * height);
      const yEnd = Math.max(yStart + 1, Math.floor(((rowIndex + 1) / rows) * height));
      const xStart = Math.floor((colIndex / cols) * width);
      const xEnd = Math.max(xStart + 1, Math.floor(((colIndex + 1) / cols) * width));
      let maxValue = 0;

      for (let y = yStart; y < yEnd; y += 4) {
        for (let x = xStart; x < xEnd; x += 4) {
          maxValue = Math.max(maxValue, parsed.values[y * width + x] ?? 0);
        }
      }

      cells.push({ row: rowIndex, col: colIndex, value: maxValue });
    }
  }

  const max = Math.max(...cells.map((cell) => cell.value), 0.000001);
  const cellW = 100 / cols;
  const cellH = 100 / rows;
  const rects = cells
    .filter((cell) => cell.value > 0)
    .map((cell) => {
      const intensity = Math.sqrt(cell.value / max);
      return `<rect x="${(cell.col * cellW).toFixed(3)}" y="${(cell.row * cellH).toFixed(3)}" width="${cellW.toFixed(3)}" height="${cellH.toFixed(3)}" fill="${heatColor(intensity)}" fill-opacity="${(0.2 + intensity * 0.8).toFixed(3)}"/>`;
    })
    .join("");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" preserveAspectRatio="none"><rect width="100" height="100" fill="rgb(2 6 23)"/>${rects}</svg>`;
  const destination = path.join(publicArtifactsDir, ...parts);

  ensureDir(path.dirname(destination));
  fs.writeFileSync(destination, svg);

  return {
    src: publicUrl(...parts),
    sizeKb: fileSizeKb(destination)
  };
}

function selectCrowdSamples(repo, requestedRepo, limit = 8) {
  const baselineRows = readCsvRows(
    path.join(repo, "outputs", "single_notebook_stage2", "stage2_stable_v3", "baseline", "sample_analysis.csv")
  );
  const advancedRows = readCsvRows(
    path.join(repo, "outputs", "single_notebook_stage2", "stage2_stable_v3", "advanced", "sample_analysis.csv")
  );
  const baselineByName = new Map(
    baselineRows.map((row) => [path.basename(row.image_path ?? ""), row])
  );
  const densityRoot = path.join(
    requestedRepo,
    "data",
    "density_cache",
    "v2_count_calibrated_part_A",
    "official_test"
  );
  const candidates = advancedRows
    .map((advanced) => {
      const imageName = path.basename(advanced.image_path ?? "");
      const baseline = baselineByName.get(imageName);
      const densityPath = path.join(densityRoot, imageName.replace(/\.[^.]+$/, ".npy"));
      const imagePath = advanced.image_path;

      if (!baseline || !exists(imagePath) || !exists(densityPath)) {
        return null;
      }

      const baselineError = Number(baseline.absolute_error);
      const advancedError = Number(advanced.absolute_error);

      return {
        imageName,
        imagePath,
        densityPath,
        groundTruth: Number(advanced.ground_truth_count),
        baselinePrediction: Number(baseline.predicted_count),
        advancedPrediction: Number(advanced.predicted_count),
        baselineError,
        advancedError,
        relativeError: Number(advanced.relative_error),
        densityBand: advanced.density_band,
        improvement: baselineError - advancedError
      };
    })
    .filter(Boolean)
    .filter((sample) => sample.densityBand === "high")
    .sort((a, b) => b.improvement - a.improvement);

  return candidates.slice(0, limit).map((selected) => {
    const imageAsset = copyPublicAsset(selected.imagePath, "crowd-detection", selected.imageName);
    const densityAsset = writeDensitySvg(
      selected.densityPath,
      "crowd-detection",
      `${selected.imageName.replace(/\.[^.]+$/, "")}-density.svg`
    );

    return {
      imageId: selected.imageName.replace(/\.[^.]+$/, ""),
      image: imageAsset
        ? {
            ...imageAsset,
            alt: "ShanghaiTech dense crowd evaluation sample used for baseline and advanced model comparison."
          }
        : null,
      density: densityAsset
        ? {
            ...densityAsset,
            alt: "Downsampled density-map visualization generated from the evaluation density cache."
          }
        : null,
      groundTruth: number(selected.groundTruth, 2),
      baselinePrediction: number(selected.baselinePrediction, 2),
      advancedPrediction: number(selected.advancedPrediction, 2),
      baselineError: number(selected.baselineError, 2),
      advancedError: number(selected.advancedError, 2),
      relativeError: number(selected.relativeError, 3),
      densityBand: selected.densityBand,
      improvement: number(selected.improvement, 2)
    };
  });
}

function bestDeepfakeEpoch(filePath, modelName) {
  const rows = readCsvRows(filePath);
  const best = sortByNumber(rows, "video_auc")[0];

  if (!best) {
    return null;
  }

  return {
    model: modelName,
    epoch: csvNumber(best.epoch, 0),
    trainLoss: csvNumber(best.train_loss, 4),
    frameAuc: csvNumber(best.frame_auc, 4),
    frameF1: csvNumber(best.frame_f1, 4),
    videoAuc: csvNumber(best.video_auc, 4),
    videoF1: csvNumber(best.video_f1, 4),
    videoAcc: csvNumber(best.video_acc, 4),
    threshold: csvNumber(best.best_thr_balacc, 2)
  };
}

function shortVideoName(videoId) {
  const parts = String(videoId).split("__").filter(Boolean);
  return parts.slice(-2).join(" / ") || String(videoId).slice(0, 36);
}

function dateKey(value) {
  const date = new Date(value);
  if (Number.isNaN(date.valueOf())) {
    const [month, day, year] = String(value).split("/");
    return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  }
  return date.toISOString().slice(0, 10);
}

function groupSum(rows, keyFn, valueFn) {
  const grouped = new Map();
  for (const row of rows) {
    const key = keyFn(row);
    grouped.set(key, (grouped.get(key) ?? 0) + valueFn(row));
  }
  return grouped;
}

function ratio(numerator, denominator) {
  return denominator ? numerator / denominator : 1;
}

function pythonSymbols(filePath) {
  if (!exists(filePath)) {
    return [];
  }

  const text = readText(filePath);
  const matches = [...text.matchAll(/^\s*(class|def)\s+([A-Za-z_][A-Za-z0-9_]*)/gm)];
  return matches.map((match) => `${match[1]} ${match[2]}`);
}

function filesInDirectory(dir, predicate) {
  if (!exists(dir)) {
    return [];
  }

  return fs
    .readdirSync(dir)
    .map((entry) => path.join(dir, entry))
    .filter((filePath) => fs.statSync(filePath).isFile())
    .filter(predicate)
    .sort();
}

function notebookOutline(filePath) {
  if (!exists(filePath)) {
    return { cells: 0, headings: [], codeSignals: [] };
  }

  const notebook = readJson(filePath);
  const cells = Array.isArray(notebook.cells) ? notebook.cells : [];
  const headings = [];
  const codeSignals = [];

  for (const cell of cells) {
    const source = Array.isArray(cell.source) ? cell.source.join("") : "";
    if (cell.cell_type === "markdown") {
      const firstHeading = source
        .split(/\r?\n/)
        .map((line) => line.trim())
        .find((line) => line.startsWith("#"));
      if (firstHeading) {
        headings.push(firstHeading.replace(/^#+\s*/, ""));
      }
    }

    if (cell.cell_type === "code") {
      for (const match of source.matchAll(/(?:class|def)\s+([A-Za-z_][A-Za-z0-9_]*)/g)) {
        codeSignals.push(match[0]);
      }
    }
  }

  return { cells: cells.length, headings, codeSignals: [...new Set(codeSignals)] };
}

function parseDependencies(pyprojectPath) {
  if (!exists(pyprojectPath)) {
    return [];
  }

  const text = readText(pyprojectPath);
  const block = text.match(/dependencies\s*=\s*\[([\s\S]*?)\]/m)?.[1] ?? "";
  return [...block.matchAll(/"([^">=]+)(?:[>=<].*)?"/g)].map((match) => match[1]);
}

function number(value, digits = 2) {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return null;
  }

  return Number(value.toFixed(digits));
}

function extractForecasting() {
  const repo = paths.forecasting;
  const sourceFiles = selectedTree(repo, ["src/restaurant_forecasting/", "scripts/", "tests/", "app/", "pyproject.toml"]);
  const pipelineFile = path.join(repo, "src", "restaurant_forecasting", "pipeline.py");
  const forecastingFile = path.join(repo, "src", "restaurant_forecasting", "forecasting.py");
  const inventoryFile = path.join(repo, "src", "restaurant_forecasting", "inventory.py");
  const streamlitFile = path.join(repo, "app", "streamlit_app.py");
  const testFile = path.join(repo, "tests", "test_pipeline.py");
  const outputDir = path.join(repo, "output", "forecast");
  const outputCsvs = filesInDirectory(outputDir, (filePath) => filePath.endsWith(".csv"));
  const dashboardScreenshot = latestForecastingScreenshot(repo);
  const dashboardAsset = dashboardScreenshot
    ? copyPublicAsset(dashboardScreenshot, "forecasting", "streamlit-dashboard.png")
    : null;
  const menuForecastRows = readCsvRows(path.join(outputDir, "menu_item_forecast.csv"));
  const ingredientForecastRows = readCsvRows(path.join(outputDir, "ingredient_forecast.csv"));
  const inventoryAlertRows = readCsvRows(path.join(outputDir, "inventory_alerts.csv"));
  const supplierReorderRows = readCsvRows(path.join(outputDir, "supplier_reorders.csv"));
  const recipeRows = readCsvRows(path.join(repo, "data", "reference", "recipe_mapping.csv"));
  const salesRows = readCsvRows(path.join(repo, "data", "raw", "restaurant_sales_data.csv"));
  const salesTotal = salesRows.reduce((sum, row) => sum + rawNumber(row.quantity_sold), 0);
  const promotionTotal = salesRows
    .filter((row) => String(row.has_promotion).toLowerCase() === "true")
    .reduce((sum, row) => sum + rawNumber(row.quantity_sold), 0);
  const nonPromotionTotal = salesRows
    .filter((row) => String(row.has_promotion).toLowerCase() !== "true")
    .reduce((sum, row) => sum + rawNumber(row.quantity_sold), 0);
  const eventTotal = salesRows
    .filter((row) => String(row.special_event).toLowerCase() === "true")
    .reduce((sum, row) => sum + rawNumber(row.quantity_sold), 0);
  const nonEventTotal = salesRows
    .filter((row) => String(row.special_event).toLowerCase() !== "true")
    .reduce((sum, row) => sum + rawNumber(row.quantity_sold), 0);
  const weatherTotals = Object.fromEntries(
    ["Sunny", "Cloudy", "Rainy"].map((weather) => {
      const rows = salesRows.filter((row) => row.weather_condition === weather);
      const avg = rows.reduce((sum, row) => sum + rawNumber(row.quantity_sold), 0) / Math.max(rows.length, 1);
      const globalAvg = salesTotal / Math.max(salesRows.length, 1);
      return [weather, number(ratio(avg, globalAvg), 3)];
    })
  );
  const historicalDemand = [...groupSum(salesRows, (row) => dateKey(row.date), (row) => rawNumber(row.quantity_sold))]
    .slice(-90)
    .map(([date, demand]) => ({ date, demand: number(demand, 2) }));
  const topMenuForecasts = sortByNumber(menuForecastRows, "predicted_quantity_sold")
    .slice(0, 6)
    .map((row) => ({
      item: row.menu_item_name,
      predictedQuantity: csvNumber(row.predicted_quantity_sold, 2),
      activeRestaurants: csvNumber(row.active_restaurant_count, 0),
      averagePerRestaurant: csvNumber(row.average_per_active_restaurant, 2)
    }));
  const topIngredientDemand = sortByNumber(ingredientForecastRows, "projected_ingredient_usage")
    .slice(0, 6)
    .map((row) => ({
      ingredient: row.ingredient_name,
      unit: row.unit,
      projectedUsage: csvNumber(row.projected_ingredient_usage, 2),
      coveredMenuQuantity: csvNumber(row.covered_menu_quantity, 2)
    }));
  const criticalAlerts = inventoryAlertRows
    .filter((row) => row.alert_status === "critical")
    .slice(0, 6)
    .map((row) => ({
      item: row.Item_Name,
      stock: csvNumber(row.Current_Stock, 2),
      daysOfCover: csvNumber(row.days_of_cover, 2),
      reorderQuantity: csvNumber(row.recommended_reorder_qty, 2),
      estimatedCost: csvNumber(row.estimated_reorder_cost, 2),
      supplier: row.Supplier_Name,
      status: row.alert_status
    }));
  const supplierOrders = supplierReorderRows.slice(0, 3).map((row) => ({
    supplier: row.supplier_name,
    leadTimeDays: csvNumber(row.lead_time_days, 0),
    totalQuantity: csvNumber(row.total_reorder_quantity, 2),
    estimatedCost: csvNumber(row.total_estimated_cost, 2),
    itemCount: row.items_to_order ? row.items_to_order.split(";").filter(Boolean).length : 0
  }));

  return {
    id: "forecasting",
    title: "Restaurant Inventory Forecasting Capstone",
    eyebrow: "Repository-driven capstone prototype",
    repoLabel: "project/forecasting",
    sourceStatus: exists(repo) ? "analyzed" : "missing",
    summary:
      "A Python package plus Streamlit dashboard that runs a full planning workflow: load restaurant data, forecast menu demand, convert it through recipe mappings, evaluate stock risk, and draft supplier reorders.",
    stack: parseDependencies(path.join(repo, "pyproject.toml")),
    structure: sourceFiles,
    architecture: [
      {
        label: "Pipeline orchestration",
        file: "src/restaurant_forecasting/pipeline.py",
        detail:
          "run_pipeline wires loaders, RidgeDemandForecaster, ingredient conversion, inventory alerts, supplier reorders, draft messages, and mapping coverage into one result object."
      },
      {
        label: "Forecasting model",
        file: "src/restaurant_forecasting/forecasting.py",
        detail:
          "RidgeDemandForecaster builds calendar, restaurant, menu, weather, promotion, pricing, and event features, then solves ridge regression with NumPy."
      },
      {
        label: "Inventory logic",
        file: "src/restaurant_forecasting/inventory.py",
        detail:
          "Inventory logic is deterministic: historical ingredient usage, synthetic missing ingredient inventory, days of cover, lead-time demand, reorder quantity, supplier grouping, and draft email generation."
      },
      {
        label: "Dashboard layer",
        file: "app/streamlit_app.py",
        detail:
          "Streamlit exposes scenario controls, CSV uploads, Quick Stock Update state, forecast charts, stock health, supplier orders, and downloadable CSV outputs."
      }
    ],
    pipeline: [
      "CSV loaders validate and normalize sales, inventory, recipe mapping, and supplier contact schemas.",
      "RidgeDemandForecaster performs a time-based holdout evaluation and forecasts menu demand for a configurable horizon.",
      "Forecasted menu quantities are joined to recipe_mapping and multiplied by quantity_per_order.",
      "Stock alerts compare effective daily usage, current stock, reorder level, and supplier lead time.",
      "Recommended reorder quantities are grouped by supplier and rendered as summary tables plus draft order emails."
    ],
    logicSplit: [
      "Machine learning is isolated to menu-level sales forecasting.",
      "Ingredient conversion, stock health, reorder quantities, supplier routing, and draft messages are rule-based business logic."
    ],
    codeSignals: [
      { file: "forecasting.py", symbols: pythonSymbols(forecastingFile) },
      { file: "inventory.py", symbols: pythonSymbols(inventoryFile).slice(0, 18) },
      { file: "pipeline.py", symbols: pythonSymbols(pipelineFile) },
      { file: "streamlit_app.py", symbols: pythonSymbols(streamlitFile).slice(0, 18) }
    ],
    tests: {
      file: "tests/test_pipeline.py",
      count: pythonSymbols(testFile).filter((symbol) => symbol.startsWith("def test_")).length,
      focus: [
        "case-insensitive recipe joins",
        "supplier contact coverage",
        "historical ingredient usage correctness",
        "chain-level forecast totals",
        "augmented inventory coverage",
        "non-negative reorder quantities",
        "complete mapping coverage"
      ]
    },
    metrics: [
      { label: "Forecast metrics", value: "MAE / RMSE / WAPE", detail: "Computed through a time-based holdout split in RidgeDemandForecaster.evaluate." },
      { label: "Output CSVs", value: String(outputCsvs.length), detail: "Generated lightweight planning outputs." },
      { label: "Tests", value: String(pythonSymbols(testFile).filter((symbol) => symbol.startsWith("def test_")).length), detail: "Smoke tests cover workflow integration and inventory invariants." }
    ],
    showcase: {
      dashboard: dashboardAsset
        ? {
            ...dashboardAsset,
            alt: "Streamlit central warehouse planning dashboard showing demand, stock issues, reorder spend, and supplier drafts.",
            caption: "Actual Streamlit dashboard capture from the forecasting project."
          }
        : null,
      workflow: [
        { label: "Sales history", detail: "Menu-level demand by date, restaurant, weather, promotions, pricing, and event flags." },
        { label: "Ridge forecast", detail: "The only ML stage: a simple, debuggable demand forecast for menu item quantities." },
        { label: "Recipe mapping", detail: "Forecasted dishes are converted into ingredient requirements using quantity_per_order." },
        { label: "Stock health", detail: "Current stock is compared against usage, reorder levels, and supplier lead time." },
        { label: "Supplier plan", detail: "Items are grouped into reorder recommendations and draft supplier messages." }
      ],
      topMenuForecasts,
      topIngredientDemand,
      criticalAlerts,
      supplierOrders,
      outputPreviews: [
        {
          title: "Menu item forecast",
          source: "menu_item_forecast.csv",
          rows: topMenuForecasts
        },
        {
          title: "Critical stock alerts",
          source: "inventory_alerts.csv",
          rows: criticalAlerts
        },
        {
          title: "Supplier reorder summary",
          source: "supplier_reorders.csv",
          rows: supplierOrders
        }
      ],
      appData: {
        defaultHorizon: 14,
        scenarioMultipliers: {
          weather: weatherTotals,
          promotion: number(ratio(promotionTotal / Math.max(salesRows.filter((row) => String(row.has_promotion).toLowerCase() === "true").length, 1), nonPromotionTotal / Math.max(salesRows.filter((row) => String(row.has_promotion).toLowerCase() !== "true").length, 1)), 3),
          event: number(ratio(eventTotal / Math.max(salesRows.filter((row) => String(row.special_event).toLowerCase() === "true").length, 1), nonEventTotal / Math.max(salesRows.filter((row) => String(row.special_event).toLowerCase() !== "true").length, 1)), 3)
        },
        menuForecast: menuForecastRows.map((row) => ({
          date: row.forecast_date,
          menuItem: row.menu_item_name,
          predictedQuantity: csvNumber(row.predicted_quantity_sold, 2),
          activeRestaurants: csvNumber(row.active_restaurant_count, 0),
          averagePerRestaurant: csvNumber(row.average_per_active_restaurant, 2)
        })),
        recipeMapping: recipeRows.map((row) => ({
          menuItem: row.menu_item_name,
          ingredient: row.ingredient_name,
          quantityPerOrder: csvNumber(row.quantity_per_order, 4),
          unit: row.unit
        })),
        inventory: inventoryAlertRows.map((row) => ({
          item: row.Item_Name,
          unit: row.Unit,
          currentStock: csvNumber(row.Current_Stock, 2),
          reorderLevel: csvNumber(row.Reorder_Level, 2),
          historicalDailyUsage: csvNumber(row.historical_daily_usage, 4),
          forecastDailyUsage: csvNumber(row.forecast_daily_usage, 4),
          effectiveDailyUsage: csvNumber(row.effective_daily_usage, 4),
          leadTime: csvNumber(row.Lead_Time, 0),
          supplier: row.Supplier_Name,
          pricePerUnit: csvNumber(row.Price_per_Unit, 2),
          status: row.alert_status
        })),
        supplierContacts: supplierReorderRows.map((row) => ({
          supplier: row.supplier_name,
          email: row.email,
          contact: row.contact_person,
          phone: row.phone,
          leadTimeDays: csvNumber(row.lead_time_days, 0)
        })),
        historicalDemand
      }
    },
    artifacts: [
      { name: "menu_item_forecast.csv", rows: csvRowCount(path.join(outputDir, "menu_item_forecast.csv")), ship: false },
      { name: "ingredient_forecast.csv", rows: csvRowCount(path.join(outputDir, "ingredient_forecast.csv")), ship: false },
      { name: "inventory_alerts.csv", rows: csvRowCount(path.join(outputDir, "inventory_alerts.csv")), ship: false },
      { name: "supplier_reorders.csv", rows: csvRowCount(path.join(outputDir, "supplier_reorders.csv")), ship: false },
      { name: "supplier_order_drafts.csv", rows: csvRowCount(path.join(outputDir, "supplier_order_drafts.csv")), ship: false }
    ],
    excluded: [".venv", "data/raw", "output/forecast", "__pycache__", ".playwright-cli"]
  };
}

function extractCrowdDetection() {
  const requestedRepo = paths.crowdRequested;
  const repo = exists(path.join(paths.crowdSource, "src", "crowd_detection"))
    ? paths.crowdSource
    : requestedRepo;
  const sourceFiles = selectedTree(repo, ["src/crowd_detection/", "scripts/", "configs/", "docs/", "pyproject.toml"]);
  const baselineConfig = exists(path.join(repo, "configs", "baseline_shanghaitech_a.json"))
    ? readJson(path.join(repo, "configs", "baseline_shanghaitech_a.json"))
    : null;
  const advancedConfig = exists(path.join(repo, "configs", "advanced_shanghaitech_a.json"))
    ? readJson(path.join(repo, "configs", "advanced_shanghaitech_a.json"))
    : null;
  const baselineMetricsPath = path.join(repo, "outputs", "single_notebook_stage2", "stage2_stable_v3", "baseline", "best_metrics.json");
  const advancedMetricsPath = path.join(repo, "outputs", "single_notebook_stage2", "stage2_stable_v3", "advanced", "best_metrics.json");
  const baselineBreakdownPath = path.join(repo, "outputs", "single_notebook_stage2", "stage2_stable_v3", "baseline", "density_breakdown.json");
  const advancedBreakdownPath = path.join(repo, "outputs", "single_notebook_stage2", "stage2_stable_v3", "advanced", "density_breakdown.json");
  const baselineMetrics = exists(baselineMetricsPath) ? readJson(baselineMetricsPath) : null;
  const advancedMetrics = exists(advancedMetricsPath) ? readJson(advancedMetricsPath) : null;
  const baselineBreakdown = exists(baselineBreakdownPath) ? readJson(baselineBreakdownPath) : null;
  const advancedBreakdown = exists(advancedBreakdownPath) ? readJson(advancedBreakdownPath) : null;
  const baselineHistory = exists(path.join(repo, "outputs", "single_notebook_stage2", "stage2_stable_v3", "baseline", "history.json"))
    ? readJson(path.join(repo, "outputs", "single_notebook_stage2", "stage2_stable_v3", "baseline", "history.json"))
    : [];
  const advancedHistory = exists(path.join(repo, "outputs", "single_notebook_stage2", "stage2_stable_v3", "advanced", "history.json"))
    ? readJson(path.join(repo, "outputs", "single_notebook_stage2", "stage2_stable_v3", "advanced", "history.json"))
    : [];
  const showcaseSamples = selectCrowdSamples(repo, requestedRepo);
  const metricComparison = [
    { label: "MAE", baseline: number(baselineMetrics?.mae, 2), advanced: number(advancedMetrics?.mae, 2), lowerIsBetter: true },
    { label: "RMSE", baseline: number(baselineMetrics?.rmse, 2), advanced: number(advancedMetrics?.rmse, 2), lowerIsBetter: true },
    {
      label: "High-density MAE",
      baseline: baselineBreakdown?.high ? number(baselineBreakdown.high.mae, 2) : null,
      advanced: advancedBreakdown?.high ? number(advancedBreakdown.high.mae, 2) : null,
      lowerIsBetter: true
    },
    { label: "SSIM", baseline: number(baselineMetrics?.ssim, 3), advanced: number(advancedMetrics?.ssim, 3), lowerIsBetter: false }
  ];

  return {
    id: "crowd-detection",
    title: "CrowdDetection Stage 2",
    eyebrow: "Reproducible research engineering",
    repoLabel: exists(path.join(requestedRepo, "csrnet_stage2_advanced_fixed_backup.ipynb"))
      ? "project/crawdetection_test + CrowdDetection source"
      : "CrowdDetection source",
    sourceStatus: exists(repo) ? "analyzed" : "missing",
    summary:
      "A modular PyTorch crowd-counting codebase that separates density-map generation, datasets, CSRNet variants, training, evaluation, checkpointing, and report-ready comparison outputs.",
    stack: parseDependencies(path.join(repo, "pyproject.toml")),
    structure: sourceFiles,
    architecture: [
      {
        label: "Baseline model",
        file: "src/crowd_detection/models/csrnet.py",
        detail:
          "CSRNetBaseline uses a VGG16-style frontend, a dilated backend, and a 1-channel density head for fair reproduction."
      },
      {
        label: "Advanced model",
        file: "src/crowd_detection/models/csrnet.py",
        detail:
          "AdvancedCSRNet adds MultiScaleContextBlock, residual dilated blocks, CBAM channel/spatial attention, dropout, batch norm, and a refined density head."
      },
      {
        label: "Count-consistency loss",
        file: "src/crowd_detection/losses.py",
        detail:
          "CrowdCountingLoss combines density MSE with optional L1 count loss after shape matching preserves predicted count mass."
      },
      {
        label: "Training engine",
        file: "src/crowd_detection/engine/trainer.py",
        detail:
          "The trainer handles AMP, gradient clipping, schedulers, checkpoint snapshots, best metrics, sample analysis, and density breakdown exports."
      }
    ],
    pipeline: [
      "Generate ShanghaiTech density maps from point annotations with KDTree-informed Gaussian smoothing.",
      "Load count-preserving resized/downsampled density maps through ShanghaiTechCrowdDataset.",
      "Train CSRNetBaseline and AdvancedCSRNet from JSON configs with identical split structure.",
      "Track MAE, RMSE, PSNR, SSIM, density loss, count loss, and sample-level density bands.",
      "Compare baseline and advanced output folders into report-ready metric tables."
    ],
    configComparison: {
      baseline: baselineConfig
        ? {
            model: baselineConfig.model.name,
            optimizer: baselineConfig.optimizer.name,
            lr: baselineConfig.optimizer.lr,
            countWeight: baselineConfig.loss.count_weight,
            amp: baselineConfig.training.amp,
            epochs: baselineConfig.training.epochs
          }
        : null,
      advanced: advancedConfig
        ? {
            model: advancedConfig.model.name,
            optimizer: advancedConfig.optimizer.name,
            lr: advancedConfig.optimizer.lr,
            countWeight: advancedConfig.loss.count_weight,
            amp: advancedConfig.training.amp,
            epochs: advancedConfig.training.epochs,
            contextRates: advancedConfig.model.context_rates,
            attentionReduction: advancedConfig.model.attention_reduction,
            dropout: advancedConfig.model.dropout
          }
        : null
    },
    codeSignals: [
      { file: "models/csrnet.py", symbols: pythonSymbols(path.join(repo, "src", "crowd_detection", "models", "csrnet.py")) },
      { file: "models/blocks.py", symbols: pythonSymbols(path.join(repo, "src", "crowd_detection", "models", "blocks.py")) },
      { file: "losses.py", symbols: pythonSymbols(path.join(repo, "src", "crowd_detection", "losses.py")) },
      { file: "engine/trainer.py", symbols: pythonSymbols(path.join(repo, "src", "crowd_detection", "engine", "trainer.py")).slice(0, 10) }
    ],
    metrics: [
      { label: "Baseline MAE", value: number(baselineMetrics?.mae, 2), detail: "Stage2 stable v3 best metrics." },
      { label: "Advanced MAE", value: number(advancedMetrics?.mae, 2), detail: "Stage2 stable v3 best metrics." },
      {
        label: "High-density MAE",
        value: advancedBreakdown?.high ? number(advancedBreakdown.high.mae, 2) : null,
        detail: baselineBreakdown?.high
          ? `Baseline high-density MAE was ${number(baselineBreakdown.high.mae, 2)}.`
          : "High-density breakdown unavailable."
      },
      {
        label: "Advanced RMSE",
        value: advancedMetrics ? number(advancedMetrics.rmse, 2) : null,
        detail: "Reported from repository output JSON, not invented."
      }
    ],
    showcase: {
      sample: showcaseSamples[0] ?? null,
      samples: showcaseSamples,
      metricComparison,
      trainingHistory: Array.from(
        { length: Math.max(baselineHistory.length, advancedHistory.length) },
        (_, index) => ({
          epoch: index + 1,
          baselineMae: baselineHistory[index] ? number(baselineHistory[index].val_mae, 2) : null,
          advancedMae: advancedHistory[index] ? number(advancedHistory[index].val_mae, 2) : null
        })
      ),
      densityBreakdown: ["low", "medium", "high"].map((band) => ({
        band,
        baselineMae: baselineBreakdown?.[band] ? number(baselineBreakdown[band].mae, 2) : null,
        advancedMae: advancedBreakdown?.[band] ? number(advancedBreakdown[band].mae, 2) : null,
        sampleCount: advancedBreakdown?.[band]?.count ?? baselineBreakdown?.[band]?.count ?? null
      })),
      workflow: [
        { label: "Density-map targets", detail: "Point annotations are converted into count-preserving density maps." },
        { label: "Baseline reproduction", detail: "CSRNetBaseline creates a fair dilated-backend reference point." },
        { label: "Advanced context model", detail: "Multi-scale context and attention are added to handle occlusion and scale variation." },
        { label: "Evaluation outputs", detail: "MAE, RMSE, sample analysis, and density-band breakdowns are exported for comparison." }
      ]
    },
    artifacts: [
      { name: "best_metrics.json", path: "outputs/single_notebook_stage2/stage2_stable_v3/*/best_metrics.json", ship: false },
      { name: "density_breakdown.json", path: "outputs/single_notebook_stage2/stage2_stable_v3/*/density_breakdown.json", ship: false },
      { name: "legacy_stage2_advanced_best.pt", path: "project/crawdetection_test/artifacts/pretrained", ship: false },
      { name: "shanghaitech.zip", path: "project/crawdetection_test", ship: false }
    ],
    excluded: [".venv-crowd", "data/ShanghaiTech", "data/density_cache", "outputs", "artifacts/pretrained", "shanghaitech.zip"]
  };
}

function extractDeepfake() {
  const repo = paths.deepfake;
  const evalReportPath = path.join(repo, "artifacts", "eval_report.json");
  const finalMetaPath = path.join(repo, "artifacts", "model_final_meta.json");
  const evalReport = exists(evalReportPath) ? readJson(evalReportPath) : null;
  const finalMeta = exists(finalMetaPath) ? readJson(finalMetaPath) : null;
  const trainingNotebook = notebookOutline(path.join(repo, "deepfake_video_ffpp_c23.ipynb"));
  const uiNotebook = notebookOutline(path.join(repo, "ui.ipynb"));
  const rocAsset = copyPublicAsset(path.join(repo, "artifacts", "roc_video.png"), "deepfake", "roc-video.png");
  const confusionAsset = copyPublicAsset(
    path.join(repo, "artifacts", "cm_video_thr.png"),
    "deepfake",
    "confusion-video-threshold.png"
  );
  const videoScoreRows = readCsvRows(path.join(repo, "artifacts", "val_video_scores.csv"));
  const threshold = Number(finalMeta?.threshold ?? evalReport?.threshold ?? 0.5);
  const fakeExample = sortByNumber(
    videoScoreRows.filter((row) => row.y === "1.0" || row.y === "1"),
    "p"
  )[0];
  const realExample = sortByNumber(
    videoScoreRows.filter((row) => row.y === "0.0" || row.y === "0"),
    "p",
    "asc"
  )[0];
  const borderlineExample = [...videoScoreRows].sort(
    (a, b) => Math.abs(Number(a.p) - threshold) - Math.abs(Number(b.p) - threshold)
  )[0];
  const inferenceExamples = [fakeExample, realExample, borderlineExample]
    .filter(Boolean)
    .map((row) => ({
      video: shortVideoName(row.video_id),
      label: Number(row.y) === 1 ? "fake" : "real",
      probabilityFake: csvNumber(row.p, 4),
      decision: Number(row.p) >= threshold ? "fake" : "real"
    }));

  return {
    id: "deepfake",
    title: "Deepfake Detection",
    eyebrow: "Notebook-to-artifact computer vision experiment",
    repoLabel: "project/deepfake",
    sourceStatus: exists(repo) ? "analyzed" : "missing",
    summary:
      "A notebook-based video deepfake detection experiment that builds a FaceForensics++ C23 frame index, splits by video to avoid leakage, trains EfficientNet-B0 and ResNet50, evaluates frame/video metrics, and exports a Gradio inference notebook.",
    stack: ["PyTorch", "timm", "OpenCV", "pandas", "scikit-learn", "Gradio"],
    structure: selectedTree(repo, ["artifacts/", "metrics_", "deepfake_video_ffpp_c23.ipynb", "ui.ipynb"]).filter(
      (item) => !item.endsWith(".pt")
    ),
    architecture: [
      {
        label: "Frame sampling",
        file: "deepfake_video_ffpp_c23.ipynb",
        detail:
          "Videos are converted into frame-level rows using evenly spaced frame indices; large frame caches are avoided."
      },
      {
        label: "Anti-leakage split",
        file: "artifacts/train_frames.csv + artifacts/val_frames.csv",
        detail:
          "GroupShuffleSplit separates train and validation by video_id so frames from the same video do not appear in both splits."
      },
      {
        label: "Model experiments",
        file: "metrics_efficientnet_b0.csv + metrics_resnet50.csv",
        detail:
          "EfficientNet-B0 and ResNet50 are trained with BCEWithLogitsLoss and compared using frame-level and video-level metrics."
      },
      {
        label: "Inference UI",
        file: "ui.ipynb",
        detail:
          "The Gradio UI loads model_final_meta.json and model_final.pt, samples frames, optionally crops faces, averages p(fake), and applies the tuned threshold."
      }
    ],
    pipeline: [
      "Find video files and infer real/fake labels from FaceForensics++ folder structure.",
      "Sample frame indices per video and persist train/validation CSVs.",
      "Decode frames lazily with OpenCV and optionally crop the largest detected face.",
      "Train EfficientNet-B0 and ResNet50 with frame-level binary classification.",
      "Aggregate frame probabilities by video, tune a threshold by balanced accuracy, and export evaluation artifacts."
    ],
    notebooks: [
      { file: "deepfake_video_ffpp_c23.ipynb", cells: trainingNotebook.cells, headings: trainingNotebook.headings.slice(0, 12), codeSignals: trainingNotebook.codeSignals.slice(0, 16) },
      { file: "ui.ipynb", cells: uiNotebook.cells, headings: uiNotebook.headings, codeSignals: uiNotebook.codeSignals.slice(0, 12) }
    ],
    codeSignals: [
      { file: "deepfake_video_ffpp_c23.ipynb", symbols: trainingNotebook.codeSignals.slice(0, 16) },
      { file: "ui.ipynb", symbols: uiNotebook.codeSignals.slice(0, 12) }
    ],
    metrics: [
      { label: "Final model", value: finalMeta?.model_name ?? null, detail: `checkpoint: ${finalMeta?.checkpoint_source ?? "unknown"}` },
      { label: "Video AUC", value: evalReport ? number(evalReport.video_auc, 4) : null, detail: "From artifacts/eval_report.json." },
      { label: "Video F1", value: evalReport ? number(evalReport.video_f1, 4) : null, detail: "From artifacts/eval_report.json." },
      { label: "Threshold", value: finalMeta ? number(finalMeta.threshold, 2) : null, detail: `${finalMeta?.infer_frames_k ?? "?"} sampled frames at inference.` }
    ],
    showcase: {
      plots: [
        rocAsset
          ? {
              ...rocAsset,
              title: "Video-level ROC",
              alt: "Video-level ROC curve for the ResNet50 deepfake detector."
            }
          : null,
        confusionAsset
          ? {
              ...confusionAsset,
              title: "Thresholded confusion matrix",
              alt: "Video-level confusion matrix at tuned threshold for the ResNet50 deepfake detector."
            }
          : null
      ].filter(Boolean),
      modelComparison: [
        bestDeepfakeEpoch(path.join(repo, "metrics_resnet50.csv"), "ResNet50"),
        bestDeepfakeEpoch(path.join(repo, "metrics_efficientnet_b0.csv"), "EfficientNet-B0")
      ].filter(Boolean),
      inferenceExamples,
      appData: {
        threshold,
        defaultFrames: finalMeta?.infer_frames_k ?? 16,
        modelName: finalMeta?.model_name ?? evalReport?.model_name ?? "resnet50",
        valMetrics: {
          accuracy: number(evalReport?.video_acc, 4),
          f1: number(evalReport?.video_f1, 4),
          auc: number(evalReport?.video_auc, 4)
        },
        videoScores: videoScoreRows.map((row) => ({
          video: shortVideoName(row.video_id),
          label: Number(row.y) === 1 ? "FAKE" : "REAL",
          probabilityFake: csvNumber(row.p, 4),
          decision: Number(row.p) >= threshold ? "FAKE" : "REAL"
        }))
      },
      splitSummary: [
        { label: "Train frames", value: csvRowCount(path.join(repo, "artifacts", "train_frames.csv")) },
        { label: "Validation frames", value: csvRowCount(path.join(repo, "artifacts", "val_frames.csv")) },
        { label: "Validation videos", value: csvRowCount(path.join(repo, "artifacts", "val_video_scores.csv")) },
        { label: "Inference frames", value: finalMeta?.infer_frames_k ?? null }
      ],
      workflow: [
        { label: "Video-level split", detail: "Train and validation are separated by video_id to avoid frame leakage." },
        { label: "Frame sampling", detail: "Videos are sampled into frame rows instead of storing huge frame exports." },
        { label: "Model comparison", detail: "EfficientNet-B0 and ResNet50 are evaluated on frame and video metrics." },
        { label: "Inference aggregation", detail: "Frame probabilities are averaged into a video-level probability and thresholded." }
      ]
    },
    artifacts: [
      { name: "train_frames.csv", rows: csvRowCount(path.join(repo, "artifacts", "train_frames.csv")), ship: false },
      { name: "val_frames.csv", rows: csvRowCount(path.join(repo, "artifacts", "val_frames.csv")), ship: false },
      { name: "val_video_scores.csv", rows: csvRowCount(path.join(repo, "artifacts", "val_video_scores.csv")), ship: false },
      { name: "eval_report.json", sizeKb: fileSizeKb(evalReportPath), ship: true },
      { name: "roc_video.png", sizeKb: fileSizeKb(path.join(repo, "artifacts", "roc_video.png")), ship: true },
      { name: "cm_video_thr.png", sizeKb: fileSizeKb(path.join(repo, "artifacts", "cm_video_thr.png")), ship: true },
      { name: "model_final.pt", sizeKb: fileSizeKb(path.join(repo, "artifacts", "model_final.pt")), ship: false },
      { name: "best_resnet50.pt", sizeKb: fileSizeKb(path.join(repo, "best_resnet50.pt")), ship: false }
    ],
    excluded: ["best_*.pt", "artifacts/model_final.pt", "raw videos", "large frame exports"]
  };
}

const intelligence = {
  generatedAt: new Date().toISOString(),
  contract:
    "Generated from local repositories. The app consumes this lightweight JSON; it does not ship source repos, datasets, checkpoints, caches, or training outputs.",
  repositories: {
    forecasting: extractForecasting(),
    crowdDetection: extractCrowdDetection(),
    deepfake: extractDeepfake()
  }
};

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, `${JSON.stringify(intelligence, null, 2)}\n`);
console.log(`Repository intelligence written to ${relativeToRoot(outputPath)}`);
