import type { CarGlow } from "./car-glow";
import shaderSource from "./car-shader.wgsl?raw";
import {
  cachePerDevice,
  compileShader,
  configureCanvas,
  createMipmappedTextureArray,
  createQuadPipeline,
  drawQuad,
  UNIFORM_USAGE,
} from "./gpu";

const GLOBALS_FLOATS = 28;

/** The car's photo and the maps the lamp reads, all the same size. */
export interface CarMaps {
  normal: string;
  photo: string;
  surface: string;
}

export interface CarFrame {
  /** The car's own lights, in canvas local px. */
  glow: CarGlow["lights"];
  /** Canvas size in local px. */
  height: number;
  intensity: number;
  light: { x: number; y: number; z: number };
  pixelHeight: number;
  pixelWidth: number;
  /** The photo's rectangle in the canvas, in local px. */
  rect: readonly [x: number, y: number, width: number, height: number];
  surfaceHeight: number;
  width: number;
}

export interface CarSurface {
  destroy: () => void;
  render: (frame: CarFrame) => void;
}

const getPipeline = cachePerDevice(async (gpu) =>
  createQuadPipeline(gpu, await compileShader(gpu.device, shaderSource))
);

// Premultiplied, so the maps' mip levels filter without dark fringes; the
// shader divides by coverage again.
const loadBitmap = async (src: string) => {
  const response = await fetch(src);
  if (!response.ok) {
    throw new Error(`Could not load ${src}`);
  }
  return createImageBitmap(await response.blob(), {
    colorSpaceConversion: "none",
    premultiplyAlpha: "premultiply",
  });
};

// Surrounds the image with transparent texels. The car fills its photo to
// the edge, so wide shadow taps read the clamped edge of coarse mip levels
// and the shadow broke into stepped blocks.
const padBitmap = (bitmap: ImageBitmap, pad: number) => {
  const canvas = new OffscreenCanvas(
    bitmap.width + pad * 2,
    bitmap.height + pad * 2
  );
  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("No 2D context for texture padding");
  }
  context.drawImage(bitmap, pad, pad);
  bitmap.close();
  return createImageBitmap(canvas, {
    colorSpaceConversion: "none",
    premultiplyAlpha: "premultiply",
  });
};

/**
 * Prepares the canvas that draws the car and its shadow. The context is
 * configured only once nothing can cancel the attachment.
 */
export const attachCar = async (
  canvas: HTMLCanvasElement,
  maps: CarMaps,
  signal: AbortSignal
): Promise<CarSurface> => {
  const [{ gpu, value: pipeline }, images] = await Promise.all([
    getPipeline(),
    Promise.all([maps.photo, maps.normal, maps.surface].map(loadBitmap)),
  ]);
  const [photo] = images;
  if (!photo) {
    throw new Error("No car photo");
  }
  const imageWidth = photo.width;
  const pad = Math.ceil(Math.max(photo.width, photo.height) * 0.15) + 8;
  const bitmaps = await Promise.all(
    images.map((image) => padBitmap(image, pad))
  );
  if (signal.aborted) {
    for (const bitmap of bitmaps) {
      bitmap.close();
    }
    signal.throwIfAborted();
  }
  const texture = await createMipmappedTextureArray(gpu.device, bitmaps);
  signal.throwIfAborted();

  const buffer = gpu.device.createBuffer({
    size: GLOBALS_FLOATS * 4,
    usage: UNIFORM_USAGE,
  });
  const sampler = gpu.device.createSampler({
    magFilter: "linear",
    minFilter: "linear",
    mipmapFilter: "linear",
  });
  const bindGroup = gpu.device.createBindGroup({
    entries: [
      { binding: 0, resource: { buffer } },
      { binding: 1, resource: sampler },
      { binding: 2, resource: texture.createView({ dimension: "2d-array" }) },
    ],
    layout: pipeline.getBindGroupLayout(0),
  });
  const context = configureCanvas(canvas, gpu);
  const data = new Float32Array(GLOBALS_FLOATS);

  return {
    destroy: () => {
      context.unconfigure();
      buffer.destroy();
      texture.destroy();
    },
    render: (frame) => {
      // The shader sees the whole padded texture as the photo's rect.
      const [x, y, width, height] = frame.rect;
      const padPx = (pad * width) / imageWidth;
      data.set([
        frame.width,
        frame.height,
        frame.intensity,
        frame.surfaceHeight,
        frame.light.x,
        frame.light.y,
        frame.light.z,
        0,
        x - padPx,
        y - padPx,
        width + padPx * 2,
        height + padPx * 2,
      ]);
      for (const [index, light] of frame.glow.entries()) {
        data.set(
          [
            light.x,
            light.y,
            light.z,
            light.intensity,
            light.color[0],
            light.color[1],
            light.color[2],
            0,
          ],
          12 + index * 8
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
