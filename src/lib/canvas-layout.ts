/** Matches Tailwind's `sm` breakpoint: below it the canvas uses the compact layout. */
export const COMPACT_VIEWPORT_MAX_WIDTH_PX = 640;

/** Gap between cards inside an expanded collection; mirrors DEFAULT_FAN_CONFIG. */
const EXPANDED_GAP_PX = 18;

export interface SwagLayout {
  columns: number;
  expandedScale: number;
  imageHeight: number;
  itemSize: number;
}

/**
 * Everything about the canvas that depends on the screen it is shown on.
 * Desktop keeps the original wide, multi-column reveals. The compact layout
 * reveals one column at a time and slides the camera onto it, because a
 * phone cannot show a card, its siblings and the cover at once.
 */
export interface CanvasLayout {
  /** Space kept around content when the camera moves to reveal it. */
  autoPanMargin: number;
  compact: boolean;
  /** Width of the fun-project description cards. */
  funContentWidth: number;
  /** Cards per row when a folder opens. */
  stackColumns: number;
  swag: SwagLayout;
}

export const DESKTOP_CANVAS_LAYOUT: CanvasLayout = {
  autoPanMargin: 40,
  compact: false,
  funContentWidth: 680,
  stackColumns: 3,
  swag: {
    columns: 6,
    expandedScale: 1.05,
    imageHeight: 120,
    itemSize: 180,
  },
};

const COMPACT_MARGIN_PX = 16;
const COMPACT_SWAG_COLUMNS = 2;
const MIN_COMPACT_SWAG_ITEM_SIZE = 100;
const SWAG_IMAGE_ASPECT =
  DESKTOP_CANVAS_LAYOUT.swag.imageHeight / DESKTOP_CANVAS_LAYOUT.swag.itemSize;

export const isCompactViewport = (viewportWidth: number) =>
  viewportWidth < COMPACT_VIEWPORT_MAX_WIDTH_PX;

export const getCanvasLayout = (viewportWidth: number): CanvasLayout => {
  if (!isCompactViewport(viewportWidth)) {
    return DESKTOP_CANVAS_LAYOUT;
  }
  const available = viewportWidth - COMPACT_MARGIN_PX * 2;
  const { expandedScale, itemSize: desktopItemSize } =
    DESKTOP_CANVAS_LAYOUT.swag;
  // Two scaled swag columns and the gap between them must fit the screen.
  const itemSize = Math.floor(
    Math.min(
      desktopItemSize,
      Math.max(
        MIN_COMPACT_SWAG_ITEM_SIZE,
        (available - EXPANDED_GAP_PX) / (COMPACT_SWAG_COLUMNS * expandedScale)
      )
    )
  );
  return {
    autoPanMargin: COMPACT_MARGIN_PX,
    compact: true,
    funContentWidth: Math.min(DESKTOP_CANVAS_LAYOUT.funContentWidth, available),
    stackColumns: 1,
    swag: {
      columns: COMPACT_SWAG_COLUMNS,
      expandedScale,
      imageHeight: Math.round(itemSize * SWAG_IMAGE_ASPECT),
      itemSize,
    },
  };
};
