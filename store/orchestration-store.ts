"use client";

import { create } from "zustand";

export type SectionId =
  | "hero"
  | "selected-work"
  | "ai-systems"
  | "product-work"
  | "github"
  | "notes"
  | "contact";

interface OrchestrationState {
  activeSection: SectionId;
  progress: number;
  reducedMotion: boolean;
  setActiveSection: (section: SectionId) => void;
  setProgress: (progress: number) => void;
  setReducedMotion: (reducedMotion: boolean) => void;
}

export const useOrchestrationStore = create<OrchestrationState>((set) => ({
  activeSection: "hero",
  progress: 0,
  reducedMotion: false,
  setActiveSection: (activeSection) => set({ activeSection }),
  setProgress: (progress) => set({ progress }),
  setReducedMotion: (reducedMotion) => set({ reducedMotion })
}));
