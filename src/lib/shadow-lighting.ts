export type ShadowLightingMode = "live" | "debug";

export interface ShadowLightingState {
  mode: ShadowLightingMode;
  hour: number;
  angleDeg: number;
  intensity: number;
  offsetScale: number;
  blurScale: number;
}

const HOUR_MS = 60 * 60 * 1000;
const FULL_DAY_HOURS = 24;
const MINUTES_PER_HOUR = 60;

const normalizeHour = (hour: number) => {
  const normalized = hour % FULL_DAY_HOURS;
  return normalized < 0 ? normalized + FULL_DAY_HOURS : normalized;
};

export const getLocalDecimalHour = (date = new Date()) =>
  date.getHours() +
  date.getMinutes() / MINUTES_PER_HOUR +
  date.getSeconds() / (MINUTES_PER_HOUR * MINUTES_PER_HOUR);

export const getShadowLighting = (
  hour: number,
  mode: ShadowLightingMode
): ShadowLightingState => {
  const normalizedHour = normalizeHour(hour);
  const daylight = (Math.cos(((normalizedHour - 12) / 12) * Math.PI) + 1) / 2;
  const lateral = Math.sin(((normalizedHour - 12) / 12) * Math.PI);

  return {
    mode,
    hour: normalizedHour,
    angleDeg: 90 - lateral * 80,
    intensity: 0.8 + daylight * 0.6 + Math.abs(lateral) * 1.5,
    offsetScale: 0.5 + Math.abs(lateral) * 4.0 + (1 - daylight) * 0.5,
    blurScale: 0.5 + Math.abs(lateral) + (1 - daylight) * 0.5,
  };
};

export const formatShadowHour = (hour: number) => {
  const normalizedHour = normalizeHour(hour);
  const baseDate = new Date(HOUR_MS * 12);
  baseDate.setUTCHours(
    Math.floor(normalizedHour),
    Math.round((normalizedHour % 1) * MINUTES_PER_HOUR),
    0,
    0
  );

  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: "UTC",
  }).format(baseDate);
};
