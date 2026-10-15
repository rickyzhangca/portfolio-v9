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

const FOLDER_FLOATS = 20;
/** Logo texels per local px: crisp at the camera's closest zoom. */
const LOGO_DENSITY = 3;
/** Transparent margin around the outline, so its blur fades to nothing. */
const SHAPE_MARGIN = 64;
/** Coverage texels per local px. */
const SHAPE_DENSITY = 2;
/** Blur radii (standard deviations) of the outline, in local px. */
const BEVEL_BLUR = 1.5;
const BULGE_BLUR = 18;

export type FolderMaterial = "board" | "cardstock";

/** The logo on a folder's board and how it is applied. */
export interface FolderLogo {
  /** Raised height in local px, gloss, shininess and colour tint (0 to 1). */
  finish: { gloss: number; relief: number; shininess: number; tint: number };
  rect: { height: number; width: number; x: number; y: number };
  src: string;
}

export interface FolderFrame {
  bulge: number;
  height: number;
  intensity: number;
  light: { x: number; y: number; z: number };
  material: FolderMaterial;
  pixelHeight: number;
  pixelWidth: number;
  seed: { x: number; y: number };
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
  signal: AbortSignal
): Promise<FolderSurface> => {
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
  if (signal.aborted) {
    outline.destroy();
    logoTexture.destroy();
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
    },
    render: (frame) => {
      for (const { bindGroup, buffer, canvas, context, pass } of passes) {
        data.set([
          frame.width,
          frame.height,
          frame.intensity,
          frame.material === "cardstock" ? 0 : 1,
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
