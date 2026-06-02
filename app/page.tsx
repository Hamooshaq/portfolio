import { PortfolioHome } from "@/components/portfolio-home";
import { getGitHubData } from "@/lib/github";

export const dynamic = "force-dynamic";

export default async function Home() {
  const githubData = await getGitHubData();

  return <PortfolioHome githubData={githubData} />;
}
