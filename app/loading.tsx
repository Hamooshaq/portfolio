import { GitHubActivitySkeleton } from "@/components/github/github-activity-skeleton";

export default function Loading() {
  return (
    <main className="px-5 py-24 sm:px-8 lg:px-10">
      <div className="mx-auto max-w-7xl">
        <div className="h-4 w-28 rounded-full bg-slate-200" />
        <div className="mt-8 h-16 max-w-3xl rounded-3xl bg-slate-100" />
        <div className="mt-16">
          <GitHubActivitySkeleton />
        </div>
      </div>
    </main>
  );
}
