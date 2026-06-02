import type { PerformanceTier } from "@/lib/orchestration";

export interface TierProfile {
  dpr: number;
  particles: number;
  shaderComplexity: number;
  cameraIntensity: number;
  cursor: boolean;
  postprocess: boolean;
}

const tierProfiles: Record<PerformanceTier, TierProfile> = {
  high: {
    dpr: 1.75,
    particles: 1,
    shaderComplexity: 1,
    cameraIntensity: 1,
    cursor: true,
    postprocess: true
  },
  medium: {
    dpr: 1.25,
    particles: 0.58,
    shaderComplexity: 0.65,
    cameraIntensity: 0.7,
    cursor: true,
    postprocess: false
  },
  mobile: {
    dpr: 1,
    particles: 0.34,
    shaderComplexity: 0.38,
    cameraIntensity: 0.42,
    cursor: false,
    postprocess: false
  },
  "reduced-motion": {
    dpr: 1,
    particles: 0.12,
    shaderComplexity: 0.2,
    cameraIntensity: 0.05,
    cursor: false,
    postprocess: false
  }
};

interface NavigatorWithMemory extends Navigator {
  deviceMemory?: number;
}

function supportsWebGL() {
  try {
    const canvas = document.createElement("canvas");
    return Boolean(
      canvas.getContext("webgl2") ||
        canvas.getContext("webgl") ||
        canvas.getContext("experimental-webgl")
    );
  } catch {
    return false;
  }
}

export function detectPerformanceTier(): PerformanceTier {
  if (typeof window === "undefined") {
    return "medium";
  }

  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (prefersReducedMotion || !supportsWebGL()) {
    return "reduced-motion";
  }

  const coarsePointer = window.matchMedia("(pointer: coarse)").matches;
  const narrow = window.matchMedia("(max-width: 760px)").matches;
  if (coarsePointer || narrow) {
    return "mobile";
  }

  const nav = navigator as NavigatorWithMemory;
  const cores = navigator.hardwareConcurrency ?? 4;
  const memory = nav.deviceMemory ?? 4;

  if (cores >= 8 && memory >= 8 && window.innerWidth >= 1280) {
    return "high";
  }

  return "medium";
}

export function getTierProfile(tier: PerformanceTier) {
  return tierProfiles[tier];
}
