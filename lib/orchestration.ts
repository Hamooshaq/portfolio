export type SceneId =
  | "hero"
  | "about"
  | "projects"
  | "skills"
  | "vision"
  | "contact";

export type PerformanceTier = "high" | "medium" | "mobile" | "reduced-motion";

export type TypographyMode =
  | "detonate"
  | "drift"
  | "editorial"
  | "network"
  | "quiet"
  | "transmit";

export type PacingMode = "silence" | "build" | "impact" | "sustain" | "release";

export interface SceneMood {
  background: string;
  foreground: string;
  accent: string;
  secondary: string;
  haze: string;
  contrast: number;
  warmth: number;
}

export interface SceneCamera {
  depth: number;
  drift: number;
  rotation: number;
  zoom: number;
}

export interface SceneParticles {
  density: number;
  speed: number;
  spread: number;
  turbulence: number;
}

export interface AudioReactiveState {
  enabled: boolean;
  amplitude: number;
  low: number;
  mid: number;
  high: number;
  pulse: number;
}

export interface SceneDefinition {
  id: SceneId;
  label: string;
  range: [number, number];
  pacing: PacingMode;
  typography: TypographyMode;
  mood: SceneMood;
  camera: SceneCamera;
  particles: SceneParticles;
  transition: "ignite" | "submerge" | "warp" | "gravity" | "exhale" | "signal";
}

export interface ExperienceState {
  activeScene: SceneId;
  globalProgress: number;
  sceneProgress: number;
  transitionProgress: number;
  mouse: { x: number; y: number; smoothX: number; smoothY: number };
  tier: PerformanceTier;
  audio: AudioReactiveState;
}

export const initialAudioState: AudioReactiveState = {
  enabled: false,
  amplitude: 0,
  low: 0,
  mid: 0,
  high: 0,
  pulse: 0
};

export function clamp(value: number, min = 0, max = 1) {
  return Math.min(max, Math.max(min, value));
}

export function mapRange(value: number, input: [number, number], output: [number, number]) {
  const progress = clamp((value - input[0]) / (input[1] - input[0]));
  return output[0] + (output[1] - output[0]) * progress;
}

export function sceneLocalProgress(value: number, range: [number, number]) {
  return clamp((value - range[0]) / (range[1] - range[0]));
}

export function weightedTransitionProgress(localProgress: number) {
  const intro = clamp(localProgress / 0.22);
  const outro = clamp((localProgress - 0.78) / 0.22);
  return Math.max(intro, outro);
}
