import shaderSource from "./keycaps-shader.wgsl?raw";
import {
  cachePerDevice,
  compileShader,
  configureCanvas,
  createMipmappedTextureArray,
  createQuadPipeline,
  drawQuad,
  UNIFORM_USAGE,
} from "./gpu";

/** Caps the shader's uniform holds (keycaps-shader.wgsl). */
export const MAX_KEYCAPS = 12;
const HEADER_FLOATS = 12;
const CAP_FLOATS = 16;
const SCENE_FLOATS = HEADER_FLOATS + CAP_FLOATS * MAX_KEYCAPS;
/** Glyph texels on a side: the prints' own size, one texel per image px. */
const GLYPH_TEXELS = 288;

type Rect = readonly [x: number, y: number, width: number, height: number];
type Rgb = readonly [red: number, green: number, blue: number];

export interface KeycapFrame {
  /** The plastic (sRGB, 0 to 1) at the top face's far edge and wall foot. */
  far: Rgb;
  /** How far the cap floats off the desk. */
  lift: number;
  near: Rgb;
  /** Speckle in the plastic, 0 to 1. */
  grain: number;
  /**
   * How far the cap has grown in as it pops onto the card, 0 to 1 (a spring
   * overshoots a little): its rounded edges scale with it. `top`,
   * `thickness` and `lift` are given already scaled.
   */
  scale: number;
  /** The cap's thickness, foot to crest. */
  thickness: number;
  /**
   * The cap's top edge as drawn at rest, and its footprint's width and
   * depth.
   */
  top: Rect;
}

export interface KeycapsFrame {
  caps: readonly KeycapFrame[];
  /** The footprint's corner radius. */
  cornerRadius: number;
  /** The radius the foot tucks under with. */
  foot: number;
  height: number;
  intensity: number;
  light: { x: number; y: number; z: number };
  /** The canvas's margin around the card, in local px. */
  margin: number;
  pixelHeight: number;
  pixelWidth: number;
  /** The radius the top rolls over into the sides with. */
  roll: number;
  width: number;
}

export interface KeycapsSurface {
  destroy: () => void;
  render: (frame: KeycapsFrame) => void;
}

const getPipeline = cachePerDevice(async (gpu) => ({
  pipeline: await createQuadPipeline(
    gpu,
    await compileShader(gpu.device, shaderSource)
  ),
  sampler: gpu.device.createSampler({
    magFilter: "linear",
    minFilter: "linear",
    mipmapFilter: "linear",
  }),
}));

// One print, scaled to the texture's size so every layer matches.
const loadGlyph = async (url: string) => {
  const image = new Image();
  image.src = url;
  await image.decode();
  return createImageBitmap(image, {
    colorSpaceConversion: "none",
    premultiplyAlpha: "premultiply",
    resizeHeight: GLYPH_TEXELS,
    resizeQuality: "high",
    resizeWidth: GLYPH_TEXELS,
  });
};

/**
 * Prepares the canvas that draws the keycaps and their shadows, with each
 * cap's print. The context is configured only once nothing can cancel the
 * attachment.
 */
export const attachKeycaps = async (
  canvas: HTMLCanvasElement,
  glyphs: readonly string[],
  signal: AbortSignal
): Promise<KeycapsSurface> => {
  if (glyphs.length === 0 || glyphs.length > MAX_KEYCAPS) {
    throw new Error(`Keycaps draw 1 to ${MAX_KEYCAPS} caps`);
  }
  const {
    gpu,
    value: { pipeline, sampler },
  } = await getPipeline();
  const bitmaps = await Promise.all(glyphs.map(loadGlyph));
  const texture = await createMipmappedTextureArray(gpu.device, bitmaps);
  if (signal.aborted) {
    texture.destroy();
    signal.throwIfAborted();
  }

  const buffer = gpu.device.createBuffer({
    size: SCENE_FLOATS * 4,
    usage: UNIFORM_USAGE,
  });
  const bindGroup = gpu.device.createBindGroup({
    entries: [
      { binding: 0, resource: { buffer } },
      {
        binding: 1,
        resource: texture.createView({ dimension: "2d-array" }),
      },
      { binding: 2, resource: sampler },
    ],
    layout: pipeline.getBindGroupLayout(0),
  });
  const context = configureCanvas(canvas, gpu);
  const data = new Float32Array(SCENE_FLOATS);

  return {
    destroy: () => {
      context.unconfigure();
      buffer.destroy();
      texture.destroy();
    },
    render: (frame) => {
      const caps = frame.caps.slice(0, glyphs.length);
      data.set([
        frame.width,
        frame.height,
        frame.intensity,
        caps.length,
        frame.light.x,
        frame.light.y,
        frame.light.z,
        frame.margin,
        frame.cornerRadius,
        frame.roll,
        frame.foot,
        0,
      ]);
      for (const [index, cap] of caps.entries()) {
        data.set(
          [
            ...cap.top,
            cap.lift,
            cap.thickness,
            cap.grain,
            cap.scale,
            ...cap.far,
            1,
            ...cap.near,
            1,
          ],
          HEADER_FLOATS + index * CAP_FLOATS
        );
      }
      gpu.device.queue.writeBuffer(buffer, 0, data);
      drawQuad(gpu, canvas, context, pipeline, bindGroup, {
        height: frame.pixelHeight,
        width: frame.pixelWidth,
      });
    },
  };
};
