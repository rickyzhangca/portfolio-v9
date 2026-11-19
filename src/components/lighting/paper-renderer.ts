import {
  cachePerDevice,
  compileShader,
  configureCanvas,
  createQuadPipeline,
  drawQuad,
  getFrameEncoder,
  UNIFORM_USAGE,
} from "./gpu";
import shaderSource from "./paper-shader.wgsl?raw";

const PAPER_FLOATS = 24;
/** GPUTextureUsage.TEXTURE_BINDING | RENDER_ATTACHMENT */
const BAKE_TEXTURE_USAGE = 0x14;
/** GPUTextureUsage.COPY_DST | TEXTURE_BINDING */
const DUMMY_TEXTURE_USAGE = 0x06;
/** Matches ZERO_OFFSET (128/255) in paper-shader.wgsl. */
const NEUTRAL_SLOPE_BYTE = 128;
const NEUTRAL_SLOPE = NEUTRAL_SLOPE_BYTE / 255;

/** How much of each texture layer a sheet has: 0 is none, 1 the shader's own amount. */
export interface PaperTexture {
  fibres: number;
  pulp: number;
  wrinkles: number;
}

export interface PaperFrame {
  curl: number;
  curlCorner: { x: number; y: number };
  curlRadius: number;
  /** How glossy the coating is; only drawn when a gloss canvas exists. */
  gloss: number;
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

interface PaperStage {
  bakeBindGroup: GPUBindGroup | null;
  bakedFibres: number;
  bakedHeight: number;
  bakedLocalHeight: number;
  bakedLocalWidth: number;
  bakedMargin: number;
  bakedPulp: number;
  bakedSeedX: number;
  bakedSeedY: number;
  bakedTexture: GPUTexture | null;
  bakedWidth: number;
  bakedWrinkles: number;
  bindGroup: GPUBindGroup;
  buffer: GPUBuffer;
  canvas: HTMLCanvasElement;
  context: GPUCanvasContext;
  stage: number;
}

const hasStaticTexture = (texture: PaperTexture) =>
  texture.pulp > 0 || texture.fibres > 0 || texture.wrinkles > 0;

const getResources = cachePerDevice(async (gpu) => {
  const module = await compileShader(gpu.device, shaderSource);
  const [pipeline, bakePipeline] = await Promise.all([
    createQuadPipeline(gpu, module),
    gpu.device.createRenderPipelineAsync({
      fragment: {
        entryPoint: "fsBake",
        module,
        targets: [{ format: "rgba8unorm" }],
      },
      layout: "auto",
      primitive: { topology: "triangle-strip" },
      vertex: { entryPoint: "vs", module },
    }),
  ]);
  const sampler = gpu.device.createSampler({
    addressModeU: "clamp-to-edge",
    addressModeV: "clamp-to-edge",
    magFilter: "linear",
    minFilter: "linear",
  });
  const dummyTexture = gpu.device.createTexture({
    format: "rgba8unorm",
    size: [1, 1],
    usage: DUMMY_TEXTURE_USAGE,
  });
  gpu.device.queue.writeTexture(
    { texture: dummyTexture },
    new Uint8Array([NEUTRAL_SLOPE_BYTE, NEUTRAL_SLOPE_BYTE, 0, 255]),
    { bytesPerRow: 4 },
    [1, 1]
  );
  return {
    bakePipeline,
    dummyView: dummyTexture.createView(),
    pipeline,
    sampler,
  };
});

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
  const {
    gpu,
    value: { bakePipeline, dummyView, pipeline, sampler },
  } = await getResources();
  signal.throwIfAborted();

  const createMainBindGroup = (buffer: GPUBuffer, reliefView: GPUTextureView) =>
    gpu.device.createBindGroup({
      entries: [
        { binding: 0, resource: { buffer } },
        { binding: 1, resource: reliefView },
        { binding: 2, resource: sampler },
      ],
      layout: pipeline.getBindGroupLayout(0),
    });

  const stages: PaperStage[] = [canvas, glossCanvas].flatMap(
    (target, stage) => {
      if (!target) {
        return [];
      }
      const buffer = gpu.device.createBuffer({
        size: PAPER_FLOATS * 4,
        usage: UNIFORM_USAGE,
      });
      return [
        {
          bakeBindGroup: null,
          bakedFibres: 0,
          bakedHeight: 0,
          bakedLocalHeight: 0,
          bakedLocalWidth: 0,
          bakedMargin: 0,
          bakedPulp: 0,
          bakedSeedX: 0,
          bakedSeedY: 0,
          bakedTexture: null,
          bakedWidth: 0,
          bakedWrinkles: 0,
          bindGroup: createMainBindGroup(buffer, dummyView),
          buffer,
          canvas: target,
          context: configureCanvas(target, gpu),
          stage,
        },
      ];
    }
  );
  const data = new Float32Array(PAPER_FLOATS);

  return {
    destroy: () => {
      for (const entry of stages) {
        entry.context.unconfigure();
        entry.buffer.destroy();
        entry.bakedTexture?.destroy();
        entry.bakedTexture = null;
      }
    },
    render: (frame) => {
      for (const entry of stages) {
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
          entry.stage,
          0,
          0,
        ]);
        gpu.device.queue.writeBuffer(entry.buffer, 0, data);

        if (entry.stage === 0 && hasStaticTexture(frame.texture)) {
          const needsBake =
            !entry.bakedTexture ||
            entry.bakedWidth !== frame.pixelWidth ||
            entry.bakedHeight !== frame.pixelHeight ||
            entry.bakedLocalWidth !== frame.width ||
            entry.bakedLocalHeight !== frame.height ||
            entry.bakedMargin !== frame.margin ||
            entry.bakedSeedX !== frame.seed.x ||
            entry.bakedSeedY !== frame.seed.y ||
            entry.bakedPulp !== frame.texture.pulp ||
            entry.bakedFibres !== frame.texture.fibres ||
            entry.bakedWrinkles !== frame.texture.wrinkles;
          if (needsBake) {
            entry.bakedTexture?.destroy();
            const bakedTexture = gpu.device.createTexture({
              format: "rgba8unorm",
              size: [frame.pixelWidth, frame.pixelHeight],
              usage: BAKE_TEXTURE_USAGE,
            });
            const bakedView = bakedTexture.createView();
            entry.bakedTexture = bakedTexture;
            entry.bakedWidth = frame.pixelWidth;
            entry.bakedHeight = frame.pixelHeight;
            entry.bakedLocalWidth = frame.width;
            entry.bakedLocalHeight = frame.height;
            entry.bakedMargin = frame.margin;
            entry.bakedSeedX = frame.seed.x;
            entry.bakedSeedY = frame.seed.y;
            entry.bakedPulp = frame.texture.pulp;
            entry.bakedFibres = frame.texture.fibres;
            entry.bakedWrinkles = frame.texture.wrinkles;
            entry.bakeBindGroup ??= gpu.device.createBindGroup({
              entries: [{ binding: 0, resource: { buffer: entry.buffer } }],
              layout: bakePipeline.getBindGroupLayout(0),
            });
            entry.bindGroup = createMainBindGroup(entry.buffer, bakedView);

            const sharedEncoder = getFrameEncoder(gpu.device);
            const encoder = sharedEncoder ?? gpu.device.createCommandEncoder();
            const bakePass = encoder.beginRenderPass({
              colorAttachments: [
                {
                  clearValue: {
                    a: 1,
                    b: 0,
                    g: NEUTRAL_SLOPE,
                    r: NEUTRAL_SLOPE,
                  },
                  loadOp: "clear",
                  storeOp: "store",
                  view: bakedView,
                },
              ],
            });
            bakePass.setPipeline(bakePipeline);
            bakePass.setBindGroup(0, entry.bakeBindGroup);
            bakePass.draw(4);
            bakePass.end();
            if (!sharedEncoder) {
              gpu.device.queue.submit([encoder.finish()]);
            }
          }
        } else if (entry.bakedTexture) {
          entry.bakedTexture.destroy();
          entry.bakedTexture = null;
          entry.bakedWidth = 0;
          entry.bakedHeight = 0;
          entry.bakedLocalWidth = 0;
          entry.bakedLocalHeight = 0;
          entry.bindGroup = createMainBindGroup(entry.buffer, dummyView);
        }

        drawQuad(gpu, entry.canvas, entry.context, pipeline, entry.bindGroup, {
          height: frame.pixelHeight,
          width: frame.pixelWidth,
        });
      }
    },
  };
};
