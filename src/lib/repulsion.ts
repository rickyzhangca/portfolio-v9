import type { CardGroupData, Position } from "@/types/canvas";

export interface RepulsionConfig {
  /**
   * Screen-space radius (px). Converted to world-space using the current zoom `scale`
   * so the effect looks consistent at different zoom levels.
   */
  radiusPx: number;
  /** Screen-space max push (px at `scale === 1`). */
  strengthPx: number;
}

export const DEFAULT_REPULSION_CONFIG: RepulsionConfig = {
  radiusPx: 1400,
  strengthPx: 200,
};

const clamp01 = (value: number) => Math.max(0, Math.min(1, value));

const getCoverCenter = (group: CardGroupData): Position => {
  const cover = group.cover ?? group.projects[0];
  return {
    x: group.position.x + (cover?.size.width ?? 0) / 2,
    y: group.position.y + (cover?.size.height ?? 360) / 2,
  };
};

/**
 * Computes per-group translation offsets so non-expanded groups are pushed away
 * from the expanded group's cover card.
 */
export const computeRepulsionOffsets = (
  groups: Map<string, CardGroupData>,
  expandedGroupId: string | null,
  scale: number,
  config: Partial<RepulsionConfig> = {}
): Map<string, Position> => {
  if (!expandedGroupId) {
    return new Map();
  }

  const expanded = groups.get(expandedGroupId);
  if (!expanded) {
    return new Map();
  }

  const safeScale = Number.isFinite(scale) && scale > 0 ? scale : 1;
  const radiusWorld =
    (config.radiusPx ?? DEFAULT_REPULSION_CONFIG.radiusPx) / safeScale;
  const strengthWorld =
    (config.strengthPx ?? DEFAULT_REPULSION_CONFIG.strengthPx) / safeScale;

  const source = getCoverCenter(expanded);
  const offsets = new Map<string, Position>();

  for (const group of groups.values()) {
    if (group.id === expandedGroupId) {
      offsets.set(group.id, { x: 0, y: 0 });
      continue;
    }

    const target = getCoverCenter(group);
    const dx = target.x - source.x;
    const dy = target.y - source.y;
    const dist = Math.hypot(dx, dy);

    if (dist < 0.001) {
      offsets.set(group.id, { x: strengthWorld, y: 0 });
      continue;
    }

    const t = clamp01(dist / radiusWorld);
    const magnitude = strengthWorld * (1 - t);

    offsets.set(group.id, {
      x: (dx / dist) * magnitude,
      y: (dy / dist) * magnitude,
    });
  }

  return offsets;
};
