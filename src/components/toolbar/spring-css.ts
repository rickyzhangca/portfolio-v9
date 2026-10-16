/** Simulates a spring and packages it as a CSS `linear()` easing + duration. */
export const springCss = (stiffness: number, damping: number, mass = 1) => {
  const dt = 1 / 240;
  let x = 0;
  let v = 0;
  let t = 0;
  let settledAt = -1;
  const samples = [0];
  while (t < 8) {
    const a = (-stiffness * (x - 1) - damping * v) / mass;
    v += a * dt;
    x += v * dt;
    t += dt;
    samples.push(x);
    if (Math.abs(x - 1) < 1e-3 && Math.abs(v) < 0.02) {
      if (settledAt < 0) {
        settledAt = t;
      }
      if (t - settledAt >= 0.05) {
        break;
      }
    } else {
      settledAt = -1;
    }
  }
  const duration = settledAt > 0 ? settledAt : t;
  const n = Math.round(Math.min(80, Math.max(24, duration * 80)));
  const lastIdx = Math.min(samples.length - 1, duration / dt);
  const values: number[] = [];
  for (let i = 0; i <= n; i += 1) {
    const idx = Math.min(samples.length - 1, Math.round((i / n) * lastIdx));
    values.push(Math.round((samples[idx] ?? 1) * 1e4) / 1e4);
  }
  values[values.length - 1] = 1;
  const linear =
    typeof CSS !== "undefined" &&
    typeof CSS.supports === "function" &&
    CSS.supports("transition-timing-function", "linear(0, 1)");
  return {
    duration: Math.round(duration * 1000),
    easing: linear
      ? `linear(${values.join(", ")})`
      : "cubic-bezier(0.22, 1.5, 0.28, 1)",
  };
};

export const OPEN_SPRING = springCss(880, 32);
/** Critically damped, so the blob settles onto its button without bouncing. */
export const CLOSE_SPRING = springCss(500, 45);
/** Tooltip travel: as stiff as opening, damped harder so it overshoots less. */
export const TIP_SPRING = springCss(880, 46);
