import { atom } from "jotai";
import { DEFAULT_FAN_CONFIG, type FanConfig } from "@/lib/fan";
import {
  DEFAULT_REPULSION_CONFIG,
  type RepulsionConfig,
} from "@/lib/repulsion";
import {
  getLocalDecimalHour,
  getShadowLighting,
  type ShadowLightingMode,
} from "@/lib/shadow-lighting";

export const repulsionConfigAtom = atom<RepulsionConfig>({
  ...DEFAULT_REPULSION_CONFIG,
});

export const fanConfigAtom = atom<FanConfig>({
  ...DEFAULT_FAN_CONFIG,
});

export const shadowDebugConfigAtom = atom<{
  mode: ShadowLightingMode;
  debugHour: number;
}>({
  mode: "live",
  debugHour: 12,
});

export const shadowClockHourAtom = atom(getLocalDecimalHour());

export const shadowLightingAtom = atom((get) => {
  const { mode, debugHour } = get(shadowDebugConfigAtom);
  const liveHour = get(shadowClockHourAtom);
  const hour = mode === "debug" ? debugHour : liveHour;

  return getShadowLighting(hour, mode);
});
