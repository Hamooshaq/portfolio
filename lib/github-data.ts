export interface GitHubRepo {
  id: number;
  name: string;
  fullName: string;
  description: string | null;
  url: string;
  homepage: string | null;
  language: string | null;
  stargazersCount: number;
  forksCount: number;
  openIssuesCount: number;
  updatedAt: string;
  pushedAt: string | null;
  topics: string[];
  archived: boolean;
  fork: boolean;
  defaultBranch: string;
  license: string | null;
  size: number;
}

export interface GitHubEvent {
  id: string;
  type: string;
  repoName: string;
  createdAt: string;
  url: string;
}

export interface GitHubProfile {
  login: string;
  name: string | null;
  avatarUrl: string;
  htmlUrl: string;
  bio: string | null;
  publicRepos: number;
  publicGists: number;
  followers: number;
  following: number;
  createdAt: string;
  updatedAt: string;
}

export interface GitHubData {
  status: "ok" | "partial" | "error";
  username: string;
  profile: GitHubProfile | null;
  repos: GitHubRepo[];
  events: GitHubEvent[];
  pinnedRepoFullNames: string[];
  error: string | null;
  warnings: string[];
}

export function formatDate(date: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric"
  }).format(new Date(date));
}

export function formatRelativeDate(date: string) {
  const timestamp = new Date(date).getTime();
  const delta = Date.now() - timestamp;
  const days = Math.max(0, Math.round(delta / 86_400_000));

  if (days === 0) {
    return "today";
  }

  if (days === 1) {
    return "yesterday";
  }

  if (days < 30) {
    return `${days} days ago`;
  }

  const months = Math.round(days / 30);

  if (months < 12) {
    return `${months} ${months === 1 ? "month" : "months"} ago`;
  }

  const years = Math.round(months / 12);

  return `${years} ${years === 1 ? "year" : "years"} ago`;
}

export function summarizeLanguages(repos: GitHubRepo[]) {
  const counts = new Map<string, number>();

  repos.forEach((repo) => {
    if (!repo.language || repo.fork || repo.archived) {
      return;
    }

    counts.set(repo.language, (counts.get(repo.language) ?? 0) + 1);
  });

  const total = Array.from(counts.values()).reduce((sum, count) => sum + count, 0);

  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([language, count]) => ({
      language,
      count,
      percentage: total === 0 ? 0 : Math.round((count / total) * 100)
    }));
}

export function getFeaturedRepos(repos: GitHubRepo[], pinnedRepoFullNames: string[] = []) {
  const pinned = pinnedRepoFullNames
    .map((fullName) => repos.find((repo) => repo.fullName.toLowerCase() === fullName.toLowerCase()))
    .filter((repo): repo is GitHubRepo => Boolean(repo));

  if (pinned.length > 0) {
    return pinned;
  }

  const technicalSignals = ["ai", "ml", "vision", "detect", "forecast", "system", "data", "model"];

  const featured = repos
    .filter((repo) => !repo.fork && !repo.archived)
    .map((repo) => {
      const searchable = `${repo.name} ${repo.description ?? ""} ${repo.topics.join(" ")}`.toLowerCase();
      const signalScore = technicalSignals.filter((signal) => searchable.includes(signal)).length;
      const pushedTime = repo.pushedAt ? new Date(repo.pushedAt).getTime() : 0;

      return {
        repo,
        score:
          signalScore * 8 +
          repo.topics.length * 2 +
          repo.stargazersCount * 3 +
          Math.min(Math.max(pushedTime / 1_000_000_000_000, 0), 2)
      };
    })
    .sort((a, b) => b.score - a.score)
    .map((item) => item.repo)
    .slice(0, 6);

  return featured.length > 0 ? featured : repos.filter((repo) => !repo.fork).slice(0, 6);
}
