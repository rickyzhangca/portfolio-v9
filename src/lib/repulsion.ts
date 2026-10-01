import { getExpandedStackLayout, getStackPage } from "@/lib/card-layout";
import type { FanConfig } from "@/lib/fan";
import type { CanvasItem, CanvasStackItem, Position } from "@/types/canvas";

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

export interface RepulsionSource {
  center: Position;
  itemId: string;
}

interface StackCardRepulsionOptions {
  cardId: string;
  config?: Partial<RepulsionConfig>;
  fanConfig: FanConfig;
  page?: number;
  stack: CanvasStackItem;
}

export const DEFAULT_REPULSION_CONFIG: RepulsionConfig = {
  radiusPx: 1400,
  strengthPx: 300,
};

const clamp01 = (value: number) => Math.max(0, Math.min(1, value));

const getItemCenter = (item: CanvasItem): Position => {
  if (item.kind === "single") {
    const { card } = item;
    return {
      x: item.position.x + (card.size.width ?? 0) / 2,
      y: item.position.y + (card.size.height ?? 360) / 2,
    };
  }
  if (item.kind === "funstack") {
    const { card } = item;
    return {
      x: item.position.x + (card.size.width ?? 240) / 2,
      y: item.position.y + (card.size.height ?? 360) / 2,
    };
  }
  // Stack item
  const { cover } = item;
  return {
    x: item.position.x + (cover.size.width ?? 0) / 2,
    y: item.position.y + (cover.size.height ?? 360) / 2,
  };
};

function getRepulsionOffset(
  source: Position,
  target: Position,
  config: Partial<RepulsionConfig>
): Position {
  const radius = config.radiusPx ?? DEFAULT_REPULSION_CONFIG.radiusPx;
  const strength = config.strengthPx ?? DEFAULT_REPULSION_CONFIG.strengthPx;
  const dx = target.x - source.x;
  const dy = target.y - source.y;
  const distance = Math.hypot(dx, dy);
  if (distance < 0.001) {
    return { x: strength, y: 0 };
  }
  const magnitude = strength * (1 - clamp01(distance / radius));
  return {
    x: (dx / distance) * magnitude,
    y: (dy / distance) * magnitude,
  };
}

/** Push items from a cover/single card, or an explicit nested-card center. */
export const computeRepulsionOffsets = (
  items: Map<string, CanvasItem>,
  source: string | RepulsionSource | null,
  config: Partial<RepulsionConfig> = {}
): Map<string, Position> => {
  if (!source) {
    return new Map();
  }

  const sourceItemId = typeof source === "string" ? source : source.itemId;
  const sourceItem = items.get(sourceItemId);
  if (!sourceItem) {
    return new Map();
  }

  const sourceCenter =
    typeof source === "string" ? getItemCenter(sourceItem) : source.center;
  const offsets = new Map<string, Position>();

  for (const item of items.values()) {
    if (item.id === sourceItemId) {
      offsets.set(item.id, { x: 0, y: 0 });
      continue;
    }

    offsets.set(
      item.id,
      getRepulsionOffset(sourceCenter, getItemCenter(item), config)
    );
  }

  return offsets;
};

/** Only the visible page participates; the active card stays fixed for layoutId. */
export function computeStackCardRepulsion({
  stack,
  cardId,
  fanConfig,
  page = 0,
  config = {},
}: StackCardRepulsionOptions) {
  const { cards } = getStackPage(stack, page);
  const { placements } = getExpandedStackLayout(stack.cover, cards, fanConfig);
  const centers = new Map<string, Position>();
  for (const { card, x, y, rotate } of placements) {
    const angle = (rotate * Math.PI) / 180;
    const halfWidth = (card.size.width ?? 350) / 2;
    const halfHeight = (card.size.height ?? 360) / 2;
    centers.set(card.id, {
      x:
        stack.position.x +
        x +
        halfWidth * Math.cos(angle) -
        halfHeight * Math.sin(angle),
      y:
        stack.position.y +
        y +
        halfWidth * Math.sin(angle) +
        halfHeight * Math.cos(angle),
    });
  }
  const center = centers.get(cardId);
  if (!center) {
    return null;
  }
  centers.set(stack.cover.id, getItemCenter(stack));
  const offsets = new Map<string, Position>();
  for (const [id, target] of centers) {
    offsets.set(
      id,
      id === cardId
        ? { x: 0, y: 0 }
        : getRepulsionOffset(center, target, config)
    );
  }
  return { offsets, source: { center, itemId: stack.id } };
}
