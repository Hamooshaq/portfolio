import { getGitHubRuntimeConfig, type GitHubRuntimeConfig } from "@/lib/github-config";
import type { GitHubData, GitHubRepo } from "@/lib/github-data";
export type { GitHubData, GitHubEvent, GitHubProfile, GitHubRepo } from "@/lib/github-data";

interface RawRepo {
  id: number;
  name: string;
  full_name: string;
  description: string | null;
  html_url: string;
  homepage: string | null;
  language: string | null;
  stargazers_count: number;
  forks_count: number;
  open_issues_count: number;
  updated_at: string;
  pushed_at: string | null;
  topics?: string[];
  archived: boolean;
  fork: boolean;
  default_branch: string;
  license: { name: string } | null;
  size: number;
}

interface RawProfile {
  login: string;
  name: string | null;
  avatar_url: string;
  html_url: string;
  bio: string | null;
  public_repos: number;
  public_gists: number;
  followers: number;
  following: number;
  created_at: string;
  updated_at: string;
}

interface RawEvent {
  id: string;
  type: string;
  repo: { name: string; url: string };
  created_at: string;
}

interface GraphQLPinnedResponse {
  data?: {
    user?: {
      pinnedItems?: {
        nodes?: Array<{
          nameWithOwner?: string;
        } | null>;
      };
    } | null;
  };
  errors?: Array<{ message: string }>;
}

class GitHubApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly remaining: string | null
  ) {
    super(message);
  }
}

function githubHeaders(config: GitHubRuntimeConfig) {
  const headers: HeadersInit = {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28"
  };

  if (config.token) {
    headers.Authorization = `Bearer ${config.token}`;
  }

  return headers;
}

async function githubFetch<T>(url: string, config: GitHubRuntimeConfig): Promise<T> {
  const response = await fetch(url, {
    headers: githubHeaders(config),
    cache: "no-store"
  });

  if (!response.ok) {
    const rateRemaining = response.headers.get("x-ratelimit-remaining");
    const body = await response.json().catch(() => null);
    const apiMessage =
      body && typeof body === "object" && "message" in body
        ? String(body.message)
        : `GitHub API returned ${response.status}.`;

    throw new GitHubApiError(apiMessage, response.status, rateRemaining);
  }

  return response.json() as Promise<T>;
}

async function getPinnedRepoFullNames(config: GitHubRuntimeConfig) {
  if (!config.token) {
    return [];
  }

  const response = await fetch("https://api.github.com/graphql", {
    method: "POST",
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${config.token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      query: `
        query PinnedRepositories($login: String!) {
          user(login: $login) {
            pinnedItems(first: 6, types: REPOSITORY) {
              nodes {
                ... on Repository {
                  nameWithOwner
                }
              }
            }
          }
        }
      `,
      variables: { login: config.username }
    }),
    cache: "no-store"
  });

  if (!response.ok) {
    return [];
  }

  const payload = (await response.json()) as GraphQLPinnedResponse;

  if (payload.errors?.length) {
    return [];
  }

  return (
    payload.data?.user?.pinnedItems?.nodes
      ?.map((node) => node?.nameWithOwner)
      .filter((name): name is string => Boolean(name)) ?? []
  );
}

function formatGitHubError(error: unknown) {
  if (error instanceof GitHubApiError) {
    if (error.status === 403 && error.remaining === "0") {
      return "GitHub API rate limit reached. Add GITHUB_TOKEN to .env.local for a higher limit.";
    }

    return `GitHub API error ${error.status}: ${error.message}`;
  }

  return error instanceof Error ? error.message : "Unable to fetch GitHub data.";
}

function normalizeRepo(repo: RawRepo): GitHubRepo {
  return {
    id: repo.id,
    name: repo.name,
    fullName: repo.full_name,
    description: repo.description,
    url: repo.html_url,
    homepage: repo.homepage,
    language: repo.language,
    stargazersCount: repo.stargazers_count,
    forksCount: repo.forks_count,
    openIssuesCount: repo.open_issues_count,
    updatedAt: repo.updated_at,
    pushedAt: repo.pushed_at,
    topics: repo.topics ?? [],
    archived: repo.archived,
    fork: repo.fork,
    defaultBranch: repo.default_branch,
    license: repo.license?.name ?? null,
    size: repo.size
  };
}

export async function getGitHubData(): Promise<GitHubData> {
  const runtime = getGitHubRuntimeConfig();

  if (runtime.status === "error") {
    return {
      status: "error",
      username: "",
      profile: null,
      repos: [],
      events: [],
      pinnedRepoFullNames: [],
      error: runtime.error,
      warnings: []
    };
  }

  const { config } = runtime;
  const { username } = config;

  const [profileResult, reposResult, eventsResult, pinnedResult] = await Promise.allSettled([
    githubFetch<RawProfile>(`https://api.github.com/users/${username}`, config),
    githubFetch<RawRepo[]>(
      `https://api.github.com/users/${username}/repos?sort=updated&direction=desc&per_page=100`,
      config
    ),
    githubFetch<RawEvent[]>(
      `https://api.github.com/users/${username}/events/public?per_page=15`,
      config
    ),
    getPinnedRepoFullNames(config)
  ]);

  const warnings = [profileResult, reposResult, eventsResult, pinnedResult]
    .filter((result): result is PromiseRejectedResult => result.status === "rejected")
    .map((result) => formatGitHubError(result.reason));

  if (profileResult.status === "rejected" && reposResult.status === "rejected") {
    return {
      status: "error",
      username,
      profile: null,
      repos: [],
      events: [],
      pinnedRepoFullNames: [],
      error: warnings[0] ?? "Unable to fetch GitHub profile or repositories.",
      warnings
    };
  }

  const profile = profileResult.status === "fulfilled" ? profileResult.value : null;
  const repos = reposResult.status === "fulfilled" ? reposResult.value : [];
  const events = eventsResult.status === "fulfilled" ? eventsResult.value : [];
  const pinnedRepoFullNames = pinnedResult.status === "fulfilled" ? pinnedResult.value : [];

  return {
    status: warnings.length > 0 ? "partial" : "ok",
    username: profile?.login ?? username,
    profile: profile
      ? {
          login: profile.login,
          name: profile.name,
          avatarUrl: profile.avatar_url,
          htmlUrl: profile.html_url,
          bio: profile.bio,
          publicRepos: profile.public_repos,
          publicGists: profile.public_gists,
          followers: profile.followers,
          following: profile.following,
          createdAt: profile.created_at,
          updatedAt: profile.updated_at
        }
      : null,
    repos: repos.map(normalizeRepo),
    events: events.map((event) => ({
        id: event.id,
        type: event.type,
        repoName: event.repo.name,
        createdAt: event.created_at,
        url: `https://github.com/${event.repo.name}`
      })),
    pinnedRepoFullNames,
    error: null,
    warnings
  };
}
