import { createContext, useContext } from "react";
import { type CanvasLayout, DESKTOP_CANVAS_LAYOUT } from "@/lib/canvas-layout";

export interface CanvasEnvironment {
  /** Primary input is a finger: no hover, so hints must open on tap. */
  isCoarsePointer: boolean;
  layout: CanvasLayout;
}

export const CanvasEnvironmentContext = createContext<CanvasEnvironment>({
  isCoarsePointer: false,
  layout: DESKTOP_CANVAS_LAYOUT,
});

export const useCanvasEnvironment = () => useContext(CanvasEnvironmentContext);
