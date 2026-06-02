import { siteConfig } from "@/config/site";

export function SiteFooter() {
  return (
    <footer className="border-t border-slate-200 px-5 py-8 text-sm text-slate-500 sm:px-8 lg:px-10">
      <div className="mx-auto flex max-w-7xl flex-col justify-between gap-4 sm:flex-row">
        <p>Mohammad — AI systems, interfaces, and product workflows.</p>
        <a className="hover:text-slate-950" href={`mailto:${siteConfig.email}`}>
          {siteConfig.email}
        </a>
      </div>
    </footer>
  );
}
