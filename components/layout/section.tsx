import { cn } from "@/lib/cn";
import type { SectionId } from "@/store/orchestration-store";

export function Section({
  id,
  children,
  className
}: {
  id: SectionId;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      id={id}
      data-section={id}
      className={cn("scroll-mt-24 px-5 py-24 sm:px-8 lg:px-10", className)}
    >
      <div className="mx-auto max-w-7xl">{children}</div>
    </section>
  );
}
