import { createContext, useContext } from "react";

export interface ItemEntrance {
  /** Milliseconds after the scene's wave starts that this item begins to rise. */
  delayMs: number;
  /** False while the scene waits for its first view to be ready. */
  started: boolean;
}

/**
 * Each canvas item's place in the scene's entrance. Outside a canvas, items
 * behave as if the wave started as they mounted.
 */
export const ItemEntranceContext = createContext<ItemEntrance>({
  delayMs: 0,
  started: true,
});

export const useItemEntrance = () => useContext(ItemEntranceContext);
