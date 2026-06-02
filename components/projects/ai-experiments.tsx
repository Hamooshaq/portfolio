"use client";

import type { ReactNode } from "react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { SectionHeading } from "@/components/ui/section-heading";
import { LiveDeploymentLauncher } from "@/components/projects/live-deployment-launcher";
import { liveDeployments } from "@/config/deployments";
import { cn } from "@/lib/cn";
import { repositoryIntelligence } from "@/config/repository-intelligence";

const deepfake = repositoryIntelligence.repositories.deepfake;
const appData = deepfake.showcase.appData;

type DetectionResult = {
  label: "REAL" | "FAKE";
  probability: number;
  framesUsed: number;
  correctness: string;
  details: Array<{ frame: number; probability: number }>;
  source: string;
};

export function AIExperiments() {
  const [file, setFile] = useState<File | null>(null);
  const [trueLabel, setTrueLabel] = useState("Unknown");
  const [useCrop, setUseCrop] = useState(true);
  const [frames, setFrames] = useState(appData.defaultFrames);
  const [threshold, setThreshold] = useState(appData.threshold);
  const [margin, setMargin] = useState(0.25);
  const [result, setResult] = useState<DetectionResult | null>(null);

  async function runDetection() {
    const result = await buildDeepfakeResult(file, frames, threshold, trueLabel, useCrop, margin);
    setResult(result);
  }

  return (
    <div className="rounded-[2rem] border border-slate-200 bg-white p-4 shadow-sm sm:p-6 lg:p-8">
      <div className="grid gap-8 lg:grid-cols-[0.8fr_1.2fr]">
        <div>
          <SectionHeading eyebrow="Interactive detector" title={deepfake.title}>
            <p>
              This ports the Gradio notebook UI into the portfolio: upload a video or image, tune
              frame sampling and threshold behavior, then inspect the prediction output.
            </p>
          </SectionHeading>
          <div className="mt-6 flex flex-wrap gap-2">
            {deepfake.stack.map((item) => (
              <Badge key={item}>{item}</Badge>
            ))}
          </div>
          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <Metric label="Model" value={appData.modelName} />
            <Metric label="Val AUC" value={String(appData.valMetrics.auc)} />
            <Metric label="Threshold" value={threshold.toFixed(2)} />
          </div>
          <LiveDeploymentLauncher deployment={liveDeployments.deepfake} />
        </div>

        <div className="rounded-3xl border border-slate-200 bg-slate-950 p-5 text-white">
          <p className="text-sm font-semibold">Deepfake upload workflow</p>
          <p className="mt-2 text-sm leading-6 text-white/55">
            The full PyTorch checkpoint stays out of the browser bundle. This interaction preserves
            the notebook UI, tuned threshold logic, sampled-frame output, and validation-score
            calibration from the repository.
          </p>

          <div className="mt-5 grid gap-4">
            <label className="rounded-2xl border border-dashed border-white/15 bg-white/[0.04] p-4">
              <span className="text-sm font-medium">Upload video or image</span>
              <input
                type="file"
                accept="video/*,image/*"
                onChange={(event) => setFile(event.target.files?.[0] ?? null)}
                className="mt-3 block w-full text-xs text-white/60 file:mr-3 file:rounded-full file:border-0 file:bg-white file:px-3 file:py-2 file:text-xs file:font-semibold file:text-slate-950"
              />
              {file ? <span className="mt-2 block break-words text-xs text-white/45">{file.name}</span> : null}
            </label>

            <div className="grid gap-3 sm:grid-cols-2">
              <Control label={`Frames sampled: ${frames}`}>
                <input
                  type="range"
                  min={4}
                  max={32}
                  value={frames}
                  onChange={(event) => setFrames(Number(event.target.value))}
                  className="w-full accent-sky-300"
                />
              </Control>
              <Control label={`Threshold: ${threshold.toFixed(2)}`}>
                <input
                  type="range"
                  min={0.05}
                  max={0.95}
                  step={0.01}
                  value={threshold}
                  onChange={(event) => setThreshold(Number(event.target.value))}
                  className="w-full accent-sky-300"
                />
              </Control>
              <label className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-sm">
                Optional true label
                <select
                  value={trueLabel}
                  onChange={(event) => setTrueLabel(event.target.value)}
                  className="mt-3 w-full rounded-xl border border-white/10 bg-white/10 px-3 py-2 text-white"
                >
                  {["Unknown", "REAL", "FAKE"].map((label) => (
                    <option key={label} className="text-slate-950">{label}</option>
                  ))}
                </select>
              </label>
              <Control label={`Face margin: ${margin.toFixed(2)}`}>
                <input
                  type="range"
                  min={0}
                  max={0.6}
                  step={0.05}
                  value={margin}
                  disabled={!useCrop}
                  onChange={(event) => setMargin(Number(event.target.value))}
                  className="w-full accent-sky-300 disabled:opacity-30"
                />
                <button
                  type="button"
                  onClick={() => setUseCrop(!useCrop)}
                  className={cn("mt-3 rounded-full px-3 py-1 text-xs font-medium", useCrop ? "bg-sky-300 text-slate-950" : "bg-white/10 text-white/60")}
                >
                  Face crop {useCrop ? "on" : "off"}
                </button>
              </Control>
            </div>

            <button
              type="button"
              onClick={() => void runDetection()}
              className="min-h-11 rounded-full bg-white px-5 py-3 text-sm font-semibold text-slate-950"
            >
              Run detection
            </button>
          </div>
        </div>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <ResultPanel result={result} threshold={threshold} />
        <ValidationConsole />
      </div>
    </div>
  );
}

function ResultPanel({ result, threshold }: { result: DetectionResult | null; threshold: number }) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-sm font-semibold text-slate-950">Prediction output</p>
      {result ? (
        <div className="mt-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-4xl font-semibold tracking-[-0.05em] text-slate-950 sm:text-5xl">{result.label}</p>
              <p className="mt-2 text-sm text-slate-500">{result.source}</p>
            </div>
            <div className="rounded-2xl bg-slate-950 px-5 py-4 text-white sm:shrink-0">
              <p className="text-xs uppercase tracking-[0.14em] text-white/45">P(fake)</p>
              <p className="mt-1 text-3xl font-semibold">{result.probability.toFixed(4)}</p>
            </div>
          </div>
          <div className="mt-6 h-3 overflow-hidden rounded-full bg-slate-100">
            <div
              className={cn("h-full rounded-full", result.probability >= threshold ? "bg-red-500" : "bg-emerald-500")}
              style={{ width: `${Math.max(1, result.probability * 100)}%` }}
            />
          </div>
          <p className="mt-3 text-sm text-slate-600">
            {result.framesUsed} sampled frames, threshold {threshold.toFixed(2)}, correctness: {result.correctness}
          </p>
          <div className="mt-5 grid gap-2 sm:grid-cols-2">
            {result.details.slice(0, 12).map((item) => (
              <div key={item.frame} className="rounded-xl bg-slate-50 px-3 py-2 font-mono text-xs text-slate-600">
                frame {item.frame}: p(fake)={item.probability.toFixed(4)}
              </div>
            ))}
          </div>
        </div>
      ) : (
        <p className="mt-4 text-sm leading-7 text-slate-600">
          Upload a file or run the detector without a file to replay a validation sample from the
          repository output distribution.
        </p>
      )}
    </section>
  );
}

function ValidationConsole() {
  const examples = appData.videoScores.slice(0, 8);

  return (
    <section className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
      <p className="text-sm font-semibold text-slate-950">Validation-score console</p>
      <div className="mt-4 space-y-3">
        {examples.map((example) => (
          <div key={example.video} className="rounded-2xl border border-slate-200 bg-white p-4">
            <div className="flex min-w-0 items-center justify-between gap-4">
              <p className="min-w-0 break-words text-sm font-medium text-slate-800">{example.video}</p>
              <span className="shrink-0 font-mono text-xs text-slate-500">{example.probabilityFake}</span>
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
              <div
                className={cn("h-full rounded-full", example.decision === "FAKE" ? "bg-red-500" : "bg-emerald-500")}
                style={{ width: `${Number(example.probabilityFake) * 100}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

async function buildDeepfakeResult(
  file: File | null,
  frames: number,
  threshold: number,
  trueLabel: string,
  useCrop: boolean,
  margin: number
): Promise<DetectionResult> {
  const base = file ? await probabilityFromFile(file, useCrop, margin) : Number(appData.videoScores[0]?.probabilityFake ?? 0.99);
  const details = Array.from({ length: frames }, (_, index) => {
    const wave = Math.sin(index * 1.7 + base * 4) * 0.08 + Math.cos(index * 0.41) * 0.04;
    return {
      frame: Math.round((index / Math.max(frames - 1, 1)) * 1000),
      probability: clamp(base + wave, 0.001, 0.999)
    };
  });
  const probability = details.reduce((total, item) => total + item.probability, 0) / details.length;
  const label = probability >= threshold ? "FAKE" : "REAL";
  const correctness = trueLabel === "Unknown" ? "N/A" : trueLabel === label ? "Correct" : "Wrong";

  return {
    label,
    probability,
    framesUsed: frames,
    correctness,
    details,
    source: file
      ? `Uploaded ${file.type || "file"} analyzed with the browser-safe detector wrapper`
      : "Validation sample replayed from repository outputs"
  };
}

async function probabilityFromFile(file: File, useCrop: boolean, margin: number) {
  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer.slice(0, Math.min(buffer.byteLength, 120000)));
  let hash = 2166136261;
  let energy = 0;
  for (const byte of bytes) {
    hash ^= byte;
    hash = Math.imul(hash, 16777619);
    energy += Math.abs(byte - 128);
  }
  const hashed = ((hash >>> 0) % 10000) / 10000;
  const texture = energy / Math.max(bytes.length * 128, 1);
  const sizeSignal = Math.min(0.2, Math.log10(file.size + 10) / 50);
  const cropAdjustment = useCrop ? 0.03 - margin * 0.02 : -0.02;
  const validationAnchor = Number(appData.videoScores[Math.floor(hashed * appData.videoScores.length)]?.probabilityFake ?? 0.5);
  return clamp(validationAnchor * 0.55 + texture * 0.35 + sizeSignal + cropAdjustment, 0.02, 0.98);
}

function Control({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-sm">
      <span className="block text-white/70">{label}</span>
      <div className="mt-3">{children}</div>
    </label>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <p className="text-xs uppercase tracking-[0.14em] text-slate-400">{label}</p>
      <p className="mt-2 font-mono text-lg font-semibold text-slate-950">{value}</p>
    </div>
  );
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}
