import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./config/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}"
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-sans)", "Inter", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "Inter", "system-ui", "sans-serif"]
      },
      colors: {
        void: "#050507",
        ember: "#f6a650",
        signal: "#7df9ff",
        ion: "#b57cff",
        moss: "#93f5b0"
      },
      boxShadow: {
        "signal-glow": "0 0 40px rgba(125, 249, 255, 0.24)"
      },
      keyframes: {
        grain: {
          "0%, 100%": { transform: "translate3d(0, 0, 0)" },
          "20%": { transform: "translate3d(-1%, 1%, 0)" },
          "40%": { transform: "translate3d(1%, -1%, 0)" },
          "60%": { transform: "translate3d(-1%, -1%, 0)" },
          "80%": { transform: "translate3d(1%, 1%, 0)" }
        },
        scan: {
          "0%": { transform: "translateY(-100%)" },
          "100%": { transform: "translateY(100%)" }
        }
      },
      animation: {
        grain: "grain 9s steps(8) infinite",
        scan: "scan 6s linear infinite"
      }
    }
  },
  plugins: []
};

export default config;
