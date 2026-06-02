export interface GitHubRuntimeConfig {
  username: string;
  token?: string;
}

export function getGitHubRuntimeConfig():
  | { status: "ok"; config: GitHubRuntimeConfig }
  | { status: "error"; error: string } {
  const username = process.env.GITHUB_USERNAME?.trim();
  const token = process.env.GITHUB_TOKEN?.trim();

  if (!username) {
    return {
      status: "error",
      error: "Missing GITHUB_USERNAME. Add it to .env.local to enable live GitHub data."
    };
  }

  return {
    status: "ok",
    config: {
      username,
      token: token || undefined
    }
  };
}
