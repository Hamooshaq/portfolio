export const productWork = [
  {
    title: "Wessky",
    role: "CTO / Technical & Creative Direction",
    focus:
      "Brand system thinking, digital presence direction, and interaction strategy for a sharper web identity.",
    details: [
      "Translate brand direction into interface decisions.",
      "Explore technical feasibility for web interactions.",
      "Balance visual identity with implementation constraints."
    ]
  },
  {
    title: "Kopi Rute",
    role: "CTO / Technical & Creative Direction",
    focus:
      "Cafe product direction combining brand mood, route-based storytelling, and practical digital experience planning.",
    details: [
      "Shape customer-facing web concepts.",
      "Connect brand narrative with product flows.",
      "Think through newsletter, content, and lightweight operational touchpoints."
    ]
  }
] as const;

export const notes = [
  {
    title: "Why explainability matters in prototypes",
    body:
      "A prototype is easier to evaluate when each decision can be inspected. In the forecasting repository, machine learning is kept inside the demand model while inventory and reorder decisions stay explicit."
  },
  {
    title: "Outputs explain systems faster than folders",
    body:
      "Source code is the evidence, but the portfolio should show behavior: dashboards, predictions, charts, errors, decisions, and the parts of the system a user would actually touch."
  },
  {
    title: "Interfaces should reveal system state",
    body:
      "The most useful dashboard is not the one with the most charts. It is the one that shows what changed, why it changed, and what action the user can reasonably take next."
  },
  {
    title: "Heavy artifacts should not become the website",
    body:
      "Datasets, checkpoints, virtual environments, and raw training folders stay out of the frontend. Only processed previews and small result artifacts belong in the experience."
  }
] as const;
