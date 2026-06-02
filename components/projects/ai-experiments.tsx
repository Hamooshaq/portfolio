"use client";

import type { ReactNode } from "react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { SectionHeading } from "@/components/ui/section-heading";
import { LiveDeploymentLauncher } from "@/components/projects/live-deployment-launcher";
import { liveDeployments } from "@/config/deployments";
import { deepfakeApiConfig } from "@/config/deepfake-api";
import { cn } from "@/lib/cn";
import { repositoryIntelligence } from "@/config/repository-intelligence";

const deepfake = repositoryIntelligence.repositories.deepfake;
const appData = deepfake.showcase.appData;

type DetectionResult = {
  label: string;
  probability: number;
  framesUsed: number;
  correctness: string;
  details: Array<{ frame: number; probability: number }>;
  rawDetails: string;
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
  const [error, setError] = useState<string | null>(null);
  const [isRunning, setIsRunning] = useState(false);

  async function runDetection() {
    if (!file) {
      setError("Upload a video first so the Hugging Face Space can run the real detector.");
      return;
    }

    setIsRunning(true);
    setError(null);

    try {
      const result = await predictWithHuggingFace(file, frames, threshold, trueLabel, useCrop, margin);
      setResult(result);
    } catch (caughtError) {
      setError(formatPredictError(caughtError));
    } finally {
      setIsRunning(false);
    }
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
            The portfolio sends the uploaded video to Mohammad&apos;s Hugging Face Space and renders
            the real Gradio `/ui_predict` response here. PyTorch stays out of Vercel.
          </p>

          <div className="mt-5 grid gap-4">
            <label className="rounded-2xl border border-dashed border-white/15 bg-white/[0.04] p-4">
              <span className="text-sm font-medium">Upload video</span>
              <input
                type="file"
                accept="video/*,.mp4,.mov,.avi,.mkv"
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
              disabled={!file || isRunning}
              className="min-h-11 rounded-full bg-white px-5 py-3 text-sm font-semibold text-slate-950 transition disabled:cursor-not-allowed disabled:bg-white/20 disabled:text-white/45"
            >
              {isRunning ? "Running on Hugging Face..." : "Run detection"}
            </button>
            {error ? (
              <p className="rounded-2xl border border-red-400/20 bg-red-400/10 p-4 text-sm leading-6 text-red-100">
                {error}
              </p>
            ) : null}
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
            {result.details.length > 0 ? (
              result.details.slice(0, 12).map((item) => (
                <div key={item.frame} className="rounded-xl bg-slate-50 px-3 py-2 font-mono text-xs text-slate-600">
                  frame {item.frame}: p(fake)={item.probability.toFixed(4)}
                </div>
              ))
            ) : (
              <pre className="col-span-full max-h-72 overflow-auto whitespace-pre-wrap rounded-xl bg-slate-50 p-4 font-mono text-xs leading-6 text-slate-600">
                {result.rawDetails}
              </pre>
            )}
          </div>
        </div>
      ) : (
        <p className="mt-4 text-sm leading-7 text-slate-600">
          Upload a short video and run the detector. The output comes from the live Hugging Face
          Space, not a browser-side approximation.
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

async function predictWithHuggingFace(
  file: File | null,
  frames: number,
  threshold: number,
  trueLabel: string,
  useCrop: boolean,
  margin: number
): Promise<DetectionResult> {
  if (!file) {
    throw new Error("No video selected.");
  }

  const { Client } = await import("@gradio/client");
  const client = await Client.connect(deepfakeApiConfig.spaceId);
  const response = await client.predict(deepfakeApiConfig.apiName, {
    video_file: file,
    true_label: trueLabel,
    use_crop: useCrop,
    frame_count: frames,
    threshold,
    margin
  });

  return parseHuggingFaceResult(response.data, file.name);
}

function parseHuggingFaceResult(data: unknown, filename: string): DetectionResult {
  if (!Array.isArray(data)) {
    throw new Error("Unexpected Hugging Face response shape.");
  }

  const [labelValue, probabilityValue, framesValue, correctnessValue, detailsValue] = data;
  const probability = Number(probabilityValue);
  const rawDetails = String(detailsValue ?? "");

  return {
    label: String(labelValue ?? "UNKNOWN"),
    probability: Number.isFinite(probability) ? probability : 0,
    framesUsed: Number(framesValue) || 0,
    correctness: String(correctnessValue ?? "N/A"),
    details: parseFrameDetails(rawDetails),
    rawDetails,
    source: `${filename} analyzed by ${deepfakeApiConfig.spaceId}${deepfakeApiConfig.apiName}`
  };
}

function parseFrameDetails(details: string) {
  return details
    .split("\n")
    .map((line) => {
      const match = line.match(/frame\s+(\d+):\s+p\(fake\)=([0-9.]+)/i);
      if (!match) {
        return null;
      }

      return {
        frame: Number(match[1]),
        probability: Number(match[2])
      };
    })
    .filter((item): item is { frame: number; probability: number } => Boolean(item));
}

function formatPredictError(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return "The Hugging Face Space could not return a prediction. It may be waking up; try again in a moment.";
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
