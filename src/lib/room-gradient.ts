import type { LampConfig } from "./lamp-config";

/**
 * The room's tone at each stop of the pool, as a share of its radius, at the
 * designed dimming: what the desk is multiplied by, so white leaves it lit.
 */
const ROOM_STOPS = [
  { at: 0, rgb: [255, 255, 252] },
  { at: 35, rgb: [252, 251, 247] },
  { at: 75, rgb: [230, 229, 225] },
  { at: 100, rgb: [215, 214, 210] },
] as const;

/**
 * One stop of the tone as a colour laid normally over the desk. A
 * mix-blend-mode over the whole page made the compositor render everything
 * under it into a pass of its own every frame the lamp moved, about a
 * sixteenth of the lamp's GPU time. Normal blending gives desk * (1 - alpha)
 * + colour, the same in every channel but for the colour, so the tone's
 * warmth, its spread between channels, cannot be multiplied in exactly.
 * Darkening by a third of the way from its darkest channel to its brightest,
 * and adding back half of what each channel stands above that, splits the
 * error evenly between white and black: at most a third of the spread, under
 * two levels at the designed dimming.
 */
const toOverlay = (tone: readonly number[]) => {
  const darkest = Math.min(...tone);
  const darken = (Math.max(...tone) + darkest * 2) / 3;
  const alpha = (255 - darken) / 255;
  if (alpha <= 0) {
    return "rgba(0, 0, 0, 0)";
  }
  const [red, green, blue] = tone.map((channel) =>
    Math.round(Math.max(0, channel - darken) / 2 / alpha)
  );
  return `rgba(${red}, ${green}, ${blue}, ${alpha.toFixed(3)})`;
};

/**
 * The dimmed room as a radial gradient centered at `center` (a CSS
 * position), laid over the desk with normal blending. `roomDim` scales each
 * stop's distance from white.
 */
export const getRoomGradient = (
  { poolRadiusPx, roomDim }: Pick<LampConfig, "poolRadiusPx" | "roomDim">,
  center: string
) => {
  const stops = ROOM_STOPS.map(({ at, rgb }) => {
    const tone = rgb.map((channel) =>
      Math.round(Math.max(0, 255 - (255 - channel) * roomDim))
    );
    return `${toOverlay(tone)} ${at}%`;
  });
  return `radial-gradient(circle ${poolRadiusPx}px at ${center}, ${stops.join(", ")})`;
};
