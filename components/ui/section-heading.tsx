import { cn } from "@/lib/cn";

interface SectionHeadingProps {
  eyebrow: string;
  title: string;
  children?: React.ReactNode;
  className?: string;
}

export function SectionHeading({ eyebrow, title, children, className }: SectionHeadingProps) {
  return (
    <div className={cn("max-w-3xl", className)}>
      <p className="text-sm font-medium uppercase tracking-[0.16em] text-slate-500">{eyebrow}</p>
      <h2 className="mt-4 text-3xl font-semibold leading-tight tracking-[-0.03em] text-slate-950 sm:text-5xl">
        {title}
      </h2>
      {children ? <div className="mt-5 text-base leading-8 text-slate-600">{children}</div> : null}
    </div>
  );
}
