export const crowdApiConfig = {
  spaceId: process.env.NEXT_PUBLIC_CROWD_SPACE_ID?.trim() || "hamooshaq/crowd-detection",
  apiName: "/run_prediction"
} as const;
