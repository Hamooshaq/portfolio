export interface LiveDeployment {
  id: "forecasting" | "deepfake" | "crowd";
  label: string;
  provider: "Render" | "Hugging Face Spaces";
  runtime: string;
  url: string | null;
  coldStartNote: string;
}

function externalUrl(value: string | undefined) {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

function externalUrlWithFallback(value: string | undefined, fallback: string) {
  return externalUrl(value) ?? fallback;
}

export const liveDeployments = {
  forecasting: {
    id: "forecasting",
    label: "Open Streamlit planner",
    provider: "Render",
    runtime: "Streamlit / Python",
    url: externalUrl(process.env.NEXT_PUBLIC_FORECASTING_APP_URL),
    coldStartNote: "Render free services can sleep after inactivity. First load may take a moment."
  },
  deepfake: {
    id: "deepfake",
    label: "Open deepfake detector",
    provider: "Hugging Face Spaces",
    runtime: "Gradio / PyTorch CPU",
    url: externalUrlWithFallback(
      process.env.NEXT_PUBLIC_DEEPFAKE_SPACE_URL,
      "https://hamooshaq-deepfake-detection.hf.space"
    ),
    coldStartNote: "The Space lazy-loads the checkpoint. Short videos work best on the free CPU tier."
  },
  crowd: {
    id: "crowd",
    label: "Open crowd counter",
    provider: "Hugging Face Spaces",
    runtime: "Gradio / PyTorch CPU",
    url: externalUrlWithFallback(
      process.env.NEXT_PUBLIC_CROWD_SPACE_URL,
      "https://hamooshaq-crowd-detection.hf.space"
    ),
    coldStartNote: "The Space loads model weights on first prediction. Medium-size images are recommended."
  }
} satisfies Record<string, LiveDeployment>;
