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
// TypeScript's DOM lib types the WebGPU interfaces but not the usage flag
// namespaces, so these are the spec's values, pre-combined.
/** GPUTextureUsage.COPY_DST | TEXTURE_BINDING | RENDER_ATTACHMENT */
const TEXTURE_USAGE = 0x16;
/** GPUBufferUsage.COPY_DST | UNIFORM */
const UNIFORM_USAGE = 0x48;

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

// WebGPU has no generateMipmap; the browser's high-quality resize builds each
// level instead, which keeps the downscaled lid and sticker outlines smooth.
const createMipmappedTexture = async (device: GPUDevice, src: string) => {
  const image = await loadBitmap(src);
  const pad = Math.ceil(Math.max(image.width, image.height) * 0.12) + 8;
  const bitmap = await padBitmap(image, pad);
  image.close();
  const { width, height } = bitmap;
  const levels = Math.floor(Math.log2(Math.max(width, height))) + 1;
  const texture = device.createTexture({
    format: "rgba8unorm",
    mipLevelCount: levels,
    size: [width, height],
    usage: TEXTURE_USAGE,
  });
  const levelSizes = Array.from({ length: levels }, (_, level) => ({
    height: Math.max(1, Math.floor(height / 2 ** level)),
    width: Math.max(1, Math.floor(width / 2 ** level)),
  }));
  const sources = await Promise.all(
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
  );
  for (const [level, source] of sources.entries()) {
    const size = levelSizes[level];
    if (size) {
      device.queue.copyExternalImageToTexture(
        { source },
        { mipLevel: level, premultipliedAlpha: true, texture },
        [size.width, size.height]
      );
    }
    source.close();
  }
  return {
    height: height - pad * 2,
    pad,
    texture,
    textureHeight: height,
    textureWidth: width,
    width: width - pad * 2,
  };
};

const assertCompiled = async (module: GPUShaderModule) => {
  const info = await module.getCompilationInfo();
  const errors = info.messages.filter((message) => message.type === "error");
  if (errors.length > 0) {
    throw new Error(
      errors
        .map((error) => `${error.lineNum}:${error.linePos} ${error.message}`)
        .join("\n")
    );
  }
};

export const createMacbookRenderer = async (
  canvas: HTMLCanvasElement,
  images: LitImage[],
  signal: AbortSignal
): Promise<MacbookRenderer> => {
  const adapter = await navigator.gpu.requestAdapter();
  if (!adapter) {
    throw new Error("No WebGPU adapter");
  }
  const device = await adapter.requestDevice();
  // The DOM lib has no "webgpu" overload for getContext.
  const context = canvas.getContext(
    "webgpu"
  ) as unknown as GPUCanvasContext | null;
  if (!context) {
    device.destroy();
    throw new Error("No WebGPU canvas context");
  }

  try {
    const format = navigator.gpu.getPreferredCanvasFormat();
    const module = device.createShaderModule({ code: shaderSource });
    await assertCompiled(module);
    const blend: GPUBlendComponent = {
      dstFactor: "one-minus-src-alpha",
      srcFactor: "one",
    };
    // Async, like createQuadPipeline: a sync compile stalls compositing.
    const pipeline = await device.createRenderPipelineAsync({
      fragment: {
        entryPoint: "fs",
        module,
        targets: [{ blend: { alpha: blend, color: blend }, format }],
      },
      layout: "auto",
      primitive: { topology: "triangle-strip" },
      vertex: { entryPoint: "vs", module },
    });

    const textures = await Promise.all(
      images.map((image) => createMipmappedTexture(device, image.src))
    );
    const sampler = device.createSampler({
      magFilter: "linear",
      minFilter: "linear",
      mipmapFilter: "linear",
    });
    const globalsBuffer = device.createBuffer({
      size: GLOBALS_FLOATS * 4,
      usage: UNIFORM_USAGE,
    });
    const globalsBindGroup = device.createBindGroup({
      entries: [
        { binding: 0, resource: { buffer: globalsBuffer } },
        { binding: 1, resource: sampler },
      ],
      layout: pipeline.getBindGroupLayout(0),
    });
    const quads = textures.map(({ texture }) => {
      const buffer = device.createBuffer({
        size: QUAD_FLOATS * 4,
        usage: UNIFORM_USAGE,
      });
      const bindGroup = device.createBindGroup({
        entries: [
          { binding: 0, resource: { buffer } },
          { binding: 1, resource: texture.createView() },
        ],
        layout: pipeline.getBindGroupLayout(1),
      });
      return { bindGroup, buffer };
    });

    // A canvas has one WebGPU context. Configure it only once nothing can
    // cancel this renderer, so an abandoned one (StrictMode remounts, a quick
    // lamp toggle) cannot unconfigure the context its successor uses.
    signal.throwIfAborted();
    context.configure({ alphaMode: "premultiplied", device, format });

    const globals = new Float32Array(GLOBALS_FLOATS);
    const quadData = new Float32Array(QUAD_FLOATS);
    const startTime = performance.now();

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
      device.queue.writeBuffer(globalsBuffer, 0, globals);

      const encoder = device.createCommandEncoder();
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
      pass.setBindGroup(0, globalsBindGroup);
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
        device.queue.writeBuffer(target.buffer, 0, quadData);
        pass.setBindGroup(1, target.bindGroup);
        pass.draw(4);
      }
      pass.end();
      device.queue.submit([encoder.finish()]);
    };

    return {
      destroy: () => {
        context.unconfigure();
        device.destroy();
      },
      lost: device.lost,
      render,
      sizes: textures.map(({ height, width }) => ({ height, width })),
    };
  } catch (error) {
    device.destroy();
    throw error;
  }
};
