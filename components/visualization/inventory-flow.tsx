"use client";

import { useState } from "react";
import { Minus, Plus } from "lucide-react";

export function InventoryFlow() {
  const [leadTimeDemand, setLeadTimeDemand] = useState(42);
  const [reorderLevel, setReorderLevel] = useState(30);
  const [currentStock, setCurrentStock] = useState(55);
  const recommended = Math.max(leadTimeDemand + reorderLevel - currentStock, 0);
  const status = currentStock <= reorderLevel ? "critical" : currentStock < leadTimeDemand + reorderLevel ? "warning" : "healthy";

  const controls = [
    { label: "Lead-time demand", value: leadTimeDemand, set: setLeadTimeDemand },
    { label: "Reorder level", value: reorderLevel, set: setReorderLevel },
    { label: "Current stock", value: currentStock, set: setCurrentStock }
  ];

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col justify-between gap-4 sm:flex-row">
        <div>
          <p className="text-sm font-semibold text-slate-950">Reorder calculation</p>
          <p className="mt-2 max-w-xl text-sm leading-7 text-slate-600">
            recommended_reorder_qty = max(lead_time_demand + reorder_level - current_stock, 0)
          </p>
        </div>
        <div className="rounded-2xl bg-slate-950 px-5 py-4 text-white">
          <p className="text-xs uppercase tracking-[0.14em] text-white/50">recommendation</p>
          <p className="mt-2 text-3xl font-semibold">{recommended}</p>
        </div>
      </div>

      <div className="mt-6 grid gap-3 md:grid-cols-3">
        {controls.map((control) => (
          <div key={control.label} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-sm text-slate-500">{control.label}</p>
            <div className="mt-3 flex items-center justify-between">
              <button
                type="button"
                className="rounded-full border border-slate-200 bg-white p-2"
                onClick={() => control.set(Math.max(0, control.value - 5))}
                aria-label={`Decrease ${control.label}`}
              >
                <Minus className="h-4 w-4" />
              </button>
              <span className="text-2xl font-semibold text-slate-950">{control.value}</span>
              <button
                type="button"
                className="rounded-full border border-slate-200 bg-white p-2"
                onClick={() => control.set(control.value + 5)}
                aria-label={`Increase ${control.label}`}
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-5 h-3 overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-full rounded-full bg-emerald-500 transition-all"
          style={{ width: `${Math.min(100, (currentStock / Math.max(leadTimeDemand + reorderLevel, 1)) * 100)}%` }}
        />
      </div>
      <p className="mt-3 text-sm text-slate-600">
        Stock status: <span className="font-semibold text-slate-950">{status}</span>
      </p>
    </div>
  );
}
