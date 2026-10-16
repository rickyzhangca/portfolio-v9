import type { LampConfig } from "./lamp-config";

/**
 * The room's tone at each stop of the pool, as a share of its radius, at the
 * designed dimming. It is multiplied over the desk, so white leaves it lit.
 */
const ROOM_STOPS = [
  { at: 0, rgb: [255, 255, 252] },
  { at: 35, rgb: [252, 251, 247] },
  { at: 75, rgb: [230, 229, 225] },
  { at: 100, rgb: [215, 214, 210] },
] as const;

/**
 * The dimmed room as a radial gradient centered at `center` (a CSS
 * position). `roomDim` scales each stop's distance from white.
 */
export const getRoomGradient = (
  { poolRadiusPx, roomDim }: Pick<LampConfig, "poolRadiusPx" | "roomDim">,
  center: string
) => {
  const stops = ROOM_STOPS.map(({ at, rgb }) => {
    const [red, green, blue] = rgb.map((channel) =>
      Math.round(Math.max(0, 255 - (255 - channel) * roomDim))
    );
    return `rgb(${red} ${green} ${blue}) ${at}%`;
  });
  return `radial-gradient(circle ${poolRadiusPx}px at ${center}, ${stops.join(", ")})`;
};
