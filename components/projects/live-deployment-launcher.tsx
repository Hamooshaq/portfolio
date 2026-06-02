import { RadioTower } from "lucide-react";
import type { LiveDeployment } from "@/config/deployments";
import { ButtonLink } from "@/components/ui/button-link";
import { cn } from "@/lib/cn";

interface LiveDeploymentLauncherProps {
  deployment: LiveDeployment;
  className?: string;
}

export function LiveDeploymentLauncher({ deployment, className }: LiveDeploymentLauncherProps) {
  const isLive = Boolean(deployment.url);

  return (
    <aside
      className={cn(
        "mt-6 rounded-3xl border border-slate-200 bg-slate-50 p-5 text-slate-700",
        className
      )}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="inline-flex items-center gap-2 text-sm font-semibold text-slate-950">
            <RadioTower aria-hidden className="h-4 w-4" />
            Live deployment
          </p>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            {deployment.provider} · {deployment.runtime}
          </p>
        </div>

        {deployment.url ? (
          <ButtonLink href={deployment.url} variant="secondary" className="w-full shrink-0 bg-white sm:w-auto">
            {deployment.label}
          </ButtonLink>
        ) : (
          <span className="inline-flex min-h-11 w-full shrink-0 items-center justify-center rounded-full border border-dashed border-slate-300 px-5 text-center text-sm font-medium text-slate-500 sm:w-auto">
            Deployment coming soon
          </span>
        )}
      </div>
      <p className={cn("mt-4 text-xs leading-5", isLive ? "text-slate-500" : "text-amber-700")}>
        {isLive ? deployment.coldStartNote : "Add the production URL to the matching NEXT_PUBLIC_* env var after deployment."}
      </p>
    </aside>
  );
}
