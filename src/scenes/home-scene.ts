import type { CanvasItem } from "@/types/canvas";
import { companyStacks } from "./data/companies";
import { singleItems } from "./data/single-items";

// The Thoughts writing stack in ./data/writing stays out of the canvas until it returns.
export const initialItems: CanvasItem[] = [...companyStacks, ...singleItems];
