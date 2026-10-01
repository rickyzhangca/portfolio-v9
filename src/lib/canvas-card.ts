import type { CanvasItem } from "@/types/canvas";

export function getCanvasCard(item: CanvasItem, cardId?: string) {
  if (item.kind === "single" || item.kind === "funstack") {
    return !cardId || item.card.id === cardId ? item.card : undefined;
  }
  if (item.cover.id === cardId) {
    return item.cover;
  }
  if (item.kind === "stack") {
    return item.stack.find((card) => card.id === cardId);
  }
}
