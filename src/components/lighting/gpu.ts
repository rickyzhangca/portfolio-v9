// TypeScript's DOM lib types the WebGPU interfaces but not the usage flag
// namespaces, so these are the spec's values, pre-combined.
/** GPUTextureUsage.COPY_DST | TEXTURE_BINDING | RENDER_ATTACHMENT */
export const TEXTURE_USAGE = 0x16;
/** GPUBufferUsage.COPY_DST | UNIFORM */
export const UNIFORM_USAGE = 0x48;

export interface Gpu {
  device: GPUDevice;
  format: GPUTextureFormat;
}

// Every lit surface on the desk shares one device; each owns only its canvas
// context, buffers and textures.
let shared: Promise<Gpu> | null = null;

const createGpu = async (): Promise<Gpu> => {
  const adapter = await navigator.gpu.requestAdapter();
  if (!adapter) {
    throw new Error("No WebGPU adapter");
  }
  const device = await adapter.requestDevice();
  device.lost.then(() => {
    shared = null;
  });
  return { device, format: navigator.gpu.getPreferredCanvasFormat() };
};

export const getGpu = () => {
  shared ??= createGpu().catch((error: unknown) => {
    shared = null;
    throw error;
  });
  return shared;
};

export const compileShader = async (device: GPUDevice, code: string) => {
  const module = device.createShaderModule({ code });
  const info = await module.getCompilationInfo();
  const errors = info.messages.filter((message) => message.type === "error");
  if (errors.length > 0) {
    throw new Error(
      errors
        .map((error) => `${error.lineNum}:${error.linePos} ${error.message}`)
        .join("\n")
    );
  }
  return module;
};

/** A pipeline for one fullscreen quad drawn with premultiplied alpha. */
export const createQuadPipeline = (gpu: Gpu, module: GPUShaderModule) => {
  const blend: GPUBlendComponent = {
    dstFactor: "one-minus-src-alpha",
    srcFactor: "one",
  };
  return gpu.device.createRenderPipeline({
    fragment: {
      entryPoint: "fs",
      module,
      targets: [{ blend: { alpha: blend, color: blend }, format: gpu.format }],
    },
    layout: "auto",
    primitive: { topology: "triangle-strip" },
    vertex: { entryPoint: "vs", module },
  });
};

/** Pipelines are tied to their device; rebuild them after a device loss. */
export const cachePerDevice = <T>(build: (gpu: Gpu) => Promise<T>) => {
  let cache: { device: GPUDevice; value: Promise<T> } | null = null;
  return async () => {
    const gpu = await getGpu();
    if (cache?.device !== gpu.device) {
      cache = { device: gpu.device, value: build(gpu) };
    }
    return { gpu, value: await cache.value };
  };
};

export const configureCanvas = (canvas: HTMLCanvasElement, gpu: Gpu) => {
  // The DOM lib has no "webgpu" overload for getContext.
  const context = canvas.getContext(
    "webgpu"
  ) as unknown as GPUCanvasContext | null;
  if (!context) {
    throw new Error("No WebGPU canvas context");
  }
  context.configure({
    alphaMode: "premultiplied",
    device: gpu.device,
    format: gpu.format,
  });
  return context;
};

/** Resizes the backing store, then draws one quad into it. */
export const drawQuad = (
  gpu: Gpu,
  canvas: HTMLCanvasElement,
  context: GPUCanvasContext,
  pipeline: GPURenderPipeline,
  bindGroup: GPUBindGroup,
  pixelSize: { height: number; width: number }
) => {
  if (canvas.width !== pixelSize.width || canvas.height !== pixelSize.height) {
    canvas.width = pixelSize.width;
    canvas.height = pixelSize.height;
  }
  const encoder = gpu.device.createCommandEncoder();
  const pass = encoder.beginRenderPass({
    colorAttachments: [
      {
        clearValue: { a: 0, b: 0, g: 0, r: 0 },
        loadOp: "clear",
        storeOp: "store",
        view: context.getCurrentTexture().createView(),
      },
    ],
  });
  pass.setPipeline(pipeline);
  pass.setBindGroup(0, bindGroup);
  pass.draw(4);
  pass.end();
  gpu.device.queue.submit([encoder.finish()]);
};

/**
 * Uploads equally sized bitmaps as the layers of one texture, each with a
 * full mip chain. WebGPU has no generateMipmap; the browser's high-quality
 * resize builds each level instead. The bitmaps are closed afterwards.
 */
export const createMipmappedTextureArray = async (
  device: GPUDevice,
  bitmaps: ImageBitmap[]
) => {
  const [first] = bitmaps;
  if (!first) {
    throw new Error("No bitmaps to upload");
  }
  const { width, height } = first;
  const levels = Math.floor(Math.log2(Math.max(width, height))) + 1;
  const texture = device.createTexture({
    format: "rgba8unorm",
    mipLevelCount: levels,
    size: [width, height, bitmaps.length],
    usage: TEXTURE_USAGE,
  });
  const levelSizes = Array.from({ length: levels }, (_, level) => ({
    height: Math.max(1, Math.floor(height / 2 ** level)),
    width: Math.max(1, Math.floor(width / 2 ** level)),
  }));
  const layers = await Promise.all(
    bitmaps.map((bitmap) =>
      Promise.all(
        levelSizes.map((size, level) =>
          level === 0
            ? bitmap
            : createImageBitmap(bitmap, {
                colorSpaceConversion: "none",
                premultiplyAlpha: "premultiply",
                resizeHeight: size.height,
                resizeQuality: "high",
                resizeWidth: size.width,
              })
        )
      )
    )
  );
  for (const [layer, sources] of layers.entries()) {
    for (const [level, source] of sources.entries()) {
      const size = levelSizes[level];
      if (size) {
        device.queue.copyExternalImageToTexture(
          { source },
          {
            mipLevel: level,
            origin: [0, 0, layer],
            premultipliedAlpha: true,
            texture,
          },
          [size.width, size.height]
        );
      }
      source.close();
    }
  }
  return texture;
};

/** Uploads a bitmap with a full mip chain. */
export const createMipmappedTexture = (
  device: GPUDevice,
  bitmap: ImageBitmap
) => createMipmappedTextureArray(device, [bitmap]);
