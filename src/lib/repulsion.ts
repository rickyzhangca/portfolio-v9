import type { CanvasItem, Position } from "@/types/canvas";

export interface RepulsionConfig {
  /**
   * Canvas/world-space radius (px at `scale === 1`).
   *
   * Important: this is intentionally *not* scaled by the viewport zoom. Zooming
   * should change what you see, not the underlying layout/repulsion.
   */
  radiusPx: number;
  /** Canvas/world-space max push (px at `scale === 1`). */
  strengthPx: number;
}

export const DEFAULT_REPULSION_CONFIG: RepulsionConfig = {
  radiusPx: 1400,
  strengthPx: 200,
};

const clamp01 = (value: number) => Math.max(0, Math.min(1, value));

const getItemCenter = (item: CanvasItem): Position => {
  if (item.kind === "single") {
    const card = item.card;
    return {
      x: item.position.x + (card?.size.width ?? 0) / 2,
      y: item.position.y + (card?.size.height ?? 360) / 2,
    };
  }
  // Stack item
  const cover = item.cover;
  return {
    x: item.position.x + (cover?.size.width ?? 0) / 2,
    y: item.position.y + (cover?.size.height ?? 360) / 2,
  };
};

/**
 * Computes per-item translation offsets so non-expanded items are pushed away
 * from the expanded stack's cover card or the active doc item.
 */
export const computeRepulsionOffsets = (
  items: Map<string, CanvasItem>,
  sourceItemId: string | null,
  config: Partial<RepulsionConfig> = {}
): Map<string, Position> => {
  if (!sourceItemId) {
    return new Map();
  }

  const source = items.get(sourceItemId);
  if (!source) {
    return new Map();
  }

  const radiusWorld = config.radiusPx ?? DEFAULT_REPULSION_CONFIG.radiusPx;
  const strengthWorld =
    config.strengthPx ?? DEFAULT_REPULSION_CONFIG.strengthPx;

  const sourceCenter = getItemCenter(source);
  const offsets = new Map<string, Position>();

  for (const item of items.values()) {
    if (item.id === sourceItemId) {
      offsets.set(item.id, { x: 0, y: 0 });
      continue;
    }

    const target = getItemCenter(item);
    const dx = target.x - sourceCenter.x;
    const dy = target.y - sourceCenter.y;
    const dist = Math.hypot(dx, dy);

    if (dist < 0.001) {
      offsets.set(item.id, { x: strengthWorld, y: 0 });
      continue;
    }

    const t = clamp01(dist / radiusWorld);
    const magnitude = strengthWorld * (1 - t);

    offsets.set(item.id, {
      x: (dx / dist) * magnitude,
      y: (dy / dist) * magnitude,
    });
  }

  return offsets;
};
