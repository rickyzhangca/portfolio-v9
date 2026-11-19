import {
  cachePerDevice,
  compileShader,
  configureCanvas,
  createMipmappedTexture,
  getFrameEncoder,
  TEXTURE_USAGE,
  UNIFORM_USAGE,
} from "./gpu";
import shaderSource from "./macbook-shader.wgsl?raw";

export interface LitImage {
  kind: "lid" | "sticker";
  src: string;
}

export interface LitQuad {
  height: number;
  /** Height above the surface below, in local px. */
  lift: number;
  /** Room for the shadow around the image, in local px. */
  pad: number;
  width: number;
  x: number;
  y: number;
}

export interface MacbookFrame {
  /** Canvas size in local (untransformed CSS) px. */
  height: number;
  intensity: number;
  light: { x: number; y: number; z: number };
  pixelHeight: number;
  pixelWidth: number;
  /** One per image, in the order the renderer was created with. */
  quads: LitQuad[];
  width: number;
}

export interface MacbookRenderer {
  destroy: () => void;
  /** Settles when the GPU device goes away, e.g. after a driver reset. */
  lost: Promise<unknown>;
  render: (frame: MacbookFrame) => void;
  sizes: { height: number; width: number }[];
}

const GLOBALS_FLOATS = 8;
const QUAD_FLOATS = 12;
/** GPUTextureUsage.TEXTURE_BINDING | RENDER_ATTACHMENT */
const BAKE_TEXTURE_USAGE = 0x14;
const MAX_LID_BAKE_SIZE = 1024;

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

// Surrounds the image with transparent texels. Without them, the lid (which
// fills its whole image) blurs against the texture edge: wide shadow taps
// read clamped opaque texels and the shadow turns into stepped copies.
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
  return createImageBitmap(canvas, {
    colorSpaceConversion: "none",
    premultiplyAlpha: "premultiply",
  });
};

const createPaddedTexture = async (device: GPUDevice, src: string) => {
  const image = await loadBitmap(src);
  const pad = Math.ceil(Math.max(image.width, image.height) * 0.12) + 8;
  const bitmap = await padBitmap(image, pad);
  image.close();
  const { width, height } = bitmap;
  const texture = await createMipmappedTexture(device, bitmap);
  return {
    height: height - pad * 2,
    pad,
    texture,
    textureHeight: height,
    textureWidth: width,
    width: width - pad * 2,
  };
};

const getPipelines = cachePerDevice(async (gpu) => {
  const module = await compileShader(gpu.device, shaderSource);
  const blend: GPUBlendComponent = {
    dstFactor: "one-minus-src-alpha",
    srcFactor: "one",
  };
  // Async, like createQuadPipeline: a sync compile stalls compositing.
  const [pipeline, bakePipeline] = await Promise.all([
    gpu.device.createRenderPipelineAsync({
      fragment: {
        entryPoint: "fs",
        module,
        targets: [
          { blend: { alpha: blend, color: blend }, format: gpu.format },
        ],
      },
      layout: "auto",
      primitive: { topology: "triangle-strip" },
      vertex: { entryPoint: "vs", module },
    }),
    gpu.device.createRenderPipelineAsync({
      fragment: {
        entryPoint: "fsBake",
        module,
        targets: [{ format: "rgba8unorm" }],
      },
      layout: "auto",
      primitive: { topology: "triangle-strip" },
      vertex: { entryPoint: "vsBake", module },
    }),
  ]);
  return {
    bakePipeline,
    pipeline,
    sampler: gpu.device.createSampler({
      magFilter: "linear",
      minFilter: "linear",
      mipmapFilter: "linear",
    }),
  };
});

export const createMacbookRenderer = async (
  canvas: HTMLCanvasElement,
  images: LitImage[],
  signal: AbortSignal
): Promise<MacbookRenderer> => {
  const {
    gpu,
    value: { bakePipeline, pipeline, sampler },
  } = await getPipelines();
  if (signal.aborted) {
    signal.throwIfAborted();
  }

  const textures = await Promise.all(
    images.map((image) => createPaddedTexture(gpu.device, image.src))
  );
  if (signal.aborted) {
    for (const { texture } of textures) {
      texture.destroy();
    }
    signal.throwIfAborted();
  }

  const blankTexture = gpu.device.createTexture({
    format: "rgba8unorm",
    size: [1, 1],
    usage: TEXTURE_USAGE,
  });
  const globalsBuffer = gpu.device.createBuffer({
    size: GLOBALS_FLOATS * 4,
    usage: UNIFORM_USAGE,
  });
  const globalsBindGroup = gpu.device.createBindGroup({
    entries: [
      { binding: 0, resource: { buffer: globalsBuffer } },
      { binding: 1, resource: sampler },
    ],
    layout: pipeline.getBindGroupLayout(0),
  });
  const bakeGlobalsBindGroup = gpu.device.createBindGroup({
    entries: [{ binding: 1, resource: sampler }],
    layout: bakePipeline.getBindGroupLayout(0),
  });

  const makeQuadBindGroup = (
    buffer: GPUBuffer,
    texture: GPUTexture,
    bakedView: GPUTextureView
  ) =>
    gpu.device.createBindGroup({
      entries: [
        { binding: 0, resource: { buffer } },
        { binding: 1, resource: texture.createView() },
        { binding: 2, resource: bakedView },
      ],
      layout: pipeline.getBindGroupLayout(1),
    });

  const blankView = blankTexture.createView();
  const quads = textures.map(({ texture }, index) => {
    const buffer = gpu.device.createBuffer({
      size: QUAD_FLOATS * 4,
      usage: UNIFORM_USAGE,
    });
    return {
      bakeBindGroup:
        images[index]?.kind === "lid"
          ? gpu.device.createBindGroup({
              entries: [
                { binding: 0, resource: { buffer } },
                { binding: 1, resource: texture.createView() },
              ],
              layout: bakePipeline.getBindGroupLayout(1),
            })
          : null,
      bindGroup: makeQuadBindGroup(buffer, texture, blankView),
      buffer,
    };
  });

  // A canvas has one WebGPU context. Configure it only once nothing can
  // cancel this renderer, so an abandoned one (StrictMode remounts, a quick
  // lamp toggle) cannot unconfigure the context its successor uses.
  let context: GPUCanvasContext;
  try {
    context = configureCanvas(canvas, gpu);
  } catch (error) {
    globalsBuffer.destroy();
    blankTexture.destroy();
    for (const { texture } of textures) {
      texture.destroy();
    }
    for (const { buffer } of quads) {
      buffer.destroy();
    }
    throw error;
  }

  const globals = new Float32Array(GLOBALS_FLOATS);
  const quadData = new Float32Array(QUAD_FLOATS);
  const startTime = performance.now();
  const lidIndex = images.findIndex((image) => image.kind === "lid");
  let bakedLid: {
    height: number;
    quadHeight: number;
    quadWidth: number;
    quadX: number;
    quadY: number;
    texture: GPUTexture;
    width: number;
  } | null = null;

  const render = (frame: MacbookFrame) => {
    if (
      canvas.width !== frame.pixelWidth ||
      canvas.height !== frame.pixelHeight
    ) {
      canvas.width = frame.pixelWidth;
      canvas.height = frame.pixelHeight;
    }
    globals.set([
      frame.width,
      frame.height,
      frame.intensity,
      (performance.now() - startTime) / 1000,
      frame.light.x,
      frame.light.y,
      frame.light.z,
      0,
    ]);
    gpu.device.queue.writeBuffer(globalsBuffer, 0, globals);

    for (const [index, quad] of frame.quads.entries()) {
      const image = images[index];
      const texture = textures[index];
      const target = quads[index];
      if (!(image && texture && target)) {
        continue;
      }
      // The shader sees the whole padded texture as the image rect.
      const padPx = (texture.pad * quad.width) / texture.width;
      quadData.set([
        quad.x - padPx,
        quad.y - padPx,
        quad.width + padPx * 2,
        quad.height + padPx * 2,
        texture.textureWidth,
        texture.textureHeight,
        Math.max(0, quad.pad - padPx),
        image.kind === "lid" ? 0 : 1,
        quad.lift,
        0,
        0,
        0,
      ]);
      gpu.device.queue.writeBuffer(target.buffer, 0, quadData);
    }

    const view = context.getCurrentTexture().createView();
    const sharedEncoder = getFrameEncoder(gpu.device);
    const encoder = sharedEncoder ?? gpu.device.createCommandEncoder();

    if (lidIndex !== -1) {
      const lidQuad = frame.quads[lidIndex];
      const lidTexture = textures[lidIndex];
      const lidTarget = quads[lidIndex];
      if (lidQuad && lidTexture && lidTarget?.bakeBindGroup) {
        const bakeWidth = Math.max(
          1,
          Math.min(MAX_LID_BAKE_SIZE, Math.round(lidQuad.width * 2))
        );
        const bakeHeight = Math.max(
          1,
          Math.min(MAX_LID_BAKE_SIZE, Math.round(lidQuad.height * 2))
        );
        const needsBake =
          !bakedLid ||
          bakedLid.width !== bakeWidth ||
          bakedLid.height !== bakeHeight ||
          Math.abs(bakedLid.quadWidth - lidQuad.width) > 0.5 ||
          Math.abs(bakedLid.quadHeight - lidQuad.height) > 0.5 ||
          Math.abs(bakedLid.quadX - lidQuad.x) > 0.5 ||
          Math.abs(bakedLid.quadY - lidQuad.y) > 0.5;
        if (needsBake) {
          bakedLid?.texture.destroy();
          const bakedTexture = gpu.device.createTexture({
            format: "rgba8unorm",
            size: [bakeWidth, bakeHeight],
            usage: BAKE_TEXTURE_USAGE,
          });
          const bakedView = bakedTexture.createView();
          lidTarget.bindGroup = makeQuadBindGroup(
            lidTarget.buffer,
            lidTexture.texture,
            bakedView
          );
          const bakePass = encoder.beginRenderPass({
            colorAttachments: [
              {
                clearValue: { a: 0.5, b: 0, g: 127 / 255, r: 127 / 255 },
                loadOp: "clear",
                storeOp: "store",
                view: bakedView,
              },
            ],
          });
          bakePass.setPipeline(bakePipeline);
          bakePass.setBindGroup(0, bakeGlobalsBindGroup);
          bakePass.setBindGroup(1, lidTarget.bakeBindGroup);
          bakePass.draw(4);
          bakePass.end();
          bakedLid = {
            height: bakeHeight,
            quadHeight: lidQuad.height,
            quadWidth: lidQuad.width,
            quadX: lidQuad.x,
            quadY: lidQuad.y,
            texture: bakedTexture,
            width: bakeWidth,
          };
        }
      }
    }

    const pass = encoder.beginRenderPass({
      colorAttachments: [
        {
          clearValue: { a: 0, b: 0, g: 0, r: 0 },
          loadOp: "clear",
          storeOp: "store",
          view,
        },
      ],
    });
    pass.setPipeline(pipeline);
    pass.setBindGroup(0, globalsBindGroup);
    for (const [index, quad] of frame.quads.entries()) {
      const image = images[index];
      const texture = textures[index];
      const target = quads[index];
      if (!(quad && image && texture && target)) {
        continue;
      }
      pass.setBindGroup(1, target.bindGroup);
      pass.draw(4);
    }
    pass.end();
    if (!sharedEncoder) {
      gpu.device.queue.submit([encoder.finish()]);
    }
  };

  return {
    destroy: () => {
      context.unconfigure();
      globalsBuffer.destroy();
      blankTexture.destroy();
      bakedLid?.texture.destroy();
      for (const { texture } of textures) {
        texture.destroy();
      }
      for (const { buffer } of quads) {
        buffer.destroy();
      }
    },
    lost: gpu.device.lost,
    render,
    sizes: textures.map(({ height, width }) => ({ height, width })),
  };
};
