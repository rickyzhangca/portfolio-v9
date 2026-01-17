import { atom } from "jotai";
import { DEFAULT_REPULSION_CONFIG, type RepulsionConfig } from "@/lib/repulsion";

export const repulsionConfigAtom = atom<RepulsionConfig>({
  ...DEFAULT_REPULSION_CONFIG,
});
