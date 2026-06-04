"use client";

/* eslint-disable @next/next/no-img-element */
import Image from "next/image";
import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { SectionHeading } from "@/components/ui/section-heading";
import { LiveDeploymentLauncher } from "@/components/projects/live-deployment-launcher";
import { crowdApiConfig } from "@/config/crowd-api";
import { liveDeployments } from "@/config/deployments";
import { cn } from "@/lib/cn";
import { repositoryIntelligence } from "@/config/repository-intelligence";

const crowd = repositoryIntelligence.repositories.crowdDetection;
const samples = crowd.showcase.samples;

type UploadResult = {
  overlayUrl: string;
  heatmapUrl: string;
  peaksUrl: string;
  advancedCount: number | null;
  baselineCount: number | null;
  imageSize: string | null;
  predictionMarkdown: string;
  metricsMarkdown: string;
  source: string;
};

export function CrowdDetectionCaseStudy() {
  const [sampleId, setSampleId] = useState(samples[0]?.imageId ?? "");
  const [mode, setMode] = useState<"sample" | "upload">("sample");
  const [file, setFile] = useState<File | null>(null);
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);
  const [alpha, setAlpha] = useState(42);
  const [showBaseline, setShowBaseline] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const sample = useMemo(() => samples.find((item) => item.imageId === sampleId) ?? samples[0], [sampleId]);

  async function runUploadPrediction() {
    if (!file) {
      setError("Upload an image first so the Hugging Face Space can run the real crowd counter.");
      return;
    }

    setIsRunning(true);
    setError(null);

    try {
      const result = await predictWithHuggingFace(file, showBaseline, alpha / 100);
      setUploadResult(result);
      setMode("upload");
    } catch (caughtError) {
      setError(formatPredictError(caughtError));
    } finally {
      setIsRunning(false);
    }
  }

  return (
    <div className="rounded-[2rem] border border-slate-200 bg-white p-4 shadow-sm sm:p-6 lg:p-8">
      <div className="grid gap-8 lg:grid-cols-[0.8fr_1.2fr]">
        <div className="min-w-0">
          <SectionHeading eyebrow="Interactive crowd counter" title={crowd.title}>
            <p>
              This section exposes the notebook inference behavior: choose a real evaluation image
              or upload your own, inspect the heatmap, and compare baseline against the advanced
              counter.
            </p>
          </SectionHeading>
          <div className="mt-6 flex flex-wrap gap-2">
            {crowd.stack.map((item) => (
              <Badge key={item}>{item}</Badge>
            ))}
          </div>
          <LiveDeploymentLauncher deployment={liveDeployments.crowd} />
        </div>

        <div className="rounded-3xl border border-slate-200 bg-slate-950 p-5 text-white">
          <p className="text-sm font-semibold">Image upload inference surface</p>
          <p className="mt-2 text-sm leading-6 text-white/55">
            Repository samples use evaluation outputs. Uploaded images are sent to Mohammad&apos;s
            Hugging Face Space and rendered from the real Gradio `/run_prediction` response.
          </p>
          <div className="mt-5 grid gap-4 sm:grid-cols-[1fr_0.8fr]">
            <label className="rounded-2xl border border-dashed border-white/15 bg-white/[0.04] p-4">
              <span className="text-sm font-medium">Upload crowd image</span>
              <input
                type="file"
                accept="image/*"
                onChange={(event) => {
                  setFile(event.target.files?.[0] ?? null);
                  setError(null);
                }}
                className="mt-3 block w-full text-xs text-white/60 file:mr-3 file:rounded-full file:border-0 file:bg-white file:px-3 file:py-2 file:text-xs file:font-semibold file:text-slate-950"
              />
              {file ? <span className="mt-2 block break-words text-xs text-white/45">{file.name}</span> : null}
            </label>
            <label className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-sm">
              Overlay intensity: {alpha}%
              <input
                type="range"
                min={10}
                max={90}
                value={alpha}
                onChange={(event) => setAlpha(Number(event.target.value))}
                className="mt-3 w-full accent-emerald-300"
              />
            </label>
          </div>
          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
            <button
              type="button"
              onClick={() => void runUploadPrediction()}
              disabled={!file || isRunning}
              className="min-h-11 rounded-full bg-white px-5 py-3 text-sm font-semibold text-slate-950 transition disabled:cursor-not-allowed disabled:bg-white/20 disabled:text-white/45"
            >
              {isRunning ? "Running on Hugging Face..." : "Estimate crowd"}
            </button>
            <button
              type="button"
              onClick={() => setShowBaseline((current) => !current)}
              className={cn(
                "min-h-11 rounded-full border px-5 py-3 text-sm font-semibold transition",
                showBaseline
                  ? "border-emerald-300 bg-emerald-300 text-slate-950"
                  : "border-white/15 bg-white/[0.04] text-white/70"
              )}
            >
              CSRNet baseline {showBaseline ? "on" : "off"}
            </button>
          </div>
          {error ? (
            <p className="mt-4 rounded-2xl border border-red-400/20 bg-red-400/10 p-4 text-sm leading-6 text-red-100">
              {error}
            </p>
          ) : null}
        </div>
      </div>

      <div className="mt-8 flex max-w-full gap-2 overflow-x-auto rounded-full border border-slate-200 bg-slate-50 p-1">
        <button
          type="button"
          onClick={() => setMode("sample")}
          className={cn("rounded-full px-4 py-2 text-sm font-medium", mode === "sample" ? "bg-slate-950 text-white" : "text-slate-500")}
        >
          Evaluation samples
        </button>
        <button
          type="button"
          onClick={() => setMode("upload")}
          className={cn("rounded-full px-4 py-2 text-sm font-medium", mode === "upload" ? "bg-slate-950 text-white" : "text-slate-500")}
        >
          Uploaded image
        </button>
      </div>

      {mode === "sample" && sample ? (
        <SampleWorkbench sample={sample} sampleId={sampleId} setSampleId={setSampleId} alpha={alpha} />
      ) : (
        <UploadWorkbench result={uploadResult} />
      )}
    </div>
  );
}

function SampleWorkbench({
  sample,
  sampleId,
  setSampleId,
  alpha
}: {
  sample: (typeof samples)[number];
  sampleId: string;
  setSampleId: (value: string) => void;
  alpha: number;
}) {
  return (
    <div className="mt-6 grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
      <div className="rounded-3xl border border-slate-200 bg-slate-950 p-4 text-white">
        <div className="relative overflow-hidden rounded-2xl bg-black">
          {sample.image ? (
            <Image src={sample.image.src} alt={sample.image.alt} width={1200} height={675} className="w-full object-cover" />
          ) : null}
          {sample.density ? (
            <Image
              src={sample.density.src}
              alt={sample.density.alt}
              width={1200}
              height={675}
              unoptimized
              className="absolute inset-0 h-full w-full object-cover mix-blend-screen"
              style={{ opacity: alpha / 100 }}
            />
          ) : null}
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-4">
          <DarkStat label="Ground truth" value={sample.groundTruth} />
          <DarkStat label="Baseline" value={sample.baselinePrediction} />
          <DarkStat label="Advanced" value={sample.advancedPrediction} />
          <DarkStat label="Error drop" value={sample.improvement} />
        </div>
      </div>

      <div className="space-y-5">
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-semibold text-slate-950">Evaluation sample selector</p>
          <select
            value={sampleId}
            onChange={(event) => setSampleId(event.target.value)}
            className="mt-4 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm"
          >
            {samples.map((item) => (
              <option key={item.imageId}>{item.imageId}</option>
            ))}
          </select>
        </div>
        <ComparisonPanel
          baseline={sample.baselinePrediction ?? 0}
          advanced={sample.advancedPrediction ?? 0}
          groundTruth={sample.groundTruth ?? 0}
        />
      </div>
    </div>
  );
}

function UploadWorkbench({ result }: { result: UploadResult | null }) {
  if (!result) {
    return (
      <div className="mt-6 rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-8 text-sm leading-7 text-slate-600">
        Upload an image and run the estimator. The uploaded result will come from the live Hugging
        Face Space, including density overlay, heatmap, peak proposals, and model context.
      </div>
    );
  }

  return (
    <div className="mt-6 grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
      <div className="rounded-3xl border border-slate-200 bg-slate-950 p-4">
        <div className="grid gap-3">
          <figure className="overflow-hidden rounded-2xl bg-black">
            <img src={result.overlayUrl} alt="Crowd density overlay from Hugging Face Space" className="w-full object-cover" />
          </figure>
          <div className="grid gap-3 sm:grid-cols-2">
            <figure className="overflow-hidden rounded-2xl bg-black">
              <img src={result.heatmapUrl} alt="Crowd density heatmap from Hugging Face Space" className="w-full object-cover" />
            </figure>
            <figure className="overflow-hidden rounded-2xl bg-black">
              <img src={result.peaksUrl} alt="Crowd peak proposals from Hugging Face Space" className="w-full object-cover" />
            </figure>
          </div>
        </div>
      </div>
      <div className="space-y-5">
        <ComparisonPanel
          baseline={result.baselineCount ?? 0}
          advanced={result.advancedCount ?? 0}
          groundTruth={result.advancedCount ?? 0}
        />
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-semibold text-slate-950">Live Space response</p>
          <p className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-slate-950 sm:text-4xl">
            {result.advancedCount !== null ? format(result.advancedCount) : "N/A"}
          </p>
          <p className="mt-2 text-sm text-slate-500">
            AdvancedCSRNet estimate from {result.source}
            {result.imageSize ? ` · image size ${result.imageSize}` : ""}.
          </p>
          <pre className="mt-4 max-h-64 overflow-auto whitespace-pre-wrap rounded-2xl bg-slate-50 p-4 text-xs leading-6 text-slate-600">
            {result.predictionMarkdown}
          </pre>
          <pre className="mt-3 max-h-64 overflow-auto whitespace-pre-wrap rounded-2xl bg-slate-50 p-4 text-xs leading-6 text-slate-600">
            {result.metricsMarkdown}
          </pre>
        </div>
      </div>
    </div>
  );
}

function ComparisonPanel({
  baseline,
  advanced,
  groundTruth
}: {
  baseline: number;
  advanced: number;
  groundTruth: number;
}) {
  const max = Math.max(baseline, advanced, groundTruth, 1);

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-sm font-semibold text-slate-950">Baseline vs advanced</p>
      <div className="mt-5 space-y-4">
        <Bar label="Ground truth / target" value={groundTruth} max={max} />
        <Bar label="CSRNet baseline" value={baseline} max={max} tone="muted" />
        <Bar label="AdvancedCSRNet" value={advanced} max={max} tone="strong" />
      </div>
    </div>
  );
}

async function predictWithHuggingFace(file: File, showBaseline: boolean, overlayAlpha: number): Promise<UploadResult> {
  const { Client } = await import("@gradio/client");
  const client = await Client.connect(crowdApiConfig.spaceId);
  const response = await client.predict(crowdApiConfig.apiName, {
    image: file,
    show_baseline: showBaseline,
    overlay_alpha: overlayAlpha
  });

  return parseHuggingFaceResult(response.data, file.name);
}

type GradioFileData = {
  url?: string;
  path?: string;
};

function parseHuggingFaceResult(data: unknown, filename: string): UploadResult {
  if (!Array.isArray(data)) {
    throw new Error("Unexpected Hugging Face response shape.");
  }

  const [overlay, heatmap, peaks, predictionValue, metricsValue] = data;
  const predictionMarkdown = String(predictionValue ?? "");
  const metricsMarkdown = String(metricsValue ?? "");

  return {
    overlayUrl: fileDataUrl(overlay),
    heatmapUrl: fileDataUrl(heatmap),
    peaksUrl: fileDataUrl(peaks),
    advancedCount: parseCount(predictionMarkdown, /AdvancedCSRNet estimate:\s+\*\*([0-9.]+)/i),
    baselineCount: parseCount(predictionMarkdown, /CSRNet baseline estimate:\s+([0-9.]+)/i),
    imageSize: parseImageSize(predictionMarkdown),
    predictionMarkdown,
    metricsMarkdown,
    source: `${filename} analyzed by ${crowdApiConfig.spaceId}${crowdApiConfig.apiName}`
  };
}

function fileDataUrl(value: unknown) {
  if (!value || typeof value !== "object") {
    throw new Error("Hugging Face response did not include an output image URL.");
  }

  const fileData = value as GradioFileData;
  if (!fileData.url) {
    throw new Error("Hugging Face response image is missing a public URL.");
  }

  return fileData.url;
}

function parseCount(markdown: string, pattern: RegExp) {
  const match = markdown.match(pattern);
  if (!match) {
    return null;
  }

  const value = Number(match[1]);
  return Number.isFinite(value) ? value : null;
}

function parseImageSize(markdown: string) {
  const match = markdown.match(/Image size:\s+`([^`]+)`/i);
  return match?.[1] ?? null;
}

function formatPredictError(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return "The Hugging Face Space could not return a prediction. It may be waking up; try again in a moment.";
}

function DarkStat({ label, value }: { label: string; value: number | null }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
      <p className="text-xs uppercase tracking-[0.14em] text-white/40">{label}</p>
      <p className="mt-2 font-mono text-xl font-semibold text-white">{format(value)}</p>
    </div>
  );
}

function Bar({ label, value, max, tone }: { label: string; value: number; max: number; tone?: "muted" | "strong" }) {
  return (
    <div>
      <div className="flex min-w-0 justify-between gap-3 text-sm">
        <span className="text-slate-600">{label}</span>
        <span className="shrink-0 font-mono text-slate-500">{format(value)}</span>
      </div>
      <div className="mt-2 h-3 overflow-hidden rounded-full bg-slate-100">
        <div
          className={cn("h-full rounded-full bg-emerald-500", tone === "muted" && "bg-slate-300", tone === "strong" && "bg-slate-950")}
          style={{ width: `${Math.max(3, Math.min(100, (value / max) * 100))}%` }}
        />
      </div>
    </div>
  );
}

function format(value: number | null | undefined) {
  return new Intl.NumberFormat("en", { maximumFractionDigits: 1 }).format(Number(value) || 0);
}
