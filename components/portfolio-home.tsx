import { Github, Mail, ScrollText } from "lucide-react";
import { GitHubActivity } from "@/components/github/github-activity";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { Section } from "@/components/layout/section";
import { AIExperiments } from "@/components/projects/ai-experiments";
import { CrowdDetectionCaseStudy } from "@/components/projects/crowd-detection-case-study";
import { ForecastingCaseStudy } from "@/components/projects/forecasting-case-study";
import { ProductWork } from "@/components/projects/product-work";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button-link";
import { SectionHeading } from "@/components/ui/section-heading";
import { notes } from "@/config/case-studies";
import { siteConfig } from "@/config/site";
import type { GitHubData } from "@/lib/github-data";
import { ExperienceOrchestrator } from "@/components/experience/ExperienceOrchestrator";

export function PortfolioHome({ githubData }: { githubData: GitHubData }) {
  const githubUrl =
    githubData.profile?.htmlUrl ??
    (githubData.username ? `https://github.com/${githubData.username}` : null);

  return (
    <ExperienceOrchestrator>
      <SiteHeader />
      <main>
        <Section id="hero" className="pt-32 sm:pt-40">
          <Hero githubUrl={githubUrl} />
        </Section>

        <Section id="selected-work" className="bg-white/40">
          <ForecastingCaseStudy />
        </Section>

        <Section id="ai-systems">
          <div className="space-y-10">
            <CrowdDetectionCaseStudy />
            <AIExperiments />
          </div>
        </Section>

        <Section id="product-work" className="bg-white/40">
          <ProductWork />
        </Section>

        <Section id="github">
          <GitHubActivity data={githubData} />
        </Section>

        <Section id="notes" className="bg-white/40">
          <Notes />
        </Section>

        <Section id="contact">
          <Contact githubUrl={githubUrl} />
        </Section>
      </main>
      <SiteFooter />
    </ExperienceOrchestrator>
  );
}

function Hero({ githubUrl }: { githubUrl: string | null }) {
  return (
    <div className="grid min-h-[68vh] gap-10 lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
      <div>
        <div className="flex flex-wrap gap-2">
          {siteConfig.identity.map((item) => (
            <Badge key={item}>{item}</Badge>
          ))}
        </div>
        <h1 className="mt-8 max-w-4xl text-5xl font-semibold tracking-[-0.055em] text-slate-950 sm:text-7xl">
          Mohammad builds AI systems with clear interfaces and practical product logic.
        </h1>
      </div>

      <div className="lg:pl-10">
        <p className="text-xl leading-9 text-slate-700">{siteConfig.positioning}</p>
        <p className="mt-5 leading-8 text-slate-600">{siteConfig.intro}</p>
        <div className="mt-8 flex flex-wrap gap-3">
          {githubUrl ? (
            <ButtonLink href={githubUrl}>
              <Github aria-hidden className="h-4 w-4" />
              GitHub
            </ButtonLink>
          ) : null}
          <ButtonLink href={siteConfig.resumeUrl} variant="secondary">
            <ScrollText aria-hidden className="h-4 w-4" />
            Resume
          </ButtonLink>
        </div>
        <div className="mt-10 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-semibold text-slate-950">Current focus</p>
          <div className="mt-4 grid gap-3 text-sm leading-6 text-slate-600 sm:grid-cols-3">
            <p>AI-assisted inventory forecasting and rule-based planning workflows.</p>
            <p>Computer vision experiments with reproducible evaluation artifacts.</p>
            <p>Technical product direction for brand and interactive web systems.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function Notes() {
  return (
    <div>
      <SectionHeading eyebrow="Notes / thinking" title="Implementation notes, not motivational slogans.">
        <p>
          Short reflections on model choice, explainability, dashboard design, and
          research-code structure.
        </p>
      </SectionHeading>
      <div className="mt-10 grid gap-5 md:grid-cols-2">
        {notes.map((note) => (
          <article key={note.title} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="text-xl font-semibold tracking-[-0.02em] text-slate-950">{note.title}</h3>
            <p className="mt-4 leading-8 text-slate-600">{note.body}</p>
          </article>
        ))}
      </div>
    </div>
  );
}

function Contact({ githubUrl }: { githubUrl: string | null }) {
  return (
    <div className="rounded-[2rem] border border-slate-200 bg-slate-950 p-6 text-white shadow-sm sm:p-10">
      <div className="grid gap-8 lg:grid-cols-[1fr_0.8fr] lg:items-end">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.16em] text-white/45">Contact</p>
          <h2 className="mt-4 max-w-3xl text-4xl font-semibold tracking-[-0.04em] sm:text-6xl">
            Useful systems, clear interfaces, practical experiments.
          </h2>
          <p className="mt-5 max-w-2xl leading-8 text-white/65">
            Open to collaborations around AI-assisted workflows, computer vision,
            technical dashboards, and product-minded interactive systems.
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row lg:flex-col">
          <ButtonLink href={`mailto:${siteConfig.email}`} className="bg-white text-slate-950 hover:bg-slate-100">
            <Mail aria-hidden className="h-4 w-4" />
            Email
          </ButtonLink>
          {githubUrl ? (
            <ButtonLink href={githubUrl} variant="secondary" className="border-white/15 bg-white/5 text-white hover:border-white/25 hover:bg-white/10">
              GitHub
            </ButtonLink>
          ) : null}
          <ButtonLink href={siteConfig.linkedinUrl} variant="secondary" className="border-white/15 bg-white/5 text-white hover:border-white/25 hover:bg-white/10">
            LinkedIn
          </ButtonLink>
          <ButtonLink href={siteConfig.resumeUrl} variant="secondary" className="border-white/15 bg-white/5 text-white hover:border-white/25 hover:bg-white/10">
            Resume
          </ButtonLink>
        </div>
      </div>
    </div>
  );
}
