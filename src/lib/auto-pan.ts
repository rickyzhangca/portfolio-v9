import type { FanConfig } from "@/lib/fan";
import { getRotatedBoundingBox, getOffsets } from "@/lib/card-layout";
import type { CardData, CardGroupData, ViewportState } from "@/types/canvas";

export const AUTO_PAN_MARGIN = 40;
export const AUTO_PAN_DURATION_MS = 350;

interface BoundingBox {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

interface VisibleViewport {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

/**
 * Calculate the bounding box of expanded group content.
 * Uses getOffsets() with expanded=true to get fan positions,
 * accounts for card rotations, and includes fallback height.
 */
const getExpandedBoundingBox = (
  cover: CardData | undefined,
  projects: CardData[],
  fanConfig: FanConfig
): BoundingBox => {
  const offsets = getOffsets(cover, projects, true, fanConfig);

  // Start with cover card bounds
  let minX = 0;
  let minY = 0;
  let maxX = cover?.size.width ?? 0;
  let maxY = cover?.size.height ?? 360;

  // Calculate bounds for each project card at its fanned offset
  for (let i = 0; i < projects.length; i++) {
    const card = projects[i];
    if (!card) continue;

    const offset = offsets[i];
    const cardHeight = card.size.height ?? 360;

    // For expanded cards, calculate rotation based on position in row
    // Row 0: first 3 cards get 0.5, 1.0, 1.5 deg rotation
    // Row 1: next 3 cards get 0.5, 1.0, 1.5 deg rotation, etc.
    const rowIndex = Math.floor(i / 3);
    const colIndex = i % 3;
    const rotationDeg = (colIndex + 1) * fanConfig.rotateStepDeg;

    const { width: bboxWidth, height: bboxHeight } = getRotatedBoundingBox(
      card.size.width,
      cardHeight,
      rotationDeg
    );

    const cardMinX = offset.x;
    const cardMinY = offset.y;
    const cardMaxX = offset.x + bboxWidth;
    const cardMaxY = offset.y + bboxHeight;

    minX = Math.min(minX, cardMinX);
    minY = Math.min(minY, cardMinY);
    maxX = Math.max(maxX, cardMaxX);
    maxY = Math.max(maxY, cardMaxY);
  }

  return { minX, minY, maxX, maxY };
};

/**
 * Convert screen bounds to canvas coordinates.
 * Formula: canvasX = (screenX - positionX) / scale
 */
const getVisibleViewport = (
  viewportState: ViewportState,
  windowWidth: number,
  windowHeight: number
): VisibleViewport => {
  const { positionX, positionY, scale } = viewportState;

  const minX = (0 - positionX) / scale;
  const minY = (0 - positionY) / scale;
  const maxX = (windowWidth - positionX) / scale;
  const maxY = (windowHeight - positionY) / scale;

  return { minX, minY, maxX, maxY };
};

/**
 * Check if expanded content exceeds the visible viewport.
 * Returns true if content overflows on any edge.
 */
const doesExpandedContentOverflow = (
  groupPosition: { x: number; y: number },
  expandedBbox: BoundingBox,
  visibleViewport: VisibleViewport
): boolean => {
  const contentMinX = groupPosition.x + expandedBbox.minX;
  const contentMinY = groupPosition.y + expandedBbox.minY;
  const contentMaxX = groupPosition.x + expandedBbox.maxX;
  const contentMaxY = groupPosition.y + expandedBbox.maxY;

  return (
    contentMinX < visibleViewport.minX ||
    contentMinY < visibleViewport.minY ||
    contentMaxX > visibleViewport.maxX ||
    contentMaxY > visibleViewport.maxY
  );
};

/**
 * Calculate new positionX/Y to place group at margin from viewport origin.
 * Formula: newPositionX = margin - groupPosition.x * scale
 */
const calculateAutoPanTransform = (
  groupPosition: { x: number; y: number },
  currentScale: number,
  margin: number
): { x: number; y: number } => {
  return {
    x: margin - groupPosition.x * currentScale,
    y: margin - groupPosition.y * currentScale,
  };
};

/**
 * Main function that determines if auto-pan is needed and returns target transform.
 * Returns null if no pan needed, otherwise target transform {x, y, scale}.
 */
export const getAutoPanTarget = (
  group: CardGroupData,
  fanConfig: FanConfig,
  viewportState: ViewportState,
  windowWidth: number,
  windowHeight: number
): { x: number; y: number; scale: number } | null => {
  // Calculate bounding box of expanded content
  const expandedBbox = getExpandedBoundingBox(
    group.cover,
    group.projects,
    fanConfig
  );

  // Get current visible viewport in canvas coordinates
  const visibleViewport = getVisibleViewport(
    viewportState,
    windowWidth,
    windowHeight
  );

  // Check if expanded content would overflow
  if (
    !doesExpandedContentOverflow(
      group.position,
      expandedBbox,
      visibleViewport
    )
  ) {
    return null; // Content fits, no pan needed
  }

  // Calculate auto-pan transform
  const { x, y } = calculateAutoPanTransform(
    group.position,
    viewportState.scale,
    AUTO_PAN_MARGIN
  );

  return {
    x,
    y,
    scale: viewportState.scale,
  };
};
