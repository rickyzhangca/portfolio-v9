import { useAtomValue } from "jotai";
import { useEffect, useRef, useState } from "react";
import { deskLampAtom } from "@/context/atoms";
import { runLitSurface } from "./lit-surface";
import type { PaperTexture } from "./paper-renderer";

/**
 * smooth: clean writing paper (resume, about); fibre: a fibrous sheet
 * (article cards); sticky: a thin, slightly crumpled sticky note; photo: a
 * glossy print (project screenshots); label: a small paper label.
 */
type PaperKind = "fibre" | "label" | "photo" | "smooth" | "sticky";

interface PaperLightingProps {
  /**
   * Mostly hidden, as a print tucked in a closed folder: relit only once the
   * lamp has moved well away, so it does not take turns from paper in view.
   */
  covered?: boolean;
  /** Hides the shading while the paper morphs into or out of a reader. */
  hidden?: boolean;
  kind: PaperKind;
  /** Corner radius of the paper, in its own CSS px. */
  radius: number;
}

const MAX_CURL_LIFT = 14;
/**
 * Room past the paper's edges for the curl's shadow, in its own CSS px: the
 * shader caps its reach at 1.6x the lift, plus its softness (1 + 0.6x).
 */
const SHADOW_MARGIN = Math.ceil(MAX_CURL_LIFT * 2.2 + 1);
/** Scales every texture layer; the layers' own heights live in the shader. */
const RELIEF = 1;

interface PaperStock {
  /** "corner" curls one corner; "foot" lifts the bottom edge. */
  curl: "corner" | "foot";
  /** Curl height range for a 240 px sheet, in local px. */
  curlLift: readonly [number, number];
  /** Share of the sheet the curl spans. */
  curlShare: readonly [number, number];
  gloss: number;
  /** Whether to draw the multiplied shading (grain, curl and its shadow). */
  shade: boolean;
  texture: PaperTexture;
}

const PAPER_STOCKS: Record<PaperKind, PaperStock> = {
  fibre: {
    curl: "corner",
    curlLift: [8, MAX_CURL_LIFT],
    curlShare: [0.3, 0.45],
    gloss: 0,
    shade: true,
    texture: { fibres: 1, pulp: 0.7, wrinkles: 0.25 },
  },
  label: {
    curl: "corner",
    curlLift: [8, 12],
    curlShare: [0.45, 0.6],
    gloss: 0,
    shade: true,
    texture: { fibres: 0.3, pulp: 0.9, wrinkles: 0 },
  },
  // Coated prints are stiff and smooth: what they show under a lamp is their
  // gloss, so they skip the shading pass, one canvas each instead of two. A
  // folder of 14 prints opens at once, and every canvas costs a present.
  photo: {
    curl: "corner",
    curlLift: [2, 4],
    curlShare: [0.25, 0.35],
    gloss: 1,
    shade: false,
    texture: { fibres: 0, pulp: 0, wrinkles: 0 },
  },
  smooth: {
    curl: "corner",
    curlLift: [8, MAX_CURL_LIFT],
    curlShare: [0.3, 0.45],
    gloss: 0,
    shade: true,
    texture: { fibres: 0.4, pulp: 0.8, wrinkles: 0 },
  },
  sticky: {
    curl: "foot",
    curlLift: [6, 10],
    curlShare: [0.28, 0.38],
    gloss: 0,
    shade: true,
    texture: { fibres: 0.2, pulp: 0.5, wrinkles: 0.45 },
  },
};

/** Share of a covered paper that shows past whatever covers it. */
const COVERED_PROMINENCE = 0.2;

/** Curl heights are tuned for a 240 px sheet; smaller paper curls less. */
const CURL_REFERENCE_SIZE = 240;
const MIN_CURL_SCALE = 0.12;

// Which corner of a sheet curls, weighted toward the lower right, where a
// right hand leaves a page.
const SHEET_CORNERS = [
  { weight: 0.45, x: 1, y: 1 },
  { weight: 0.25, x: 0, y: 1 },
  { weight: 0.2, x: 1, y: 0 },
  { weight: 0.1, x: 0, y: 0 },
];

const pickCorner = (roll: number) => {
  let remaining = roll;
  for (const corner of SHEET_CORNERS) {
    remaining -= corner.weight;
    if (remaining <= 0) {
      return corner;
    }
  }
  return SHEET_CORNERS[0];
};

const between = (min: number, max: number) => min + Math.random() * (max - min);

/**
 * Lights a paper's grain and curl under the desk lamp with WebGPU. The canvas
 * is multiplied over its parent, which must be an isolated group containing
 * the paper and its text, so the shading lands on the ink as well.
 */
const LitPaper = ({
  covered = false,
  hidden = false,
  kind,
  radius,
}: PaperLightingProps) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const coveredRef = useRef(covered);
  const glossRef = useRef<HTMLCanvasElement | null>(null);
  const [isReady, setReady] = useState(false);
  const stock = PAPER_STOCKS[kind];

  useEffect(() => {
    coveredRef.current = covered;
  }, [covered]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const gloss = glossRef.current;
    const element = (canvas ?? gloss)?.parentElement;
    if (!element) {
      return;
    }
    // Each sheet lies a little differently.
    const seed = { x: between(0, 400), y: between(0, 400) };
    const corner = pickCorner(Math.random());
    const curlShare = between(...stock.curlShare);
    const curlScale = Math.min(
      1,
      Math.max(
        MIN_CURL_SCALE,
        Math.min(element.offsetWidth, element.offsetHeight) /
          CURL_REFERENCE_SIZE
      )
    );
    const curlLift = between(...stock.curlLift) * curlScale;

    return runLitSurface({
      attach: async (signal) => {
        const { attachPaper } = await import("./paper-renderer");
        return attachPaper(canvas, gloss, signal);
      },
      draw: (surface, { height, intensity, light, pixelScale, width }) =>
        surface.render({
          curl: curlLift,
          curlCorner: { x: corner.x * width, y: corner.y * height },
          curlRadius:
            curlShare *
            (stock.curl === "foot" ? height : Math.min(width, height)),
          gloss: stock.gloss,
          height,
          intensity,
          kind: stock.curl === "foot" ? "sticky" : "sheet",
          light,
          margin: SHADOW_MARGIN,
          pixelHeight: Math.round((height + SHADOW_MARGIN * 2) * pixelScale),
          pixelWidth: Math.round((width + SHADOW_MARGIN * 2) * pixelScale),
          radius,
          relief: RELIEF,
          seed,
          texture: stock.texture,
          width,
        }),
      element,
      label: "Paper lighting",
      // Grain, curl and gloss are soft: half resolution while the lamp sweeps
      // keeps every sheet's shadow with it, and the text stays DOM-sharp.
      motionScale: 0.5,
      onReady: () => setReady(true),
      overhang: SHADOW_MARGIN,
      prominence: () => (coveredRef.current ? COVERED_PROMINENCE : 1),
    });
  }, [radius, stock]);

  const visible = isReady && !hidden;
  const style = {
    height: `calc(100% + ${SHADOW_MARGIN * 2}px)`,
    left: -SHADOW_MARGIN,
    opacity: visible ? 1 : 0,
    top: -SHADOW_MARGIN,
    // Vanish at once when the paper starts to move; return after it lands.
    transition: visible ? "opacity 0.3s ease-out 0.35s" : "none",
    width: `calc(100% + ${SHADOW_MARGIN * 2}px)`,
  };
  return (
    <>
      {stock.shade ? (
        <canvas
          className="pointer-events-none absolute z-10 mix-blend-multiply"
          ref={canvasRef}
          style={style}
        />
      ) : null}
      {stock.gloss > 0 ? (
        <canvas
          className="pointer-events-none absolute z-10 mix-blend-screen"
          ref={glossRef}
          style={style}
        />
      ) : null}
    </>
  );
};

/** Paper grain and curl, drawn only while the desk lamp is on. */
export const PaperLighting = (props: PaperLightingProps) => {
  const isLampOn = useAtomValue(deskLampAtom);
  return isLampOn ? <LitPaper {...props} /> : null;
};
