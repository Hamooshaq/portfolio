function publicAssetUrl(value: string | undefined, fallback: string) {
  if (!value?.trim()) return fallback;

  const normalized = value.trim();
  if (normalized.startsWith("http") || normalized.startsWith("mailto:") || normalized.startsWith("/")) {
    return normalized;
  }

  return `/${normalized.replace(/^public\//, "")}`;
}

export const siteConfig = {
  name: "Mohammad",
  role: "Computer Science Student / AI Systems Builder",
  identity: [
    "Computer Science Student",
    "AI Systems Builder",
    "Creative Technologist",
    "Interactive Developer",
    "Technical Product Thinker"
  ],
  positioning:
    "I build AI-assisted systems, interactive experiences, and product-oriented technical workflows.",
  intro:
    "Computer Science student focused on AI systems, interactive interfaces, and practical product workflows. I care about explainability, implementation details, and interfaces that help people reason through systems.",
  email: process.env.NEXT_PUBLIC_CONTACT_EMAIL ?? "hello@mohammad.dev",
  linkedinUrl:
    process.env.NEXT_PUBLIC_LINKEDIN_URL ??
    "https://www.linkedin.com/",
  resumeUrl: publicAssetUrl(process.env.NEXT_PUBLIC_RESUME_URL, "/resume-mohammad.pdf")
} as const;

export const navigation = [
  { label: "Work", href: "#selected-work" },
  { label: "AI Systems", href: "#ai-systems" },
  { label: "Product", href: "#product-work" },
  { label: "GitHub", href: "#github" },
  { label: "Notes", href: "#notes" },
  { label: "Contact", href: "#contact" }
] as const;
