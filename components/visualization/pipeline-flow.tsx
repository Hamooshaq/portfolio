"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/cn";

interface PipelineStep {
  label: string;
  detail: string;
}

export function PipelineFlow({ steps }: { steps: readonly PipelineStep[] }) {
  const [active, setActive] = useState(1);

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="grid gap-3 md:grid-cols-5">
        {steps.map((step, index) => (
          <button
            key={step.label}
            type="button"
            onClick={() => setActive(index)}
            className={cn(
              "group relative rounded-2xl border p-4 text-left transition-colors",
              active === index
                ? "border-slate-950 bg-slate-950 text-white"
                : "border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-300"
            )}
          >
            <span className="font-mono text-xs text-current/60">0{index + 1}</span>
            <span className="mt-3 block text-sm font-semibold">{step.label}</span>
            {index < steps.length - 1 ? (
              <ArrowRight
                aria-hidden
                className="absolute -right-4 top-1/2 z-10 hidden h-4 w-4 -translate-y-1/2 text-slate-300 md:block"
              />
            ) : null}
          </button>
        ))}
      </div>

      <motion.div
        key={active}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-5"
      >
        <p className="text-sm font-semibold text-slate-950">{steps[active].label}</p>
        <p className="mt-2 text-sm leading-7 text-slate-600">{steps[active].detail}</p>
      </motion.div>
    </div>
  );
}
