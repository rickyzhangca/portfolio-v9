import shaderSource from "./email-shader.wgsl?raw";
import {
  cachePerDevice,
  compileShader,
  configureCanvas,
  createQuadPipeline,
  drawQuad,
  UNIFORM_USAGE,
} from "./gpu";

const EMAIL_FLOATS = 20;

export interface EmailFrame {
  /** The button's box as the DOM draws it, in local px. */
  button: readonly [x: number, y: number, width: number, height: number];
  /** The button's height above the pill now, and at rest. */
  buttonHeight: number;
  buttonRest: number;
  /** How brightly the screen glows: 0 at rest, 1 under the pointer. */
  screenGlow: number;
  /** The screen, as the DOM lays it out, and how far it is set in. */
  screen: readonly [x: number, y: number, width: number, height: number];
  screenDepth: number;
  height: number;
  intensity: number;
  light: { x: number; y: number; z: number };
  /** The canvas's margin around the card, in local px. */
  margin: number;
  /** The pill's thickness. */
  pillHeight: number;
  pixelHeight: number;
  pixelWidth: number;
  width: number;
}

export interface EmailSurface {
  destroy: () => void;
  render: (frame: EmailFrame) => void;
}

const getPipeline = cachePerDevice(async (gpu) =>
  createQuadPipeline(gpu, await compileShader(gpu.device, shaderSource))
);

/**
 * Prepares the canvas that draws the email card's body and its shadow. The
 * context is configured only once nothing can cancel the attachment.
 */
export const attachEmail = async (
  canvas: HTMLCanvasElement,
  signal: AbortSignal
): Promise<EmailSurface> => {
  const { gpu, value: pipeline } = await getPipeline();
  signal.throwIfAborted();

  const buffer = gpu.device.createBuffer({
    size: EMAIL_FLOATS * 4,
    usage: UNIFORM_USAGE,
  });
  const bindGroup = gpu.device.createBindGroup({
    entries: [{ binding: 0, resource: { buffer } }],
    layout: pipeline.getBindGroupLayout(0),
  });
  const context = configureCanvas(canvas, gpu);
  const data = new Float32Array(EMAIL_FLOATS);

  return {
    destroy: () => {
      context.unconfigure();
      buffer.destroy();
    },
    render: (frame) => {
      data.set([
        frame.width,
        frame.height,
        frame.intensity,
        frame.screenGlow,
        frame.light.x,
        frame.light.y,
        frame.light.z,
        frame.margin,
        ...frame.button,
        frame.pillHeight,
        frame.buttonHeight,
        frame.buttonRest,
        frame.screenDepth,
        ...frame.screen,
      ]);
      gpu.device.queue.writeBuffer(buffer, 0, data);
      drawQuad(gpu, canvas, context, pipeline, bindGroup, {
        height: frame.pixelHeight,
        width: frame.pixelWidth,
      });
    },
  };
};
