import { isCompactViewport } from "@/lib/canvas-layout";
import type { CanvasItem } from "@/types/canvas";
import { createCompactScene } from "./compact-scene";
import { companyStacks } from "./data/companies";
import { singleItems } from "./data/single-items";
import { writingStack } from "./data/writing";

export const initialItems: CanvasItem[] = [
  ...companyStacks,
  ...singleItems,
  writingStack,
];

/** The scene for this screen; phones get a single reading column. */
export const getHomeScene = (viewportWidth: number): CanvasItem[] =>
  isCompactViewport(viewportWidth)
    ? createCompactScene(initialItems, viewportWidth)
    : initialItems;
