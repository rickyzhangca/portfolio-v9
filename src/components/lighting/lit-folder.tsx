import { useAtomValue } from "jotai";
import { useEffect, useRef, useState } from "react";
import { deskLampAtom } from "@/context/atoms";
import { FOLDER_SHAPE_SIZE } from "@/lib/folder-shape";
import type {
  BoardGlow,
  CoverLogoFinish,
  FolderMaterial,
} from "@/cards/registry";
import type { FolderLogo } from "./folder-renderer";
import { runLitSurface } from "./lit-surface";

interface FolderLightingProps {
  /** Coloured light pooled in the board, brightened by the lamp. */
  glows?: BoardGlow[];
  /** A logo printed or stamped on the board, given relief by the lamp. */
  logo?: {
    finish: CoverLogoFinish;
    rect: FolderLogo["rect"];
    src: string;
  };
  material: FolderMaterial;
  /** Papers inside the folder right now; zero while they are laid out. */
  papers: number;
  /**
   * The board's own colour, as a hex string, for materials whose reflection
   * takes it (metal, glass). White when absent.
   */
  tint?: string;
}

/**
 * How far the papers inside push the front panel up, in local px: an empty
 * folder lies almost flat, and each sheet adds a little, up to a ceiling.
 */
const EMPTY_BULGE = 0.6;
const BULGE_PER_PAPER = 0.9;
const MAX_BULGE = 6;
/** How quickly the panel follows its contents, per second. */
const BULGE_RATE = 7;

/**
 * Foil is stamped slightly proud and mirrors the lamp in its own colour;
 * hot foil is metal leaf pressed into the board, deep gold until it catches
 * the lamp; a deboss presses the mark's light parts into the board while its
 * dark parts stay level with it; glass catches a tight highlight and lights
 * up in its own colour as the lamp nears; print is ink, nearly flat and
 * matte.
 */
const LOGO_FINISHES: Record<CoverLogoFinish, FolderLogo["finish"]> = {
  deboss: {
    glow: 0,
    gloss: 0.04,
    lightness: 1,
    metal: 0,
    relief: -1.5,
    shininess: 10,
    tint: 0,
  },
  foil: {
    glow: 0,
    gloss: 0.55,
    lightness: 0,
    metal: 0,
    relief: 0.45,
    shininess: 60,
    tint: 1,
  },
  glass: {
    glow: 0.9,
    gloss: 0.45,
    lightness: 0,
    metal: 0,
    relief: 0.6,
    shininess: 140,
    tint: 0.4,
  },
  "hot-foil": {
    glow: 0,
    gloss: 0,
    lightness: 0,
    metal: 1,
    relief: -0.4,
    shininess: 1,
    tint: 1,
  },
  print: {
    glow: 0,
    gloss: 0.06,
    lightness: 0,
    metal: 0,
    relief: 0.08,
    shininess: 10,
    tint: 0,
  },
};

const bulgeFor = (papers: number) =>
  papers > 0 ? Math.min(MAX_BULGE, 2 + papers * BULGE_PER_PAPER) : EMPTY_BULGE;

/**
 * Lights a folder's front panel with WebGPU: its material, the rounded cut
 * edge of the board and the bulge of the papers inside. It must sit inside
 * the cover's masked container, which clips it to the outline and isolates
 * its blend modes to the cover.
 */
const LitFolder = ({
  glows,
  logo,
  material,
  papers,
  tint,
}: FolderLightingProps) => {
  const shadeRef = useRef<HTMLCanvasElement | null>(null);
  const lightRef = useRef<HTMLCanvasElement | null>(null);
  const [isReady, setReady] = useState(false);
  const targetBulgeRef = useRef(bulgeFor(papers));
  const logoSrc = logo?.src;
  const logoFinish = logo?.finish;
  const logoRect = logo?.rect;

  useEffect(() => {
    targetBulgeRef.current = bulgeFor(papers);
  }, [papers]);

  useEffect(() => {
    const shade = shadeRef.current;
    const light = lightRef.current;
    const element = shade?.parentElement;
    if (!(shade && light && element)) {
      return;
    }
    const size = {
      height: element.offsetHeight || FOLDER_SHAPE_SIZE.height,
      width: element.offsetWidth || FOLDER_SHAPE_SIZE.width,
    };
    const seed = { x: Math.random() * 400, y: Math.random() * 400 };
    // The panel eases toward its contents: it sinks as the papers leave and
    // swells as they slide back in.
    let bulge = targetBulgeRef.current;

    return runLitSurface({
      attach: async (signal) => {
        const { attachFolder } = await import("./folder-renderer");
        return attachFolder(
          shade,
          light,
          size,
          logoSrc && logoFinish && logoRect
            ? {
                finish: LOGO_FINISHES[logoFinish],
                rect: logoRect,
                src: logoSrc,
              }
            : null,
          material,
          glows ?? [],
          signal
        );
      },
      draw: (surface, { height, intensity, light: lamp, pixelScale, width }) =>
        surface.render({
          bulge,
          height,
          intensity,
          light: lamp,
          pixelHeight: Math.round(height * pixelScale),
          pixelWidth: Math.round(width * pixelScale),
          seed,
          tint,
          width,
        }),
      element,
      // The shade and light canvases both cover the folder.
      canvases: 2,
      label: "Folder lighting",
      // Board relief and sheen are soft: half resolution while the lamp sweeps
      // keeps every cover relit each frame; full detail returns as it slows.
      motionScale: 0.5,
      onReady: () => setReady(true),
      step: (elapsed) => {
        bulge +=
          (targetBulgeRef.current - bulge) *
          (1 - Math.exp(-elapsed * BULGE_RATE));
        // Redraw in quarter-pixel steps: finer changes do not show, and a
        // folder whose papers fly out would otherwise redraw every frame.
        return [Math.round(bulge * 4) / 4];
      },
    });
  }, [glows, logoFinish, logoRect, logoSrc, material, tint]);

  const style = { opacity: isReady ? 1 : 0 };
  return (
    <>
      <canvas
        className="pointer-events-none absolute inset-0 z-10 h-full w-full mix-blend-multiply"
        ref={shadeRef}
        style={style}
      />
      <canvas
        className="pointer-events-none absolute inset-0 z-10 h-full w-full mix-blend-screen"
        ref={lightRef}
        style={style}
      />
    </>
  );
};

/** Folder material and relief, drawn only while the desk lamp is on. */
export const FolderLighting = (props: FolderLightingProps) => {
  const isLampOn = useAtomValue(deskLampAtom);
  return isLampOn ? <LitFolder {...props} /> : null;
};
