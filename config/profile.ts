import { siteConfig } from "@/config/site";

export const profile = {
  name: siteConfig.name,
  roles: siteConfig.identity,
  thesis: siteConfig.positioning,
  signal: siteConfig.role,
  personality: ["technical", "product-minded", "experimental", "implementation-focused"],
  contact: {
    label: "send a note",
    email: siteConfig.email,
    subject: "I saw your portfolio"
  }
} as const;
