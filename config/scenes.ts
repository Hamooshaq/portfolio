import type { SceneDefinition } from "@/lib/orchestration";

export const scenes: SceneDefinition[] = [
  {
    id: "hero",
    label: "opening note",
    range: [0, 0.16],
    pacing: "impact",
    typography: "detonate",
    transition: "ignite",
    mood: {
      background: "#060606",
      foreground: "#f3eee3",
      accent: "#d8d0bf",
      secondary: "#8292a4",
      haze: "rgba(216, 208, 191, 0.1)",
      contrast: 0.62,
      warmth: 0.44
    },
    camera: { depth: 7.6, drift: 1, rotation: 0.22, zoom: 1 },
    particles: { density: 1300, speed: 0.86, spread: 10, turbulence: 0.7 }
  },
  {
    id: "about",
    label: "loose notes",
    range: [0.16, 0.32],
    pacing: "silence",
    typography: "drift",
    transition: "submerge",
    mood: {
      background: "#07090d",
      foreground: "#f1ece2",
      accent: "#d2c0a0",
      secondary: "#6f7f88",
      haze: "rgba(210, 192, 160, 0.1)",
      contrast: 0.7,
      warmth: 0.48
    },
    camera: { depth: 8.8, drift: 0.55, rotation: -0.12, zoom: 0.92 },
    particles: { density: 720, speed: 0.38, spread: 13, turbulence: 0.34 }
  },
  {
    id: "projects",
    label: "work table",
    range: [0.32, 0.58],
    pacing: "build",
    typography: "editorial",
    transition: "warp",
    mood: {
      background: "#050505",
      foreground: "#fff8ed",
      accent: "#f1a65d",
      secondary: "#f1f1ed",
      haze: "rgba(241, 166, 93, 0.12)",
      contrast: 0.78,
      warmth: 0.7
    },
    camera: { depth: 6.7, drift: 1.2, rotation: 0.36, zoom: 1.08 },
    particles: { density: 1600, speed: 0.94, spread: 12, turbulence: 0.92 }
  },
  {
    id: "skills",
    label: "tools / habits",
    range: [0.58, 0.74],
    pacing: "sustain",
    typography: "network",
    transition: "gravity",
    mood: {
      background: "#02070a",
      foreground: "#e9fbff",
      accent: "#9fb7b4",
      secondary: "#d8c0ff",
      haze: "rgba(159, 183, 180, 0.12)",
      contrast: 0.62,
      warmth: 0.26
    },
    camera: { depth: 7.2, drift: 0.95, rotation: -0.34, zoom: 1.02 },
    particles: { density: 1400, speed: 1.15, spread: 11, turbulence: 1 }
  },
  {
    id: "vision",
    label: "quiet thought",
    range: [0.74, 0.88],
    pacing: "release",
    typography: "quiet",
    transition: "exhale",
    mood: {
      background: "#08070b",
      foreground: "#fbf4ea",
      accent: "#c9b894",
      secondary: "#8b9fb0",
      haze: "rgba(201, 184, 148, 0.08)",
      contrast: 0.62,
      warmth: 0.52
    },
    camera: { depth: 9.4, drift: 0.42, rotation: 0.08, zoom: 0.84 },
    particles: { density: 580, speed: 0.28, spread: 14, turbulence: 0.2 }
  },
  {
    id: "contact",
    label: "leave a note",
    range: [0.88, 1],
    pacing: "impact",
    typography: "transmit",
    transition: "signal",
    mood: {
      background: "#030407",
      foreground: "#f7f1e8",
      accent: "#e6d6b4",
      secondary: "#8bb2c2",
      haze: "rgba(230, 214, 180, 0.12)",
      contrast: 0.78,
      warmth: 0.46
    },
    camera: { depth: 5.8, drift: 0.82, rotation: 0.18, zoom: 1.18 },
    particles: { density: 1800, speed: 1.25, spread: 9, turbulence: 1.1 }
  }
];

export const sceneById = Object.fromEntries(scenes.map((scene) => [scene.id, scene])) as Record<
  SceneDefinition["id"],
  SceneDefinition
>;
