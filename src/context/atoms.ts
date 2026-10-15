import { atom } from "jotai";
import { DEFAULT_FAN_CONFIG, type FanConfig } from "@/lib/fan";
import {
  DEFAULT_REPULSION_CONFIG,
  type RepulsionConfig,
} from "@/lib/repulsion";

export const repulsionConfigAtom = atom<RepulsionConfig>({
  ...DEFAULT_REPULSION_CONFIG,
});

export const fanConfigAtom = atom<FanConfig>({
  ...DEFAULT_FAN_CONFIG,
});

/** Whether the desk lamp (WebGPU lighting) is switched on. */
export const deskLampAtom = atom(false);
