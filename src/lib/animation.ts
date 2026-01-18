export const SPRING_PRESETS = {
  snappy: { type: "spring", stiffness: 800, damping: 50, mass: 1 },
  smooth: { type: "spring", stiffness: 260, damping: 30, mass: 0.9 },
  quick: { type: "spring", stiffness: 400, damping: 35, mass: 0.8 },
} as const;

export const TRANSITIONS = {
  opacity: { duration: 0.18 },
  none: { type: "tween", duration: 0 },
} as const;
