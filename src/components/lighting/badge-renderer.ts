import shaderSource from "./badge-shader.wgsl?raw";
import {
  cachePerDevice,
  compileShader,
  configureCanvas,
  createMipmappedTextureArray,
  createQuadPipeline,
  drawQuad,
  UNIFORM_USAGE,
} from "./gpu";

const BADGE_FLOATS = 20;
/** Photo texels on a side: crisp at the camera's closest zoom. */
const PHOTO_SIZE = 512;

/** The badge's build, in local px. */
export interface BadgeShape {
  /** Height of each face's dome above the rim. */
  dome: number;
  /** Half the thickness at the rim. */
  halfThickness: number;
  radius: number;
  /** Width of the white rim around the photo. */
  rim: number;
}

export interface BadgeFrame {
  /** The flip, in radians. */
  angle: number;
  /** Photo indices on the front and back faces. */
  back: number;
  front: number;
  height: number;
  intensity: number;
  /** Height of the badge's middle above the desk, in local px. */
  lift: number;
  light: { x: number; y: number; z: number };
  /** The canvas's margin around the card, in local px. */
  margin: number;
  perspective: number;
  pixelHeight: number;
  pixelWidth: number;
  shape: BadgeShape;
  width: number;
}

export interface BadgeSurface {
  destroy: () => void;
  render: (frame: BadgeFrame) => void;
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

// One photo, cropped to a centred square as object-cover crops the DOM image.
const rasterizePhoto = async (src: string, signal: AbortSignal) => {
  const response = await fetch(src, { signal });
  if (!response.ok) {
    throw new Error(`Could not load ${src}`);
  }
  const image = await createImageBitmap(await response.blob());
  const side = Math.min(image.width, image.height);
  const canvas = new OffscreenCanvas(PHOTO_SIZE, PHOTO_SIZE);
  const context = canvas.getContext("2d");
  if (!context) {
    image.close();
    throw new Error("No 2D context for the badge photo");
  }
  context.imageSmoothingQuality = "high";
  context.drawImage(
    image,
    (image.width - side) / 2,
    (image.height - side) / 2,
    side,
    side,
    0,
    0,
    PHOTO_SIZE,
    PHOTO_SIZE
  );
  image.close();
  return createImageBitmap(canvas, {
    colorSpaceConversion: "none",
    premultiplyAlpha: "premultiply",
  });
};

/**
 * Prepares the canvas that draws the badge and its shadow, with every photo
 * it can show. The context is configured only once nothing can cancel the
 * attachment.
 */
export const attachBadge = async (
  canvas: HTMLCanvasElement,
  photos: string[],
  signal: AbortSignal
): Promise<BadgeSurface> => {
  const {
    gpu,
    value: { pipeline, sampler },
  } = await getPipeline();
  const bitmaps = await Promise.all(
    photos.map((src) => rasterizePhoto(src, signal))
  );
  const texture = await createMipmappedTextureArray(gpu.device, bitmaps);
  if (signal.aborted) {
    texture.destroy();
    signal.throwIfAborted();
  }

  const buffer = gpu.device.createBuffer({
    size: BADGE_FLOATS * 4,
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
  const data = new Float32Array(BADGE_FLOATS);

  return {
    destroy: () => {
      context.unconfigure();
      buffer.destroy();
      texture.destroy();
    },
    render: (frame) => {
      data.set([
        frame.width,
        frame.height,
        frame.intensity,
        frame.angle,
        frame.light.x,
        frame.light.y,
        frame.light.z,
        frame.margin,
        frame.shape.radius,
        frame.shape.halfThickness,
        frame.shape.dome,
        frame.shape.rim,
        frame.lift,
        frame.perspective,
        frame.front,
        frame.back,
      ]);
      gpu.device.queue.writeBuffer(buffer, 0, data);
      drawQuad(gpu, canvas, context, pipeline, bindGroup, {
        height: frame.pixelHeight,
        width: frame.pixelWidth,
      });
    },
  };
};
