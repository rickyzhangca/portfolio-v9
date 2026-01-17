import { atom } from "jotai";
import type { RepulsionConfig } from "@/lib/repulsion";

export const repulsionConfigAtom = atom<RepulsionConfig>({
  radiusPx: 900,
  strengthPx: 120,
});
