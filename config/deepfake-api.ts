export const deepfakeApiConfig = {
  spaceId: process.env.NEXT_PUBLIC_DEEPFAKE_SPACE_ID?.trim() || "hamooshaq/deepfake-detection",
  apiName: "/ui_predict"
} as const;
