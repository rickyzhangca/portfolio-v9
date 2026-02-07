import type { CardInstance } from "@/cards/types";
import { getOffsets, getRotatedBoundingBox } from "@/lib/card-layout";
import type { FanConfig } from "@/lib/fan";
import type {
  CanvasFunStackItem,
  CanvasStackItem,
  CanvasSwagStackItem,
  ViewportState,
} from "@/types/canvas";

export const AUTO_PAN_MARGIN = 40;
export const AUTO_PAN_DURATION_MS = 360;
export const AUTO_PAN_EASING = "easeInOutCubic";

// Keep this in sync with `src/components/groups/fun-project-group.tsx`.
const CONTENT_WIDTH = 680;
const CONTENT_GAP = 24;
// Keep these in sync with `src/components/groups/fun-project-group.tsx`.
const FUN_STACK_CONTENT_CARD_HEIGHT = 120;
const FUN_STACK_VERTICAL_GAP = 16;

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
 * Calculate the bounding box of expanded stack content.
 * Uses getOffsets() with expanded=true to get fan positions,
 * accounts for card rotations, and includes fallback height.
 */
const getExpandedBoundingBox = (
  cover: CardInstance | undefined,
  stack: CardInstance[],
  fanConfig: FanConfig
): BoundingBox => {
  const offsets = getOffsets(cover, stack, true, fanConfig);

  // Start with cover card bounds
  let minX = 0;
  let minY = 0;
  let maxX = cover?.size.width ?? 0;
  let maxY = cover?.size.height ?? 360;

  // Calculate bounds for each stack card at its fanned offset
  for (let i = 0; i < stack.length; i++) {
    const card = stack[i];
    if (!card) {
      continue;
    }

    const offset = offsets[i];
    const cardHeight = card.size.height ?? 360;
    const cardWidth = card.size.width ?? 350;

    // For expanded cards, calculate rotation based on position in row
    // Row 0: first 3 cards get 0.5, 1.0, 1.5 deg rotation
    // Row 1: next 3 cards get 0.5, 1.0, 1.5 deg rotation, etc.
    const colIndex = i % 3;
    const rotationDeg = (colIndex + 1) * fanConfig.rotateStepDeg;

    const { width: bboxWidth, height: bboxHeight } = getRotatedBoundingBox(
      cardWidth,
      cardHeight,
      rotationDeg
    );

    // Account for fanArcY offset applied to each card in card-group.tsx
    // Formula: (colInRow + 1) ** 2 * fanConfig.arcStepPx
    const fanArcY = (colIndex + 1) ** 2 * fanConfig.arcStepPx;

    const cardMinX = offset.x;
    const cardMinY = offset.y;
    const cardMaxX = offset.x + bboxWidth;
    const cardMaxY = offset.y + fanArcY + bboxHeight;

    minX = Math.min(minX, cardMinX);
    minY = Math.min(minY, cardMinY);
    maxX = Math.max(maxX, cardMaxX);
    maxY = Math.max(maxY, cardMaxY);
  }

  return { minX, minY, maxX, maxY };
};

/**
 * Calculate the bounding box of expanded fun stack content.
 * Includes the card + gap + content panel width.
 */
const getFunStackExpandedBoundingBox = (
  cardWidth: number,
  cardHeight: number,
  itemsCount: number
): BoundingBox => {
  const listHeight =
    itemsCount > 0
      ? itemsCount * FUN_STACK_CONTENT_CARD_HEIGHT +
        (itemsCount - 1) * FUN_STACK_VERTICAL_GAP
      : 0;

  return {
    minX: 0,
    minY: 0,
    maxX: cardWidth + CONTENT_GAP + CONTENT_WIDTH,
    // Content cards fly out to the right and stack vertically starting at y=0.
    maxY: Math.max(cardHeight, listHeight),
  };
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
  const contentCenterX =
    groupPosition.x + (expandedBbox.minX + expandedBbox.maxX) / 2;
  const contentCenterY =
    groupPosition.y + (expandedBbox.minY + expandedBbox.maxY) / 2;

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
  stack: CanvasStackItem,
  fanConfig: FanConfig,
  viewportState: ViewportState,
  windowWidth: number,
  windowHeight: number
): { x: number; y: number; scale: number } | null => {
  // Calculate bounding box of expanded content
  const expandedBbox = getExpandedBoundingBox(
    stack.cover,
    stack.stack,
    fanConfig
  );

  // Get current visible viewport in canvas coordinates
  const visibleViewport = getVisibleViewport(
    viewportState,
    windowWidth,
    windowHeight
  );

  if (
    !doesExpandedContentOverflow(stack.position, expandedBbox, visibleViewport)
  ) {
    return null; // Content fits, no pan needed
  }

  const canCenter = canCenterContent(
    expandedBbox,
    viewportState.scale,
    windowWidth,
    windowHeight,
    AUTO_PAN_MARGIN
  );

  // Calculate both potential transforms
  const marginTransform = calculateMarginTransform(
    stack.position,
    viewportState.scale,
    AUTO_PAN_MARGIN
  );

  const centeredTransform = calculateCenteredTransform(
    stack.position,
    expandedBbox,
    viewportState.scale,
    windowWidth,
    windowHeight
  );

  // Use centered transform for axes that fit, margin transform for axes that don't
  const result = {
    x: canCenter.horizontal ? centeredTransform.x : marginTransform.x,
    y: canCenter.vertical ? centeredTransform.y : marginTransform.y,
    scale: viewportState.scale,
  };

  return result;
};

/**
 * Auto-pan helper for fun project stack.
 * Similar to getAutoPanTarget but accounts for the card + right-side content panel.
 */
export const getFunStackAutoPanTarget = (
  funStack: CanvasFunStackItem,
  viewportState: ViewportState,
  windowWidth: number,
  windowHeight: number
): { x: number; y: number; scale: number } | null => {
  const cardWidth = funStack.card.size.width ?? 240;
  const cardHeight = funStack.card.size.height ?? 360;

  // Calculate bounding box of expanded content (card + gap + content panel)
  const expandedBbox = getFunStackExpandedBoundingBox(
    cardWidth,
    cardHeight,
    funStack.card.content.items.length
  );

  // Get current visible viewport in canvas coordinates
  const visibleViewport = getVisibleViewport(
    viewportState,
    windowWidth,
    windowHeight
  );

  if (
    !doesExpandedContentOverflow(
      funStack.position,
      expandedBbox,
      visibleViewport
    )
  ) {
    return null; // Content fits, no pan needed
  }

  const canCenter = canCenterContent(
    expandedBbox,
    viewportState.scale,
    windowWidth,
    windowHeight,
    AUTO_PAN_MARGIN
  );

  // Calculate both potential transforms
  const marginTransform = calculateMarginTransform(
    funStack.position,
    viewportState.scale,
    AUTO_PAN_MARGIN
  );

  const centeredTransform = calculateCenteredTransform(
    funStack.position,
    expandedBbox,
    viewportState.scale,
    windowWidth,
    windowHeight
  );

  // If horizontal space is insufficient, prefer a stable "reading" layout:
  // pin the expanded content to the top-left (with margin), even if it could be
  // vertically centered.
  const result = {
    x: canCenter.horizontal ? centeredTransform.x : marginTransform.x,
    y:
      canCenter.horizontal && canCenter.vertical
        ? centeredTransform.y
        : marginTransform.y,
    scale: viewportState.scale,
  };

  return result;
};

/**
 * Calculate bounding box for expanded swag stack content.
 * Includes the cover + gap + swag grid.
 */
const getSwagStackExpandedBoundingBox = (
  coverWidth: number,
  swagCount: number,
  gridCols: number,
  swagItemSize: number,
  gridGap: number
): BoundingBox => {
  const rows = Math.ceil(swagCount / gridCols);
  const totalWidth = coverWidth + 40 + gridCols * (swagItemSize + gridGap);
  // Height: items + gaps between rows (last row has no trailing gap)
  const totalHeight = rows * swagItemSize + Math.max(0, rows - 1) * gridGap;

  return {
    minX: 0,
    minY: 0,
    maxX: totalWidth,
    maxY: totalHeight,
  };
};

/**
 * Auto-pan helper for swag stack.
 * Similar to other stacks but accounts for the swag grid layout.
 */
export const getSwagStackAutoPanTarget = (
  swagStack: CanvasSwagStackItem,
  viewportState: ViewportState,
  windowWidth: number,
  windowHeight: number,
  options?: {
    gridCols?: number;
    swagItemSize?: number;
    gridGap?: number;
  }
): { x: number; y: number; scale: number } | null => {
  const coverWidth = swagStack.cover.size.width ?? 240;
  const gridCols = options?.gridCols ?? 6;
  const swagItemSize = options?.swagItemSize ?? 180;
  const gridGap = options?.gridGap ?? 16;

  const expandedBbox = getSwagStackExpandedBoundingBox(
    coverWidth,
    swagStack.swags.length,
    gridCols,
    swagItemSize,
    gridGap
  );

  // Get current visible viewport in canvas coordinates
  const visibleViewport = getVisibleViewport(
    viewportState,
    windowWidth,
    windowHeight
  );

  if (
    !doesExpandedContentOverflow(
      swagStack.position,
      expandedBbox,
      visibleViewport
    )
  ) {
    return null;
  }

  const canCenter = canCenterContent(
    expandedBbox,
    viewportState.scale,
    windowWidth,
    windowHeight,
    AUTO_PAN_MARGIN
  );

  const marginTransform = calculateMarginTransform(
    swagStack.position,
    viewportState.scale,
    AUTO_PAN_MARGIN
  );

  const centeredTransform = calculateCenteredTransform(
    swagStack.position,
    expandedBbox,
    viewportState.scale,
    windowWidth,
    windowHeight
  );

  const result = {
    x: canCenter.horizontal ? centeredTransform.x : marginTransform.x,
    y:
      canCenter.horizontal && canCenter.vertical
        ? centeredTransform.y
        : marginTransform.y,
    scale: viewportState.scale,
  };

  return result;
};
