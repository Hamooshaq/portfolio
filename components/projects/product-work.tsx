import { productWork } from "@/config/case-studies";
import { SectionHeading } from "@/components/ui/section-heading";

export function ProductWork() {
  return (
    <div>
      <SectionHeading
        eyebrow="CTO / product work"
        title="Creative direction with implementation constraints in view."
      >
        <p>
          Wessky and Kopi Rute are presented as technical and creative direction work,
          not exaggerated startup narratives. The focus is product thinking, interface
          direction, brand systems, and practical web strategy.
        </p>
      </SectionHeading>

      <div className="mt-10 grid gap-6 md:grid-cols-2">
        {productWork.map((project) => (
          <article
            key={project.title}
            className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm"
          >
            <p className="text-sm font-medium uppercase tracking-[0.14em] text-slate-400">
              {project.role}
            </p>
            <h3 className="mt-4 text-3xl font-semibold tracking-[-0.03em] text-slate-950">
              {project.title}
            </h3>
            <p className="mt-4 leading-8 text-slate-600">{project.focus}</p>
            <div className="mt-6 space-y-3">
              {project.details.map((detail) => (
                <p key={detail} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                  {detail}
                </p>
              ))}
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
