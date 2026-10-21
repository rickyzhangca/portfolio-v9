import type { LampShadow } from "@/lib/lamp-shadow";
import {
  cachePerDevice,
  compileShader,
  configureCanvas,
  createQuadPipeline,
  drawQuad,
  UNIFORM_USAGE,
} from "./gpu";
import shaderSource from "./shadow-shader.wgsl?raw";

const SHADOW_FLOATS = 8;

export interface ShadowFrame {
  height: number;
  /** Canvas overhang past the caster on each side, in local px. */
  margin: number;
  pixelHeight: number;
  pixelWidth: number;
  radius: number;
  /** The lamp's shadow in local px; null draws nothing. */
  shadow: LampShadow | null;
  width: number;
}

export interface ShadowSurface {
  destroy: () => void;
  render: (frame: ShadowFrame) => void;
}

const getPipeline = cachePerDevice(async (gpu) =>
  createQuadPipeline(gpu, await compileShader(gpu.device, shaderSource))
);

/**
 * Prepares a canvas to draw one caster's lamp shadow. The context is
 * configured only once nothing can cancel the attachment (see attachPaper).
 */
export const attachShadow = async (
  canvas: HTMLCanvasElement,
  signal: AbortSignal
): Promise<ShadowSurface> => {
  const { gpu, value: pipeline } = await getPipeline();
  signal.throwIfAborted();
  const buffer = gpu.device.createBuffer({
    size: SHADOW_FLOATS * 4,
    usage: UNIFORM_USAGE,
  });
  const bindGroup = gpu.device.createBindGroup({
    entries: [{ binding: 0, resource: { buffer } }],
    layout: pipeline.getBindGroupLayout(0),
  });
  const context = configureCanvas(canvas, gpu);
  const data = new Float32Array(SHADOW_FLOATS);

  return {
    destroy: () => {
      context.unconfigure();
      buffer.destroy();
    },
    render: (frame) => {
      const { shadow } = frame;
      data.set([
        frame.width,
        frame.height,
        frame.radius,
        frame.margin,
        shadow?.x ?? 0,
        shadow?.y ?? 0,
        shadow?.blur ?? 0,
        shadow?.opacity ?? 0,
      ]);
      gpu.device.queue.writeBuffer(buffer, 0, data);
      drawQuad(gpu, canvas, context, pipeline, bindGroup, {
        height: frame.pixelHeight,
        width: frame.pixelWidth,
      });
    },
  };
};
