"use client";

import { useMemo } from "react";
import Image from "next/image";
import { cn } from "@/lib/cn";

type Primitive = string | number | boolean | null | undefined;

export type ShowcaseAsset = {
  src: string;
  alt: string;
  title?: string;
  caption?: string;
};

export type WorkflowItem = {
  label: string;
  detail: string;
};

export type OutcomeMetric = {
  label: string;
  value: Primitive;
  detail: string;
};

export type ColumnDefinition = {
  key: string;
  label: string;
  align?: "left" | "right";
  format?: (value: Primitive, row: Record<string, Primitive>) => string;
};

export function ShowcaseImage({
  asset,
  className,
  imageClassName
}: {
  asset: ShowcaseAsset;
  className?: string;
  imageClassName?: string;
}) {
  return (
    <figure className={cn("overflow-hidden rounded-3xl border border-slate-200 bg-slate-100 shadow-sm", className)}>
      <Image
        src={asset.src}
        alt={asset.alt}
        width={1600}
        height={900}
        loading="lazy"
        sizes="(max-width: 768px) 100vw, 50vw"
        unoptimized={asset.src.endsWith(".svg")}
        className={cn("h-full w-full object-cover", imageClassName)}
      />
      {asset.caption || asset.title ? (
        <figcaption className="border-t border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">
          {asset.caption ?? asset.title}
        </figcaption>
      ) : null}
    </figure>
  );
}

export function WorkflowCards({ items }: { items: readonly WorkflowItem[] }) {
  return (
    <div className="grid gap-3 md:grid-cols-5">
      {items.map((item, index) => (
        <article key={item.label} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="font-mono text-xs text-slate-400">0{index + 1}</p>
          <h3 className="mt-3 text-sm font-semibold text-slate-950">{item.label}</h3>
          <p className="mt-2 text-sm leading-6 text-slate-600">{item.detail}</p>
        </article>
      ))}
    </div>
  );
}

export function MetricStrip({ metrics }: { metrics: readonly OutcomeMetric[] }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {metrics.map((metric) => (
        <div key={metric.label} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-xs font-medium uppercase tracking-[0.14em] text-slate-400">
            {metric.label}
          </p>
          <p className="mt-2 break-words text-xl font-semibold tracking-[-0.03em] text-slate-950 sm:text-2xl">
            {metric.value ?? "N/A"}
          </p>
          <p className="mt-2 text-sm leading-6 text-slate-600">{metric.detail}</p>
        </div>
      ))}
    </div>
  );
}

export function OutputPreviewTable({
  title,
  source,
  rows,
  columns
}: {
  title: string;
  source: string;
  rows: Array<Record<string, Primitive>>;
  columns: ColumnDefinition[];
}) {
  return (
    <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-col gap-1 border-b border-slate-200 bg-slate-50 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm font-semibold text-slate-950">{title}</p>
        <p className="font-mono text-xs text-slate-400">{source}</p>
      </div>
      <div className="max-w-full overflow-x-auto">
        <table className="w-full min-w-[560px] border-collapse text-sm sm:min-w-[620px]">
          <thead className="bg-white text-left text-xs uppercase tracking-[0.12em] text-slate-400">
            <tr>
              {columns.map((column) => (
                <th
                  key={column.key}
                  className={cn("border-b border-slate-200 px-5 py-3 font-medium", column.align === "right" && "text-right")}
                >
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={`${title}-${index}`} className="border-b border-slate-100 last:border-0">
                {columns.map((column) => (
                  <td
                    key={column.key}
                    className={cn("px-5 py-3 text-slate-600", column.align === "right" && "text-right font-mono text-slate-700")}
                  >
                    {column.format
                      ? column.format(row[column.key], row)
                      : formatCell(row[column.key])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function RankingBars({
  title,
  rows,
  labelKey,
  valueKey,
  valueLabel,
  tone = "slate"
}: {
  title: string;
  rows: Array<Record<string, Primitive>>;
  labelKey: string;
  valueKey: string;
  valueLabel: string;
  tone?: "slate" | "amber" | "sky" | "rose";
}) {
  const max = Math.max(...rows.map((row) => Number(row[valueKey]) || 0), 1);

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-sm font-semibold text-slate-950">{title}</p>
      <div className="mt-5 space-y-4">
        {rows.map((row, index) => {
          const value = Number(row[valueKey]) || 0;

          return (
            <div key={`${String(row[labelKey])}-${index}`}>
              <div className="flex min-w-0 items-center justify-between gap-4 text-sm">
                <span className="min-w-0 break-words font-medium text-slate-800">{String(row[labelKey])}</span>
                <span className="shrink-0 font-mono text-xs text-slate-500">{formatNumber(value)} {valueLabel}</span>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
                <div
                  className={cn(
                    "h-full rounded-full",
                    tone === "amber" && "bg-amber-500",
                    tone === "sky" && "bg-sky-500",
                    tone === "rose" && "bg-rose-500",
                    tone === "slate" && "bg-slate-950"
                  )}
                  style={{ width: `${Math.max(4, Math.min(100, (value / max) * 100))}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function MetricComparisonBars({
  title,
  items,
  baselineLabel = "Baseline",
  advancedLabel = "Advanced"
}: {
  title: string;
  items: Array<{ label: string; baseline: number | null; advanced: number | null; lowerIsBetter?: boolean }>;
  baselineLabel?: string;
  advancedLabel?: string;
}) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-sm font-semibold text-slate-950">{title}</p>
      <div className="mt-5 space-y-5">
        {items.map((item) => {
          const baseline = item.baseline ?? 0;
          const advanced = item.advanced ?? 0;
          const max = Math.max(baseline, advanced, 1);
          const change =
            item.baseline && item.advanced
              ? ((item.baseline - item.advanced) / item.baseline) * 100
              : null;

          return (
            <div key={item.label}>
              <div className="flex min-w-0 items-center justify-between gap-3">
                <p className="text-sm font-medium text-slate-800">{item.label}</p>
                {change !== null && item.lowerIsBetter ? (
                  <p className="font-mono text-xs text-emerald-600">{formatNumber(change, 1)}% lower</p>
                ) : null}
              </div>
              <div className="mt-3 grid gap-2">
                <ComparisonBar label={baselineLabel} value={baseline} max={max} className="bg-slate-300" />
                <ComparisonBar label={advancedLabel} value={advanced} max={max} className="bg-slate-950" />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function MiniLineChart({
  title,
  data,
  series
}: {
  title: string;
  data: Array<Record<string, number | null>>;
  series: Array<{ key: string; label: string; color: string }>;
}) {
  const paths = useMemo(() => {
    const values = data.flatMap((point) =>
      series.map((item) => point[item.key]).filter((value): value is number => typeof value === "number")
    );
    const min = Math.min(...values);
    const max = Math.max(...values);
    const span = Math.max(max - min, 1);

    return series.map((item) => {
      const points = data
        .map((point, index) => {
          const value = point[item.key];
          if (typeof value !== "number") {
            return null;
          }

          const x = data.length <= 1 ? 0 : (index / (data.length - 1)) * 100;
          const y = 86 - ((value - min) / span) * 72;
          return `${x.toFixed(2)},${y.toFixed(2)}`;
        })
        .filter(Boolean);

      return {
        ...item,
        points: points.join(" ")
      };
    });
  }, [data, series]);

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <p className="text-sm font-semibold text-slate-950">{title}</p>
        <div className="flex flex-wrap justify-end gap-3">
          {series.map((item) => (
            <span key={item.key} className="flex items-center gap-2 text-xs text-slate-500">
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: item.color }} />
              {item.label}
            </span>
          ))}
        </div>
      </div>
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="mt-4 h-52 w-full overflow-visible">
        <line x1="0" x2="100" y1="86" y2="86" stroke="rgb(226 232 240)" strokeWidth="0.8" />
        <line x1="0" x2="100" y1="14" y2="14" stroke="rgb(241 245 249)" strokeWidth="0.6" />
        {paths.map((path) =>
          path.points ? (
            <polyline
              key={path.key}
              points={path.points}
              fill="none"
              stroke={path.color}
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2.4"
              vectorEffect="non-scaling-stroke"
            />
          ) : null
        )}
      </svg>
    </div>
  );
}

function ComparisonBar({
  label,
  value,
  max,
  className
}: {
  label: string;
  value: number;
  max: number;
  className?: string;
}) {
  return (
    <div className="grid grid-cols-[minmax(4.5rem,auto)_1fr_auto] items-center gap-3 text-xs text-slate-500">
      <span className="min-w-0">{label}</span>
      <div className="h-2 overflow-hidden rounded-full bg-slate-100">
        <div
          className={cn("h-full rounded-full", className)}
          style={{ width: `${Math.max(3, Math.min(100, (value / max) * 100))}%` }}
        />
      </div>
      <span className="text-right font-mono text-slate-600">{formatNumber(value)}</span>
    </div>
  );
}

export function formatNumber(value: Primitive, digits = 0) {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return String(value ?? "N/A");
  }

  return new Intl.NumberFormat("en", {
    maximumFractionDigits: digits,
    minimumFractionDigits: digits > 0 ? Math.min(digits, 2) : 0
  }).format(value);
}

function formatCell(value: Primitive) {
  if (typeof value === "number") {
    return formatNumber(value, Number.isInteger(value) ? 0 : 2);
  }

  return String(value ?? "");
}
