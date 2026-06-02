"use client";

import Link from "next/link";
import { Menu, X } from "lucide-react";
import { useState } from "react";
import { navigation, siteConfig } from "@/config/site";
import { useOrchestrationStore } from "@/store/orchestration-store";

export function SiteHeader() {
  const progress = useOrchestrationStore((state) => state.progress);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-slate-200/80 bg-[#f7f6f2]/85 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 sm:px-8 lg:px-10">
        <Link
          href="#hero"
          onClick={() => setIsMenuOpen(false)}
          className="font-semibold tracking-[-0.02em] text-slate-950"
        >
          {siteConfig.name}
        </Link>
        <nav aria-label="Main navigation" className="hidden items-center gap-1 md:flex">
          {navigation.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-full px-3 py-2 text-sm text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-950"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <button
          type="button"
          aria-label={isMenuOpen ? "Close navigation menu" : "Open navigation menu"}
          aria-expanded={isMenuOpen}
          aria-controls="mobile-navigation"
          onClick={() => setIsMenuOpen((current) => !current)}
          className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-950 shadow-sm md:hidden"
        >
          {isMenuOpen ? <X aria-hidden className="h-5 w-5" /> : <Menu aria-hidden className="h-5 w-5" />}
        </button>
      </div>
      {isMenuOpen ? (
        <nav
          id="mobile-navigation"
          aria-label="Mobile navigation"
          className="mx-auto grid max-h-[calc(100svh-4rem)] max-w-7xl gap-1 overflow-y-auto border-t border-slate-200 px-3 py-3 md:hidden"
        >
          {navigation.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setIsMenuOpen(false)}
              className="flex min-h-11 items-center rounded-2xl px-4 text-sm font-medium text-slate-700 active:bg-slate-100"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      ) : null}
      <div className="h-px bg-slate-200">
        <div
          className="h-px bg-slate-950 transition-[width] duration-150"
          style={{ width: `${Math.round(progress * 100)}%` }}
        />
      </div>
    </header>
  );
}
