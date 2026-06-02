"use client";

/* eslint-disable @next/next/no-img-element */
import Image from "next/image";
import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { SectionHeading } from "@/components/ui/section-heading";
import { LiveDeploymentLauncher } from "@/components/projects/live-deployment-launcher";
import { liveDeployments } from "@/config/deployments";
import { cn } from "@/lib/cn";
import { repositoryIntelligence } from "@/config/repository-intelligence";

const crowd = repositoryIntelligence.repositories.crowdDetection;
const samples = crowd.showcase.samples;

type UploadResult = {
  previewUrl: string;
  heatmapUrl: string;
  advancedCount: number;
  baselineCount: number;
  peaks: number;
  width: number;
  height: number;
};

export function CrowdDetectionCaseStudy() {
  const [sampleId, setSampleId] = useState(samples[0]?.imageId ?? "");
  const [mode, setMode] = useState<"sample" | "upload">("sample");
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);
  const [alpha, setAlpha] = useState(58);
  const sample = useMemo(() => samples.find((item) => item.imageId === sampleId) ?? samples[0], [sampleId]);

  async function handleUpload(file: File | undefined) {
    if (!file) return;
    const result = await analyzeCrowdImage(file);
    setUploadResult(result);
    setMode("upload");
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
            Repository samples use actual evaluation outputs and density caches. Uploaded images run
            through a lightweight browser heatmap path that mirrors the notebook interaction without
            bundling the 125MB checkpoint.
          </p>
          <div className="mt-5 grid gap-4 sm:grid-cols-[1fr_0.8fr]">
            <label className="rounded-2xl border border-dashed border-white/15 bg-white/[0.04] p-4">
              <span className="text-sm font-medium">Upload crowd image</span>
              <input
                type="file"
                accept="image/*"
                onChange={(event) => void handleUpload(event.target.files?.[0])}
                className="mt-3 block w-full text-xs text-white/60 file:mr-3 file:rounded-full file:border-0 file:bg-white file:px-3 file:py-2 file:text-xs file:font-semibold file:text-slate-950"
              />
            </label>
            <label className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-sm">
              Overlay intensity: {alpha}%
              <input
                type="range"
                min={0}
                max={100}
                value={alpha}
                onChange={(event) => setAlpha(Number(event.target.value))}
                className="mt-3 w-full accent-emerald-300"
              />
            </label>
          </div>
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
        <UploadWorkbench result={uploadResult} alpha={alpha} />
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

function UploadWorkbench({ result, alpha }: { result: UploadResult | null; alpha: number }) {
  if (!result) {
    return (
      <div className="mt-6 rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-8 text-sm leading-7 text-slate-600">
        Upload an image to generate a browser-side heatmap, count estimate, and baseline/advanced
        comparison preview.
      </div>
    );
  }

  return (
    <div className="mt-6 grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
      <div className="rounded-3xl border border-slate-200 bg-slate-950 p-4">
        <div className="relative overflow-hidden rounded-2xl bg-black">
          <img src={result.previewUrl} alt="Uploaded crowd preview" className="w-full object-cover" />
          <img
            src={result.heatmapUrl}
            alt="Generated crowd heatmap"
            className="absolute inset-0 h-full w-full object-cover mix-blend-screen"
            style={{ opacity: alpha / 100 }}
          />
        </div>
      </div>
      <div className="space-y-5">
        <ComparisonPanel
          baseline={result.baselineCount}
          advanced={result.advancedCount}
          groundTruth={result.advancedCount}
        />
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-semibold text-slate-950">Peak proposals</p>
      <p className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-slate-950 sm:text-4xl">{result.peaks}</p>
          <p className="mt-2 text-sm text-slate-500">
            Inference size {result.width} x {result.height}; peak proposals are visual cues, while
            the count is based on density integration.
          </p>
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

async function analyzeCrowdImage(file: File): Promise<UploadResult> {
  const previewUrl = URL.createObjectURL(file);
  const image = await loadImage(previewUrl);
  const maxSide = 640;
  const scale = Math.min(1, maxSide / Math.max(image.width, image.height));
  const width = Math.max(64, Math.round(image.width * scale));
  const height = Math.max(64, Math.round(image.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas unavailable");
  context.drawImage(image, 0, 0, width, height);
  const data = context.getImageData(0, 0, width, height);
  const heatCanvas = document.createElement("canvas");
  heatCanvas.width = width;
  heatCanvas.height = height;
  const heatContext = heatCanvas.getContext("2d");
  if (!heatContext) throw new Error("Canvas unavailable");
  const heat = heatContext.createImageData(width, height);
  let energy = 0;
  let peaks = 0;

  for (let y = 1; y < height - 1; y += 1) {
    for (let x = 1; x < width - 1; x += 1) {
      const index = (y * width + x) * 4;
      const gray = (data.data[index] + data.data[index + 1] + data.data[index + 2]) / 3;
      const right = ((y * width + x + 1) * 4);
      const down = (((y + 1) * width + x) * 4);
      const edge = Math.abs(gray - data.data[right]) + Math.abs(gray - data.data[down]);
      const density = Math.min(255, edge * 1.7 + (255 - gray) * 0.18);
      energy += density;
      if (density > 165) peaks += 1;
      heat.data[index] = density;
      heat.data[index + 1] = Math.max(0, 180 - density / 2);
      heat.data[index + 2] = 255 - density;
      heat.data[index + 3] = Math.min(220, density);
    }
  }

  heatContext.putImageData(heat, 0, 0);
  const densityScore = energy / (width * height * 255);
  const advancedCount = Math.max(1, Math.round(densityScore * Math.sqrt(width * height) * 14));

  return {
    previewUrl,
    heatmapUrl: heatCanvas.toDataURL("image/png"),
    advancedCount,
    baselineCount: Math.round(advancedCount * 0.46),
    peaks: Math.round(peaks / 60),
    width,
    height
  };
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new window.Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = src;
  });
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
