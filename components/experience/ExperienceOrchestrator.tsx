"use client";

import { type ReactNode, useEffect } from "react";
import Lenis from "lenis";
import { useOrchestrationStore, type SectionId } from "@/store/orchestration-store";

export function ExperienceOrchestrator({ children }: { children: ReactNode }) {
  const setActiveSection = useOrchestrationStore((state) => state.setActiveSection);
  const setProgress = useOrchestrationStore((state) => state.setProgress);
  const setReducedMotion = useOrchestrationStore((state) => state.setReducedMotion);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updateReducedMotion = () => setReducedMotion(media.matches);

    updateReducedMotion();
    media.addEventListener("change", updateReducedMotion);
    return () => media.removeEventListener("change", updateReducedMotion);
  }, [setReducedMotion]);

  useEffect(() => {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reducedMotion) {
      return;
    }

    const lenis = new Lenis({
      lerp: 0.11,
      wheelMultiplier: 0.9,
      touchMultiplier: 0.95,
      smoothWheel: true,
      syncTouch: false
    });

    let raf = 0;
    const tick = (time: number) => {
      lenis.raf(time);
      raf = window.requestAnimationFrame(tick);
    };

    raf = window.requestAnimationFrame(tick);
    return () => {
      window.cancelAnimationFrame(raf);
      lenis.destroy();
    };
  }, []);

  useEffect(() => {
    const sections = Array.from(document.querySelectorAll<HTMLElement>("[data-section]"));

    const update = () => {
      const scrollable = Math.max(document.documentElement.scrollHeight - window.innerHeight, 1);
      setProgress(window.scrollY / scrollable);

      const focalY = window.innerHeight * 0.38;
      const active = sections.find((section) => {
        const rect = section.getBoundingClientRect();
        return rect.top <= focalY && rect.bottom >= focalY;
      });

      if (active?.dataset.section) {
        setActiveSection(active.dataset.section as SectionId);
      }
    };

    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [setActiveSection, setProgress]);

  return children;
}

export function useExperience() {
  return useOrchestrationStore();
}
