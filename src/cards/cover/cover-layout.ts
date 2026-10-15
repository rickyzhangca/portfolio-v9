/**
 * Where a company folder's logo sits on its board, in CSS px. The DOM logo
 * and the lamp's relief of it (lit-folder) must agree.
 */
export const COVER_LOGO = { size: 84, x: 22, y: 22 } as const;

/** The logo's box on one board, after its optical balancing. */
export const getCoverLogoRect = (fit?: {
  scale?: number;
  x?: number;
  y?: number;
}) => {
  const size = COVER_LOGO.size * (fit?.scale ?? 1);
  return {
    height: size,
    width: size,
    x: COVER_LOGO.x + (fit?.x ?? 0),
    y: COVER_LOGO.y + (fit?.y ?? 0),
  };
};
