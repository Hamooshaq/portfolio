import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/cn";

interface ButtonLinkProps {
  href: string;
  children: React.ReactNode;
  variant?: "primary" | "secondary" | "ghost";
  download?: boolean;
  target?: "_blank" | "_self";
  className?: string;
}

export function ButtonLink({
  href,
  children,
  variant = "primary",
  download,
  target,
  className
}: ButtonLinkProps) {
  const isExternal = href.startsWith("http") || href.startsWith("mailto:");
  const isFileAsset = /\.(pdf|docx?|zip)(?:[?#].*)?$/i.test(href);
  const linkTarget = target ?? (isExternal && !href.startsWith("mailto:") ? "_blank" : isFileAsset ? "_blank" : undefined);
  const classes = cn(
    "inline-flex min-h-11 items-center justify-center gap-2 rounded-full px-5 text-sm font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900",
    variant === "primary" && "bg-slate-950 text-white hover:bg-slate-800",
    variant === "secondary" && "border border-slate-200 bg-white text-slate-950 hover:border-slate-300",
    variant === "ghost" && "text-slate-600 hover:bg-slate-100 hover:text-slate-950",
    className
  );

  if (isExternal || download || isFileAsset) {
    return (
      <a
        href={href}
        className={classes}
        target={linkTarget}
        rel={linkTarget === "_blank" ? "noreferrer" : undefined}
        download={download}
      >
        {children}
        <ArrowUpRight aria-hidden className="h-4 w-4" />
      </a>
    );
  }

  return (
    <Link href={href} className={classes}>
      {children}
      <ArrowUpRight aria-hidden className="h-4 w-4" />
    </Link>
  );
}
