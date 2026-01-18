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
const calculateMarginTransform = (
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
 * Calculate new positionX/Y to center the group content within the viewport.
 * Centers the bounding box of the expanded content in the viewport.
 */
const calculateCenteredTransform = (
  groupPosition: { x: number; y: number },
  expandedBbox: BoundingBox,
  currentScale: number,
  windowWidth: number,
  windowHeight: number
): { x: number; y: number } => {
  // Calculate the center of the expanded content in canvas coordinates
  const contentCenterX = groupPosition.x + (expandedBbox.minX + expandedBbox.maxX) / 2;
  const contentCenterY = groupPosition.y + (expandedBbox.minY + expandedBbox.maxY) / 2;

  // Calculate the position that would center this content in the viewport
  // Formula: screenCenter = contentCenter * scale + positionX
  // So: positionX = screenCenter - contentCenter * scale
  return {
    x: windowWidth / 2 - contentCenterX * currentScale,
    y: windowHeight / 2 - contentCenterY * currentScale,
  };
};

/**
 * Check if the expanded content can be centered within the viewport.
 * Returns true if the content width and height fit within the viewport (minus margins).
 */
const canCenterContent = (
  expandedBbox: BoundingBox,
  currentScale: number,
  windowWidth: number,
  windowHeight: number,
  margin: number
): { horizontal: boolean; vertical: boolean } => {
  const contentWidth = (expandedBbox.maxX - expandedBbox.minX) * currentScale;
  const contentHeight = (expandedBbox.maxY - expandedBbox.minY) * currentScale;
  const availableWidth = windowWidth - margin * 2;
  const availableHeight = windowHeight - margin * 2;

  return {
    horizontal: contentWidth <= availableWidth,
    vertical: contentHeight <= availableHeight,
  };
};

/**
 * Main function that determines if auto-pan is needed and returns target transform.
 * Returns null if no pan needed, otherwise target transform {x, y, scale}.
 *
 * Strategy:
 * - If the expanded content fits within the viewport, center it
 * - If it doesn't fit, use "best effort" positioning at the margin
 * - Applies centering logic independently for horizontal and vertical axes
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

  // Check which axes can be centered
  const canCenter = canCenterContent(
    expandedBbox,
    viewportState.scale,
    windowWidth,
    windowHeight,
    AUTO_PAN_MARGIN
  );

  // Calculate both potential transforms
  const marginTransform = calculateMarginTransform(
    group.position,
    viewportState.scale,
    AUTO_PAN_MARGIN
  );

  const centeredTransform = calculateCenteredTransform(
    group.position,
    expandedBbox,
    viewportState.scale,
    windowWidth,
    windowHeight
  );

  // Use centered transform for axes that fit, margin transform for axes that don't
  return {
    x: canCenter.horizontal ? centeredTransform.x : marginTransform.x,
    y: canCenter.vertical ? centeredTransform.y : marginTransform.y,
    scale: viewportState.scale,
  };
};
