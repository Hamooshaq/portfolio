export function GitHubActivitySkeleton() {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="h-4 w-32 rounded-full bg-slate-100" />
      <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="rounded-3xl border border-slate-200 p-5">
            <div className="h-4 w-2/3 rounded-full bg-slate-100" />
            <div className="mt-4 space-y-2">
              <div className="h-3 rounded-full bg-slate-100" />
              <div className="h-3 w-5/6 rounded-full bg-slate-100" />
            </div>
            <div className="mt-8 h-3 w-1/2 rounded-full bg-slate-100" />
          </div>
        ))}
      </div>
    </div>
  );
}
