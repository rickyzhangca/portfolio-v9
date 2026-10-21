import {
  cachePerDevice,
  compileShader,
  configureCanvas,
  createQuadPipeline,
  drawQuad,
  UNIFORM_USAGE,
} from "./gpu";
import shaderSource from "./paper-shader.wgsl?raw";

const PAPER_FLOATS = 24;

/** How much of each texture layer a sheet has: 0 is none, 1 the shader's own amount. */
export interface PaperTexture {
  fibres: number;
  pulp: number;
  wrinkles: number;
}

export interface PaperFrame {
  curl: number;
  /** How glossy the coating is; only drawn when a gloss canvas exists. */
  gloss: number;
  curlCorner: { x: number; y: number };
  curlRadius: number;
  height: number;
  intensity: number;
  kind: "sheet" | "sticky";
  light: { x: number; y: number; z: number };
  /** Canvas overhang past the paper on each side, in local px. */
  margin: number;
  pixelHeight: number;
  pixelWidth: number;
  radius: number;
  /** Scales every texture layer's relief. */
  relief: number;
  seed: { x: number; y: number };
  texture: PaperTexture;
  width: number;
}

export interface PaperSurface {
  destroy: () => void;
  render: (frame: PaperFrame) => void;
}

const getPipeline = cachePerDevice(async (gpu) =>
  createQuadPipeline(gpu, await compileShader(gpu.device, shaderSource))
);

/**
 * Prepares the canvases to draw one lit sheet: `canvas` shades the sheet,
 * and `glossCanvas`, for coated paper, lights it.
 * Contexts are configured only once nothing can cancel the attachment, so an
 * abandoned attempt (StrictMode remounts, a quick lamp toggle) never
 * unconfigures a successor's context.
 */
export const attachPaper = async (
  canvas: HTMLCanvasElement | null,
  glossCanvas: HTMLCanvasElement | null,
  signal: AbortSignal
): Promise<PaperSurface> => {
  const { gpu, value: pipeline } = await getPipeline();
  signal.throwIfAborted();
  const stages = [canvas, glossCanvas].flatMap((target, stage) => {
    if (!target) {
      return [];
    }
    const buffer = gpu.device.createBuffer({
      size: PAPER_FLOATS * 4,
      usage: UNIFORM_USAGE,
    });
    return [
      {
        bindGroup: gpu.device.createBindGroup({
          entries: [{ binding: 0, resource: { buffer } }],
          layout: pipeline.getBindGroupLayout(0),
        }),
        buffer,
        canvas: target,
        context: configureCanvas(target, gpu),
        stage,
      },
    ];
  });
  const data = new Float32Array(PAPER_FLOATS);

  return {
    destroy: () => {
      for (const { buffer, context } of stages) {
        context.unconfigure();
        buffer.destroy();
      }
    },
    render: (frame) => {
      for (const {
        bindGroup,
        buffer,
        canvas: target,
        context,
        stage,
      } of stages) {
        data.set([
          frame.width,
          frame.height,
          frame.radius,
          frame.intensity,
          frame.light.x,
          frame.light.y,
          frame.light.z,
          frame.margin,
          frame.seed.x,
          frame.seed.y,
          frame.curl,
          frame.kind === "sheet" ? 0 : 1,
          frame.curlCorner.x,
          frame.curlCorner.y,
          frame.curlRadius,
          frame.relief,
          frame.texture.pulp,
          frame.texture.fibres,
          frame.texture.wrinkles,
          0,
          frame.gloss,
          stage,
          0,
          0,
        ]);
        gpu.device.queue.writeBuffer(buffer, 0, data);
        drawQuad(gpu, target, context, pipeline, bindGroup, {
          height: frame.pixelHeight,
          width: frame.pixelWidth,
        });
      }
    },
  };
};
