"use client";

import Image from "next/image";
import type { ReactNode } from "react";
import { useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowDownUp,
  CalendarDays,
  GitFork,
  Github,
  Star,
  Users
} from "lucide-react";
import {
  type GitHubData,
  type GitHubRepo,
  formatDate,
  formatRelativeDate,
  getFeaturedRepos,
  summarizeLanguages
} from "@/lib/github-data";
import { ButtonLink } from "@/components/ui/button-link";
import { SectionHeading } from "@/components/ui/section-heading";
import { cn } from "@/lib/cn";

type SortMode = "featured" | "updated" | "stars" | "name";

function humanizeEvent(type: string) {
  return type
    .replace(/Event$/, "")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .trim();
}

function repoTags(repo: GitHubRepo) {
  return [
    repo.language,
    ...repo.topics.slice(0, 3),
    repo.fork ? "fork" : null,
    repo.archived ? "archived" : null
  ].filter((tag): tag is string => Boolean(tag));
}

function sortRepos(repos: GitHubRepo[], sort: SortMode) {
  const copy = [...repos];

  if (sort === "stars") {
    return copy.sort((a, b) => b.stargazersCount - a.stargazersCount);
  }

  if (sort === "name") {
    return copy.sort((a, b) => a.name.localeCompare(b.name));
  }

  if (sort === "updated") {
    return copy.sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
  }

  return copy;
}

export function GitHubActivity({ data }: { data: GitHubData }) {
  const featured = useMemo(
    () => getFeaturedRepos(data.repos, data.pinnedRepoFullNames),
    [data.pinnedRepoFullNames, data.repos]
  );
  const languages = useMemo(() => summarizeLanguages(data.repos), [data.repos]);
  const languageFilters = useMemo(
    () =>
      Array.from(
        new Set(
          data.repos
            .filter((repo) => !repo.fork && !repo.archived && repo.language)
            .map((repo) => repo.language as string)
        )
      ).slice(0, 6),
    [data.repos]
  );
  const [filter, setFilter] = useState("featured");
  const [sort, setSort] = useState<SortMode>("featured");

  const repos = useMemo(() => {
    const visibleRepos = data.repos.filter((repo) => !repo.archived);

    if (filter === "featured") {
      return sortRepos(featured, sort).slice(0, 6);
    }

    if (filter === "forks") {
      return sortRepos(visibleRepos.filter((repo) => repo.fork), sort).slice(0, 12);
    }

    if (filter.startsWith("language:")) {
      const language = filter.replace("language:", "");
      return sortRepos(
        visibleRepos.filter((repo) => !repo.fork && repo.language === language),
        sort
      ).slice(0, 12);
    }

    return sortRepos(visibleRepos.filter((repo) => !repo.fork), sort).slice(0, 12);
  }, [data.repos, featured, filter, sort]);

  const profileUrl =
    data.profile?.htmlUrl ?? (data.username ? `https://github.com/${data.username}` : null);
  const filterItems = [
    { label: "Featured", value: "featured" },
    { label: "All repos", value: "all" },
    ...languageFilters.map((language) => ({
      label: language,
      value: `language:${language}`
    })),
    { label: "Forks", value: "forks" }
  ];

  return (
    <div>
      <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
        <SectionHeading eyebrow="GitHub activity" title="Live work from Mohammad's GitHub.">
          <p>
            This section reads directly from the GitHub API for the configured account.
            Repositories, profile data, recent public activity, languages, and update times
            are dynamic, with real empty and error states instead of fake entries.
          </p>
        </SectionHeading>
        {profileUrl ? (
          <ButtonLink href={profileUrl} variant="secondary" className="w-full sm:w-auto">
            Open GitHub
          </ButtonLink>
        ) : null}
      </div>

      {data.status === "error" ? (
        <GitHubError data={data} />
      ) : (
        <>
          {data.status === "partial" && data.warnings.length > 0 ? (
            <div className="mt-8 flex gap-3 rounded-3xl border border-amber-200 bg-amber-50 p-5 text-amber-950">
              <AlertTriangle aria-hidden className="mt-0.5 h-5 w-5 shrink-0" />
              <div className="min-w-0">
                <p className="font-semibold">GitHub data partially loaded</p>
                <p className="mt-1 text-sm leading-6">{data.warnings[0]}</p>
              </div>
            </div>
          ) : null}

          <div className="mt-10 grid gap-4 lg:grid-cols-[0.78fr_1.22fr]">
            <ProfilePanel data={data} languages={languages} />
            <ActivityPanel data={data} />
          </div>

          <div className="mt-8 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap gap-2">
              {filterItems.map((item) => (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => setFilter(item.value)}
                  className={cn(
                    "rounded-full border px-4 py-2 text-sm font-medium transition-colors",
                    filter === item.value
                      ? "border-slate-950 bg-slate-950 text-white"
                      : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                  )}
                >
                  {item.label}
                </button>
              ))}
            </div>

            <label className="flex w-full items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm text-slate-600 sm:w-fit">
              <ArrowDownUp aria-hidden className="h-4 w-4" />
              <span className="sr-only">Sort repositories</span>
              <select
                value={sort}
                onChange={(event) => setSort(event.target.value as SortMode)}
                className="w-full bg-transparent font-medium text-slate-950 outline-none"
              >
                <option value="featured">Featured order</option>
                <option value="updated">Recently updated</option>
                <option value="stars">Most starred</option>
                <option value="name">Name</option>
              </select>
            </label>
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {repos.length > 0 ? (
              repos.map((repo) => <RepoCard key={repo.id} repo={repo} />)
            ) : (
              <div className="rounded-3xl border border-slate-200 bg-white p-6 text-sm text-slate-600">
                No repositories match this filter for @{data.username}.
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function GitHubError({ data }: { data: GitHubData }) {
  return (
    <div className="mt-10 rounded-3xl border border-amber-200 bg-amber-50 p-6 text-amber-950">
      <p className="font-semibold">GitHub data unavailable</p>
      <p className="mt-2 text-sm leading-7">{data.error}</p>
      <p className="mt-2 text-sm leading-7">
        The section expects <code>GITHUB_USERNAME</code> and optional{" "}
        <code>GITHUB_TOKEN</code> in <code>.env.local</code>. It will stay empty rather than
        rendering fake repositories.
      </p>
    </div>
  );
}

function ProfilePanel({
  data,
  languages
}: {
  data: GitHubData;
  languages: ReturnType<typeof summarizeLanguages>;
}) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start gap-4">
        {data.profile ? (
          <Image
            src={data.profile.avatarUrl}
            alt={`${data.profile.login} GitHub avatar`}
            width={56}
            height={56}
            unoptimized
            className="rounded-2xl border border-slate-200"
          />
        ) : (
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50">
            <Github aria-hidden className="h-6 w-6" />
          </div>
        )}
        <div className="min-w-0">
          <p className="font-semibold text-slate-950">
            {data.profile?.name ?? data.username}
          </p>
          <p className="break-words text-sm text-slate-500">@{data.username}</p>
          {data.profile?.bio ? (
            <p className="mt-3 text-sm leading-6 text-slate-600">{data.profile.bio}</p>
          ) : null}
        </div>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3">
        <Stat label="Public repos" value={String(data.profile?.publicRepos ?? data.repos.length)} />
        <Stat label="Followers" value={String(data.profile?.followers ?? 0)} icon={<Users className="h-4 w-4" />} />
        <Stat label="Following" value={String(data.profile?.following ?? 0)} />
        <Stat label="Public gists" value={String(data.profile?.publicGists ?? 0)} />
      </div>

      <div className="mt-6 space-y-3">
        <p className="text-sm font-semibold text-slate-950">Language usage</p>
        {languages.length > 0 ? (
          languages.map((language) => (
            <div key={language.language}>
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">{language.language}</span>
                <span className="font-medium text-slate-950">{language.percentage}%</span>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-slate-950"
                  style={{ width: `${language.percentage}%` }}
                />
              </div>
            </div>
          ))
        ) : (
          <p className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
            No language metadata returned for public repositories yet.
          </p>
        )}
      </div>
    </div>
  );
}

function ActivityPanel({ data }: { data: GitHubData }) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <p className="font-semibold text-slate-950">Recent public activity</p>
        {data.profile ? (
          <span className="inline-flex items-center gap-2 text-xs text-slate-500">
            <CalendarDays aria-hidden className="h-4 w-4" />
            Profile updated {formatRelativeDate(data.profile.updatedAt)}
          </span>
        ) : null}
      </div>
      <div className="mt-4 space-y-3">
        {data.events.length > 0 ? (
          data.events.slice(0, 6).map((event) => (
            <a
              key={event.id}
              href={event.url}
              target="_blank"
              rel="noreferrer"
              className="block rounded-2xl border border-slate-200 bg-slate-50 p-4 transition-colors hover:border-slate-300"
            >
              <p className="text-sm font-medium text-slate-950">{humanizeEvent(event.type)}</p>
              <p className="mt-1 break-words text-sm text-slate-500">
                {event.repoName} · {formatDate(event.createdAt)}
              </p>
            </a>
          ))
        ) : (
          <p className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
            No recent public activity returned by the API.
          </p>
        )}
      </div>
    </div>
  );
}

function RepoCard({ repo }: { repo: GitHubRepo }) {
  const tags = repoTags(repo);

  return (
    <article className="flex min-h-64 flex-col rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <a
          href={repo.url}
          target="_blank"
          rel="noreferrer"
          className="min-w-0 break-words font-semibold text-slate-950 hover:underline"
        >
          {repo.name}
        </a>
        <span className="shrink-0 rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-600">
          {repo.defaultBranch}
        </span>
      </div>

      <p className="mt-3 text-sm leading-7 text-slate-600">
        {repo.description ?? "No repository description published."}
      </p>

      {tags.length > 0 ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {tags.map((tag) => (
            <span key={tag} className="rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-600">
              {tag}
            </span>
          ))}
        </div>
      ) : null}

      <div className="mt-auto pt-5">
        <div className="flex flex-col gap-2 text-sm text-slate-500 min-[420px]:flex-row min-[420px]:items-center min-[420px]:justify-between">
          <span title={formatDate(repo.updatedAt)}>Updated {formatRelativeDate(repo.updatedAt)}</span>
          <span className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1">
              <Star className="h-4 w-4" /> {repo.stargazersCount}
            </span>
            <span className="inline-flex items-center gap-1">
              <GitFork className="h-4 w-4" /> {repo.forksCount}
            </span>
          </span>
        </div>
        {repo.license ? (
          <p className="mt-3 text-xs text-slate-400">{repo.license}</p>
        ) : null}
      </div>
    </article>
  );
}

function Stat({
  label,
  value,
  icon
}: {
  label: string;
  value: string;
  icon?: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <p className="flex items-center gap-2 break-words text-xl font-semibold text-slate-950 sm:text-2xl">
        {value}
        {icon ? <span className="text-slate-400">{icon}</span> : null}
      </p>
      <p className="mt-1 text-sm text-slate-500">{label}</p>
    </div>
  );
}
