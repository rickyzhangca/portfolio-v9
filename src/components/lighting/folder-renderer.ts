import type { BoardGlow, FolderMaterial } from "@/cards/registry";
import { FOLDER_SHAPE_PATH, FOLDER_SHAPE_SIZE } from "@/lib/folder-shape";
import shaderSource from "./folder-shader.wgsl?raw";
import {
  cachePerDevice,
  compileShader,
  configureCanvas,
  createMipmappedTexture,
  createQuadPipeline,
  drawQuad,
  TEXTURE_USAGE,
  UNIFORM_USAGE,
} from "./gpu";

const FOLDER_FLOATS = 40;
/** Logo texels per local px: crisp at the camera's closest zoom. */
const LOGO_DENSITY = 3;
/** Transparent margin around the outline, so its blur fades to nothing. */
const SHAPE_MARGIN = 64;
/** Coverage texels per local px. */
const SHAPE_DENSITY = 2;
/** Blur radii (standard deviations) of the outline, in local px. */
const BEVEL_BLUR = 1.5;
const BULGE_BLUR = 18;
/** Glow texels per local px: the glows are smooth gradients. */
const GLOW_DENSITY = 0.5;
/** How brightly the board's glows answer the lamp. */
const GLOW_RESPONSE = 1.4;
/** Seam texels per local px: the thread is about a pixel wide. */
const SEAM_DENSITY = 3;
/** A leather folder's stitching: inset from the edge, in local px. */
const SEAM = { dash: 3.4, gap: 2.2, groove: 2.6, inset: 9, thread: 1.2 };

/**
 * How each material meets the lamp. `surface` picks its fine relief in the
 * shader. Lobes are [shininess, strength] of a wide sheen and a tighter
 * highlight; `tint` is how much of the board's colour they take. The rim is
 * the rounded cut edge: its height, catch-light, and for glass the glint of
 * light leaving the far edge (`rimBack`). `sparkle` is metal's grain
 * glinting.
 */
interface MaterialLook {
  broad: readonly [number, number];
  /** Relief shading strength, and the panel's tone with no relief. */
  shade: readonly [number, number];
  sharp: readonly [number, number];
  rim: { back?: number; height: number; strength: number };
  sparkle?: number;
  surface: number;
  tint?: number;
}

const MATERIALS: Record<FolderMaterial, MaterialLook> = {
  // Pressed pulp: matte, its fibres show under raking light.
  cardstock: {
    broad: [5, 0.03],
    rim: { height: 1, strength: 0.1 },
    shade: [1.3, 0.97],
    sharp: [1, 0],
    surface: 0,
  },
  // Soft-touch silicone: a thick, rounded edge and a wide, velvety sheen that
  // never resolves into a highlight; light spreads into it a little.
  silicone: {
    broad: [18, 0.2],
    rim: { height: 1.8, strength: 0.09 },
    shade: [0.65, 0.985],
    sharp: [60, 0.04],
    surface: 1,
  },
  // Bead-blasted anodised metal: a grain too fine to see as more than a
  // faint shimmer, a wide, soft sheen without a hot spot, and a bright,
  // crisp diamond-cut chamfer, which is what reads as metal.
  "frosted-metal": {
    broad: [10, 0.16],
    rim: { height: 0.7, strength: 0.5 },
    shade: [0.8, 0.96],
    sharp: [30, 0.04],
    sparkle: 0.1,
    surface: 2,
    tint: 0.35,
  },
  // Glass: a clear, polished face that keeps only a faint sheen, and
  // edges that flash on both sides, where light enters and leaves.
  glass: {
    broad: [7, 0.03],
    rim: { back: 0.3, height: 1.1, strength: 0.55 },
    shade: [1.1, 0.94],
    sharp: [1, 0],
    surface: 3,
    tint: 0.3,
  },
  // Fine pebbled leather: a soft waxy sheen broken by its grain, and a
  // stitched seam around the edge.
  leather: {
    broad: [9, 0.07],
    rim: { height: 1.4, strength: 0.12 },
    shade: [1.2, 0.97],
    sharp: [30, 0.03],
    surface: 4,
  },
  // Kraft paperboard, as packaging is made of: coarse pulp with loose
  // fibres and flecks. Matte, so the lamp shows its texture rather than a
  // reflection.
  kraft: {
    broad: [4, 0.06],
    rim: { height: 1, strength: 0.12 },
    shade: [1.4, 0.97],
    sharp: [1, 0],
    surface: 5,
  },
};

const HEX_COLOR = /^#([\da-f]{2})([\da-f]{2})([\da-f]{2})$/i;

const hexToRgb = (hex: string | undefined) => {
  const match = hex?.match(HEX_COLOR);
  if (!match) {
    return [1, 1, 1];
  }
  const rgb = match.slice(1).map((channel) => Number.parseInt(channel, 16));
  // Only its hue and saturation: the reflection keeps the lamp's brightness.
  const peak = Math.max(...rgb, 1);
  return rgb.map((channel) => channel / peak);
};

/** The logo on a folder's board and how it is applied. */
export interface FolderLogo {
  /**
   * How brightly it lights up in its own colour as the lamp nears, raised
   * height in local px, gloss, shininess and colour tint (0 to 1).
   */
  finish: {
    glow: number;
    gloss: number;
    relief: number;
    shininess: number;
    tint: number;
  };
  rect: { height: number; width: number; x: number; y: number };
  src: string;
}

export interface FolderFrame {
  bulge: number;
  height: number;
  intensity: number;
  light: { x: number; y: number; z: number };
  pixelHeight: number;
  pixelWidth: number;
  seed: { x: number; y: number };
  /** The board's colour as hex, taken by tinted materials. */
  tint?: string;
  width: number;
}

// The logo artwork as a texture, drawn from its SVG at LOGO_DENSITY.
const rasterizeLogo = async (logo: FolderLogo) => {
  const image = new Image();
  image.src = logo.src;
  await image.decode();
  const canvas = new OffscreenCanvas(
    Math.ceil(logo.rect.width * LOGO_DENSITY),
    Math.ceil(logo.rect.height * LOGO_DENSITY)
  );
  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("No 2D context for the folder logo");
  }
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  return createImageBitmap(canvas, {
    colorSpaceConversion: "none",
    premultiplyAlpha: "premultiply",
  });
};

const createBlankTexture = (device: GPUDevice) =>
  device.createTexture({
    format: "rgba8unorm",
    size: [1, 1],
    usage: TEXTURE_USAGE,
  });

export interface FolderSurface {
  destroy: () => void;
  render: (frame: FolderFrame) => void;
}

const getPipeline = cachePerDevice(async (gpu) => ({
  pipeline: createQuadPipeline(
    gpu,
    await compileShader(gpu.device, shaderSource)
  ),
  sampler: gpu.device.createSampler({
    magFilter: "linear",
    minFilter: "linear",
    mipmapFilter: "linear",
  }),
}));

// The same outline the cover's CSS mask uses, rasterized as coverage three
// times into separate channels: sharp (red), slightly blurred for the rounded
// edge (green) and widely blurred for the bulge (blue). Canvas blurs are true
// Gaussians; blurring by mip level instead left stepped, blocky relief.
const rasterizeOutline = (size: { height: number; width: number }) => {
  const canvas = new OffscreenCanvas(
    Math.ceil((size.width + SHAPE_MARGIN * 2) * SHAPE_DENSITY),
    Math.ceil((size.height + SHAPE_MARGIN * 2) * SHAPE_DENSITY)
  );
  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("No 2D context for the folder outline");
  }
  context.scale(SHAPE_DENSITY, SHAPE_DENSITY);
  context.translate(SHAPE_MARGIN, SHAPE_MARGIN);
  context.scale(
    size.width / FOLDER_SHAPE_SIZE.width,
    size.height / FOLDER_SHAPE_SIZE.height
  );
  const outline = new Path2D(FOLDER_SHAPE_PATH);
  context.globalCompositeOperation = "lighter";
  for (const [color, blur] of [
    ["#f00", 0],
    ["#0f0", BEVEL_BLUR],
    ["#00f", BULGE_BLUR],
  ] as const) {
    // Filter lengths are bitmap pixels; the current transform does not
    // scale them.
    context.filter = blur ? `blur(${blur * SHAPE_DENSITY}px)` : "none";
    context.fillStyle = color;
    context.fill(outline);
  }
  return createImageBitmap(canvas, {
    colorSpaceConversion: "none",
    premultiplyAlpha: "premultiply",
  });
};

// The board's glows as a texture covering the board, drawn as the CSS
// background draws them (getBoardGlowGradients): bottom layer first. Each
// fades to its own colour at zero alpha, as CSS interpolates to transparent.
const rasterizeGlows = (
  size: { height: number; width: number },
  glows: readonly BoardGlow[]
) => {
  const canvas = new OffscreenCanvas(
    Math.ceil(size.width * GLOW_DENSITY),
    Math.ceil(size.height * GLOW_DENSITY)
  );
  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("No 2D context for the folder glows");
  }
  for (const { at, color, size: radius } of [...glows].reverse()) {
    context.setTransform(
      radius.x * canvas.width,
      0,
      0,
      radius.y * canvas.height,
      at.x * canvas.width,
      at.y * canvas.height
    );
    const gradient = context.createRadialGradient(0, 0, 0, 0, 0, 1);
    gradient.addColorStop(0, color);
    gradient.addColorStop(1, `${color}00`);
    context.fillStyle = gradient;
    context.fillRect(-1, -1, 2, 2);
  }
  return createImageBitmap(canvas, {
    colorSpaceConversion: "none",
    premultiplyAlpha: "premultiply",
  });
};

// A stitched seam following the outline at SEAM.inset: dashes of thread (red)
// lying in a pressed groove (green). Each is the band between two strokes of
// the outline, clipped inside it; the dashed strokes share their pattern, so
// the band keeps only the dashes.
const rasterizeSeam = (size: { height: number; width: number }) => {
  const canvas = new OffscreenCanvas(
    Math.ceil((size.width + SHAPE_MARGIN * 2) * SEAM_DENSITY),
    Math.ceil((size.height + SHAPE_MARGIN * 2) * SEAM_DENSITY)
  );
  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("No 2D context for the folder seam");
  }
  context.scale(SEAM_DENSITY, SEAM_DENSITY);
  context.translate(SHAPE_MARGIN, SHAPE_MARGIN);
  context.scale(
    size.width / FOLDER_SHAPE_SIZE.width,
    size.height / FOLDER_SHAPE_SIZE.height
  );
  // Line widths and dashes are set in the folder's own units.
  const unit = FOLDER_SHAPE_SIZE.width / size.width;
  const outline = new Path2D(FOLDER_SHAPE_PATH);
  context.clip(outline);
  const band = (color: string, width: number, dash: number[], blur: number) => {
    const layer = new OffscreenCanvas(canvas.width, canvas.height);
    const layerContext = layer.getContext("2d");
    if (!layerContext) {
      throw new Error("No 2D context for the folder seam");
    }
    layerContext.setTransform(context.getTransform());
    layerContext.setLineDash(dash.map((length) => length * unit));
    layerContext.strokeStyle = color;
    layerContext.lineWidth = (SEAM.inset * 2 + width) * unit;
    layerContext.stroke(outline);
    layerContext.globalCompositeOperation = "destination-out";
    layerContext.lineWidth = (SEAM.inset * 2 - width) * unit;
    layerContext.stroke(outline);
    context.save();
    context.resetTransform();
    context.globalCompositeOperation = "lighter";
    context.filter = `blur(${blur * SEAM_DENSITY}px)`;
    context.drawImage(layer, 0, 0);
    context.restore();
  };
  band("#0f0", SEAM.groove, [], 0.8);
  band("#f00", SEAM.thread, [SEAM.dash, SEAM.gap], 0.35);
  return createImageBitmap(canvas, {
    colorSpaceConversion: "none",
    premultiplyAlpha: "premultiply",
  });
};

/**
 * Prepares the two canvases over one folder cover: `shadeCanvas` is
 * multiplied over it and `lightCanvas` screened over it. Contexts are
 * configured only once nothing can cancel the attachment.
 */
export const attachFolder = async (
  shadeCanvas: HTMLCanvasElement,
  lightCanvas: HTMLCanvasElement,
  size: { height: number; width: number },
  logo: FolderLogo | null,
  material: FolderMaterial,
  glows: readonly BoardGlow[],
  signal: AbortSignal
): Promise<FolderSurface> => {
  const look = MATERIALS[material];
  const {
    gpu,
    value: { pipeline, sampler },
  } = await getPipeline();
  const outline = await createMipmappedTexture(
    gpu.device,
    await rasterizeOutline(size)
  );
  const logoTexture = logo
    ? await createMipmappedTexture(gpu.device, await rasterizeLogo(logo))
    : createBlankTexture(gpu.device);
  const seam =
    material === "leather"
      ? await createMipmappedTexture(gpu.device, await rasterizeSeam(size))
      : createBlankTexture(gpu.device);
  const glowTexture =
    glows.length > 0
      ? await createMipmappedTexture(
          gpu.device,
          await rasterizeGlows(size, glows)
        )
      : createBlankTexture(gpu.device);
  if (signal.aborted) {
    outline.destroy();
    logoTexture.destroy();
    seam.destroy();
    glowTexture.destroy();
    signal.throwIfAborted();
  }

  const passes = [shadeCanvas, lightCanvas].map((canvas, pass) => {
    const buffer = gpu.device.createBuffer({
      size: FOLDER_FLOATS * 4,
      usage: UNIFORM_USAGE,
    });
    return {
      bindGroup: gpu.device.createBindGroup({
        entries: [
          { binding: 0, resource: { buffer } },
          { binding: 1, resource: outline.createView() },
          { binding: 2, resource: sampler },
          { binding: 3, resource: logoTexture.createView() },
          { binding: 4, resource: seam.createView() },
          { binding: 5, resource: glowTexture.createView() },
        ],
        layout: pipeline.getBindGroupLayout(0),
      }),
      buffer,
      canvas,
      context: configureCanvas(canvas, gpu),
      pass,
    };
  });
  const data = new Float32Array(FOLDER_FLOATS);

  return {
    destroy: () => {
      for (const { buffer, context } of passes) {
        context.unconfigure();
        buffer.destroy();
      }
      outline.destroy();
      logoTexture.destroy();
      seam.destroy();
      glowTexture.destroy();
    },
    render: (frame) => {
      const tint = hexToRgb(frame.tint);
      for (const { bindGroup, buffer, canvas, context, pass } of passes) {
        data.set([
          frame.width,
          frame.height,
          frame.intensity,
          look.surface,
          frame.light.x,
          frame.light.y,
          frame.light.z,
          SHAPE_MARGIN,
          frame.seed.x,
          frame.seed.y,
          frame.bulge,
          pass,
          logo?.rect.x ?? 0,
          logo?.rect.y ?? 0,
          logo?.rect.width ?? 0,
          logo?.rect.height ?? 0,
          logo?.finish.relief ?? 0,
          logo?.finish.gloss ?? 0,
          logo?.finish.shininess ?? 1,
          logo?.finish.tint ?? 0,
          ...tint,
          look.tint ?? 0,
          ...look.broad,
          ...look.sharp,
          ...look.shade,
          look.rim.height,
          look.rim.strength,
          look.rim.back ?? 0,
          look.sparkle ?? 0,
          0,
          0,
          glows.length > 0 ? GLOW_RESPONSE : 0,
          logo?.finish.glow ?? 0,
          0,
          0,
        ]);
        gpu.device.queue.writeBuffer(buffer, 0, data);
        drawQuad(gpu, canvas, context, pipeline, bindGroup, {
          height: frame.pixelHeight,
          width: frame.pixelWidth,
        });
      }
    },
  };
};
