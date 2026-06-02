export interface SkillNode {
  id: string;
  label: string;
  group: "intelligence" | "engineering" | "creative";
  orbit: number;
  weight: number;
}

export const skills: SkillNode[] = [
  { id: "ai", label: "AI", group: "intelligence", orbit: 0, weight: 1 },
  { id: "ml", label: "Machine Learning", group: "intelligence", orbit: 1, weight: 0.92 },
  { id: "python", label: "Python", group: "engineering", orbit: 2, weight: 0.86 },
  { id: "javascript", label: "JavaScript", group: "engineering", orbit: 3, weight: 0.9 },
  {
    id: "frontend",
    label: "Front-End Development",
    group: "engineering",
    orbit: 4,
    weight: 0.94
  },
  { id: "branding", label: "Branding", group: "creative", orbit: 5, weight: 0.88 },
  { id: "uiux", label: "UI/UX", group: "creative", orbit: 6, weight: 0.84 },
  {
    id: "storytelling",
    label: "Storytelling Design",
    group: "creative",
    orbit: 7,
    weight: 0.82
  }
];
