export const cinematicEase = [0.16, 1, 0.3, 1] as const;
export const heavyEase = [0.7, 0, 0.16, 1] as const;
export const liquidEase = [0.22, 1, 0.36, 1] as const;

export function staggeredDelay(index: number, base = 0.06, imperfection = 0.018) {
  const offset = Math.sin(index * 1.37) * imperfection;
  return index * base + offset;
}

export function inertia(value: number, resistance = 0.74) {
  return value * resistance;
}
