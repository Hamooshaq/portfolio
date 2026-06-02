"use client";

import Link from "next/link";
import { navigation, siteConfig } from "@/config/site";
import { useOrchestrationStore } from "@/store/orchestration-store";

export function SiteHeader() {
  const progress = useOrchestrationStore((state) => state.progress);

  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-slate-200/80 bg-[#f7f6f2]/85 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 sm:px-8 lg:px-10">
        <Link href="#hero" className="font-semibold tracking-[-0.02em] text-slate-950">
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
      </div>
      <div className="h-px bg-slate-200">
        <div
          className="h-px bg-slate-950 transition-[width] duration-150"
          style={{ width: `${Math.round(progress * 100)}%` }}
        />
      </div>
    </header>
  );
}
