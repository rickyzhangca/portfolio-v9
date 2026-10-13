import type { SwagItem } from "@/types/canvas";

export const SWAG_TRIGGER_CLASS = "cursor-help border-0 bg-transparent p-0";

export const SwagImage = ({ swag }: { swag: SwagItem }) => (
  <img
    alt={swag.label}
    className="aspect-3/2 w-full object-contain"
    decoding="async"
    height={120}
    loading="lazy"
    src={swag.src}
    width={180}
  />
);

/**
 * Stands in for the tooltip trigger while its module loads, with the same
 * markup, so collapsed swag renders without waiting for tooltip positioning.
 */
export const SwagImageButton = ({ swag }: { swag: SwagItem }) => (
  <button className={SWAG_TRIGGER_CLASS} type="button">
    <SwagImage swag={swag} />
  </button>
);
