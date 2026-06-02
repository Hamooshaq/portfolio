"use client";

import { useState } from "react";
import { cn } from "@/lib/cn";

const tracks = {
  baseline: {
    title: "CSRNet baseline",
    details: ["Fair reproduction", "Dilated backend", "Density map output", "Reference metrics"]
  },
  advanced: {
    title: "AdvancedCSRNet",
    details: [
      "Multi-scale context",
      "Channel/spatial attention",
      "Count-consistency support",
      "Dense-scene focus"
    ]
  }
};

export function CrowdModelComparison() {
  const [mode, setMode] = useState<"baseline" | "advanced">("advanced");
  const active = tracks[mode];

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex rounded-full bg-slate-100 p-1">
        {(["baseline", "advanced"] as const).map((track) => (
          <button
            key={track}
            type="button"
            onClick={() => setMode(track)}
            className={cn(
              "flex-1 rounded-full px-3 py-2 text-sm font-medium transition-colors sm:px-4",
              mode === track ? "bg-white text-slate-950 shadow-sm" : "text-slate-500"
            )}
          >
            {tracks[track].title}
          </button>
        ))}
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-[0.9fr_1.1fr]">
        <div className="rounded-2xl border border-slate-200 bg-slate-950 p-4 text-white">
          <p className="font-mono text-xs uppercase tracking-[0.16em] text-white/45">architecture</p>
          <div className="mt-5 space-y-3">
            {active.details.map((detail, index) => (
              <div key={detail} className="flex items-center gap-3">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/10 font-mono text-xs">
                  {index + 1}
                </span>
                <span className="text-sm">{detail}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="relative min-h-56 overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <div className="grid h-full grid-cols-8 gap-1">
            {Array.from({ length: 96 }).map((_, index) => {
              const hot =
                mode === "advanced"
                  ? Math.sin(index * 1.7) + Math.cos(index * 0.3)
                  : Math.sin(index * 0.7);
              const alpha = Math.round((0.08 + Math.max(0, hot) * 0.22) * 1000) / 1000;

              return (
                <span
                  key={index}
                  className="rounded-sm"
                  style={{
                    backgroundColor: `rgba(15, 23, 42, ${alpha})`
                  }}
                />
              );
            })}
          </div>
          <p className="absolute bottom-4 left-4 right-4 max-w-[calc(100%-2rem)] rounded-full bg-white px-3 py-1 text-xs font-medium text-slate-600 shadow-sm">
            density-map visualization, not a reported metric
          </p>
        </div>
      </div>
    </div>
  );
}
