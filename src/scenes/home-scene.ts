import type { CanvasItem } from "@/types/canvas";
import { companyStacks } from "./data/companies";
import { singleItems } from "./data/single-items";

export const initialItems: CanvasItem[] = [...companyStacks, ...singleItems];
