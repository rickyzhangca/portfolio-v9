import shaderSource from "./keyboard-shader.wgsl?raw";
import {
  cachePerDevice,
  compileShader,
  configureCanvas,
  createMipmappedTextureArray,
  createQuadPipeline,
  drawQuad,
  UNIFORM_USAGE,
} from "./gpu";

const KEYBOARD_FLOATS = 44;
/** Legend texels on a side: crisp at the camera's closest zoom. */
const LEGEND_TEXELS = 144;
/** A legend's box on its keycap, in local px (keyboard-shader.wgsl). */
const LEGEND_SIZE = 24;

type Rect = readonly [x: number, y: number, width: number, height: number];

/**
 * Where the keyboard's parts are drawn in the card, in local px: the
 * chassis's top face and what lies on it, as the DOM lays them out with the
 * keycaps at rest and the knob at the top of its track.
 */
export interface KeyboardLayout {
  chassis: Rect;
  /** How far the chassis stands off the desk: its front face's height. */
  depth: number;
  keys: readonly [Rect, Rect, Rect];
  knob: Rect;
  track: Rect;
}

export interface KeyboardFrame {
  /** Corner radii of the chassis and the keycaps. */
  chassisRadius: number;
  capRadius: number;
  /** Depth of the keycaps' round dish; zero for flat caps. */
  dish: number;
  height: number;
  intensity: number;
  /** How far the knob has slid down its track. */
  knobTravel: number;
  layout: KeyboardLayout;
  light: { x: number; y: number; z: number };
  /** The canvas's margin around the card, in local px. */
  margin: number;
  /** The look along the toggle: 0 Logitech, 1 Apple, 2 mechanical. */
  mode: number;
  pixelHeight: number;
  pixelWidth: number;
  /** How far a keycap's top is inset from its foot: its sloped sides. */
  taper: number;
  /** Each keycap's height above the chassis. */
  travel: readonly [number, number, number];
  /** Depth of the cylindrical dish across a mechanical keycap's top. */
  trough: number;
  width: number;
}

export interface KeyboardSurface {
  destroy: () => void;
  render: (frame: KeyboardFrame) => void;
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

// One legend, drawn from the key's own SVG into the middle of a square at
// its intrinsic aspect, as the DOM centres it on the cap.
const rasterizeLegend = async (svg: SVGSVGElement) => {
  const markup = new XMLSerializer().serializeToString(svg);
  const url = URL.createObjectURL(
    new Blob([markup], { type: "image/svg+xml" })
  );
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    const scale = LEGEND_TEXELS / LEGEND_SIZE;
    const width = (svg.width.baseVal.value || LEGEND_SIZE) * scale;
    const height = (svg.height.baseVal.value || LEGEND_SIZE) * scale;
    const canvas = new OffscreenCanvas(LEGEND_TEXELS, LEGEND_TEXELS);
    const context = canvas.getContext("2d");
    if (!context) {
      throw new Error("No 2D context for the keyboard legends");
    }
    context.drawImage(
      image,
      (LEGEND_TEXELS - width) / 2,
      (LEGEND_TEXELS - height) / 2,
      width,
      height
    );
    return createImageBitmap(canvas, {
      colorSpaceConversion: "none",
      premultiplyAlpha: "premultiply",
    });
  } finally {
    URL.revokeObjectURL(url);
  }
};

/**
 * Prepares the canvas that draws the keyboard and its shadow, with the
 * legends from the keys' SVGs. The context is configured only once nothing
 * can cancel the attachment.
 */
export const attachKeyboard = async (
  canvas: HTMLCanvasElement,
  legends: SVGSVGElement[],
  signal: AbortSignal
): Promise<KeyboardSurface> => {
  const {
    gpu,
    value: { pipeline, sampler },
  } = await getPipeline();
  const bitmaps = await Promise.all(legends.map(rasterizeLegend));
  const texture = await createMipmappedTextureArray(gpu.device, bitmaps);
  if (signal.aborted) {
    texture.destroy();
    signal.throwIfAborted();
  }

  const buffer = gpu.device.createBuffer({
    size: KEYBOARD_FLOATS * 4,
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
  const data = new Float32Array(KEYBOARD_FLOATS);

  return {
    destroy: () => {
      context.unconfigure();
      buffer.destroy();
      texture.destroy();
    },
    render: (frame) => {
      const { layout } = frame;
      data.set([
        frame.width,
        frame.height,
        frame.intensity,
        frame.mode,
        frame.light.x,
        frame.light.y,
        frame.light.z,
        frame.margin,
        ...layout.chassis,
        ...layout.keys[0],
        ...layout.keys[1],
        ...layout.keys[2],
        ...layout.track,
        ...layout.knob,
        ...frame.travel,
        frame.knobTravel,
        layout.depth,
        frame.chassisRadius,
        frame.capRadius,
        frame.dish,
        frame.taper,
        frame.trough,
        0,
        0,
      ]);
      gpu.device.queue.writeBuffer(buffer, 0, data);
      drawQuad(gpu, canvas, context, pipeline, bindGroup, {
        height: frame.pixelHeight,
        width: frame.pixelWidth,
      });
    },
  };
};
