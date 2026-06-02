export function SystemMap({
  title,
  items
}: {
  title: string;
  items: readonly string[];
}) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
      <p className="text-sm font-semibold text-slate-950">{title}</p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {items.map((item) => (
          <div key={item} className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-600">
            {item}
          </div>
        ))}
      </div>
    </div>
  );
}
