export interface ProjectArtifact {
  label: string;
  value: string;
}

export interface ProjectUniverse {
  id: "wessky" | "kopi-rute" | "not-alone" | "ai-experiments";
  name: string;
  type: string;
  intro: string;
  note: string;
  artifactTitle: string;
  snippet: string;
  debris: string[];
  artifacts: ProjectArtifact[];
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    paper: string;
  };
}

export const projects: ProjectUniverse[] = [
  {
    id: "wessky",
    name: "wessky.co",
    type: "brand / web / direction",
    intro: "This one wants to look a little rude. Clean, but not polite.",
    note: "I kept thinking about fashion pages, hard crop marks, and websites that refuse to explain themselves too much.",
    artifactTitle: "layout collision test",
    snippet: "grid-template-columns: 2fr .7fr 1.4fr;\nletter-spacing: -0.02em;\nif (tooSoft) cutHarder();",
    debris: ["MONO / 04", "crop left edge", "no friendly radius", "brand before comfort"],
    artifacts: [
      { label: "mood", value: "raw monochrome tension" },
      { label: "motion", value: "hard cuts, no floating" },
      { label: "question", value: "can a brand feel quiet and aggressive?" }
    ],
    colors: {
      primary: "#f4f1ea",
      secondary: "#101010",
      accent: "#c9c2b6",
      paper: "#e9e4d8"
    }
  },
  {
    id: "kopi-rute",
    name: "Kopi Rute",
    type: "cafe identity / route memory",
    intro: "A small coffee idea that kept turning into a map.",
    note: "Warm things are hard to design without making them cute. I wanted it to feel like the walk to a place you already miss.",
    artifactTitle: "route note",
    snippet: "origin: rainy street\nstop_03: bitter chocolate\nturn left after the orange lamp\narrive slowly",
    debris: ["07:42 PM", "steam path", "receipt ink", "don’t overclean it"],
    artifacts: [
      { label: "texture", value: "paper, grain, amber light" },
      { label: "system", value: "routes as brand memory" },
      { label: "feeling", value: "quiet, familiar, slightly late" }
    ],
    colors: {
      primary: "#f2b56e",
      secondary: "#2b190f",
      accent: "#f7d8a5",
      paper: "#c9874b"
    }
  },
  {
    id: "not-alone",
    name: "NOT ALONE",
    type: "emotional interface study",
    intro: "The point was not to impress anyone. It was to make an empty screen feel less empty.",
    note: "There is a kind of silence on the internet that feels louder than content. This project sits there for a while.",
    artifactTitle: "distance model",
    snippet: "if (message.length === 0) {\n  showTinyLight();\n  waitLongerThanComfortable();\n}",
    debris: ["no hero", "leave space", "distant light", "typing stopped"],
    artifacts: [
      { label: "pace", value: "slow enough to notice silence" },
      { label: "ui", value: "minimal marks, long pauses" },
      { label: "question", value: "can an interface sit with someone?" }
    ],
    colors: {
      primary: "#8aa7d9",
      secondary: "#080b17",
      accent: "#a78bc7",
      paper: "#172139"
    }
  },
  {
    id: "ai-experiments",
    name: "AI Experiments",
    type: "models / prototypes / broken toys",
    intro: "Some experiments are useful. Some are just weird enough to keep.",
    note: "I like when AI tools feel slightly unstable, like they are negotiating with the interface instead of sitting behind it.",
    artifactTitle: "unstable loop",
    snippet: "prompt -> sketch -> failure -> tweak\nlatent_noise += curiosity\nship when it starts answering back",
    debris: ["hallucination log", "latent sketch", "model said maybe", "keep the glitch"],
    artifacts: [
      { label: "material", value: "data fragments and bad guesses" },
      { label: "motion", value: "reactive, synthetic, uneven" },
      { label: "habit", value: "prototype before the idea gets too clean" }
    ],
    colors: {
      primary: "#9be7ef",
      secondary: "#07181d",
      accent: "#b8f39a",
      paper: "#12333a"
    }
  }
];
