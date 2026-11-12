import fireSheetUrl from "@/assets/timecar/fire.webp";
import steamSheetUrl from "@/assets/timecar/steam.webp";
import {
  ARRIVAL,
  DEPARTURE,
  FIRE_SHEET,
  getDriveDistance,
  getSliceTimes,
  STEAM_SHEET,
} from "@/lib/flux-charge";
import fragmentSource from "./trip-shader.glsl?raw";

const VERTEX_SOURCE = `#version 300 es
in vec2 position;
void main() {
  gl_Position = vec4(position, 0.0, 1.0);
}`;

/**
 * One departure's trails: ms since its click and how far the fire races
 * past the slice, local px.
 */
export interface TripTrails {
  elapsed: number;
  length: number;
  /** Where they lie on the desk relative to the car now, local px. */
  shift: { x: number; y: number };
}

/** A box in local px, from the car's box's top-left. */
export interface TripBounds {
  height: number;
  width: number;
  x: number;
  y: number;
}

/** What the trip shader draws this frame; see trip-shader.glsl. */
export interface TripFrame {
  /** Ms since the time machine landed; -1 when the car is not arriving. */
  arrival: number;
  /** What the canvas covers: the car's margin and the trails. */
  bounds: TripBounds;
  car: {
    /** Its motion blur; see `uBlur` in trip-shader.glsl. */
    blur: { reach: number; share: number };
    frost: number;
    /** The flash still on it as it lands, 0 to 1. */
    glare: number;
    offset: number;
    /** On the desk: it hides the trails under it. */
    standing: boolean;
  };
  /**
   * The car shows only between these x, local px: not past the slice it
   * went through, nor before the one it is coming out of.
   */
  clip: { from: number; to: number };
  /**
   * The light ahead's reaction to the motes slamming into it: kickX/kickY
   * (px recoil), surge (0-1 swell), and its pulse (its flicker with the
   * surge, about 1), which the room's light shares.
   */
  impact?: { kickX: number; kickY: number; pulse: number; surge: number };
  /**
   * The slice, or the ball of light that opens into it: where it stands,
   * local px, how far open (0-1), how grown the ball is (0-1), ms since it
   * snapped shut (-1 while open or for none), and how hot the car's cut
   * edge glows (0-1).
   */
  rift: { heat: number; open: number; orb: number; since: number; x: number };
  /** Canvas px per local px. */
  scale: number;
  /** How dark the landing's skid marks still are, 0 to 1. */
  skid: number;
  /**
   * The desk lamp lighting the steam, local px: where it stands over the
   * desk and how high; undefined for the room's daylight.
   */
  lamp?: { height: number; x: number; y: number };
  /** How hard the returned car's vents pour steam, and for how long, ms. */
  steam: { amount: number; since: number };
  time: number;
  /** Up to two departures' trails, newest first. */
  trails: readonly TripTrails[];
  vapour: number;
}

export interface TripGeometry {
  /** Where the front tyres sit, local px. */
  front: number;
  height: number;
  /** Where the rear tyres park, local px. */
  rear: number;
  /** Track rows, local px: far, near. */
  rows: readonly [number, number];
  width: number;
}

export interface TripRenderer {
  destroy: () => void;
  /**
   * Loads and decodes the landing's steam, once, and puts it on the GPU
   * when `upload` is true (now or once decoded); it shows once uploaded.
   */
  prepareSteam: (upload: boolean) => void;
  /**
   * Draws a frame into the bottom-left `bounds` of the canvas's backing
   * store and returns the backing store's size, device px, which may be
   * larger: the caller lays the canvas out to match.
   */
  render: (frame: TripFrame) => BackingSize;
  /**
   * Grows the backing store now to hold a frame this large, device px, so a
   * later frame does not reallocate it.
   */
  reserve: (width: number, height: number) => void;
}

export interface BackingSize {
  height: number;
  width: number;
}

/**
 * Resizing a WebGL canvas reallocates its drawing buffer, which waits on the
 * GPU: on the return, with the desk lamp's surfaces relighting, one resize
 * held the main thread for 70 ms. The backing store only grows, by this share
 * past what is asked and in steps of `BACKING_STEP` device px, and frames
 * draw into its bottom-left corner.
 */
const BACKING_HEADROOM = 1.15;
const BACKING_STEP = 128;
/** The largest backing store dimension, device px. */
const MAX_BACKING_PX = 4096;

const toBacking = (needed: number) =>
  Math.min(
    Math.max(needed, MAX_BACKING_PX),
    Math.ceil((needed * BACKING_HEADROOM) / BACKING_STEP) * BACKING_STEP
  );

/**
 * Transparent room around the photo in its texture, local px: the ice
 * reads coarse mip levels past the car's edge, where a clamped edge texel
 * would smear across the canvas.
 */
const TEXTURE_PAD = 24;

const padImage = (image: HTMLImageElement, width: number) => {
  const density = image.naturalWidth / width;
  const pad = Math.round(TEXTURE_PAD * density);
  const canvas = document.createElement("canvas");
  canvas.width = image.naturalWidth + pad * 2;
  canvas.height = image.naturalHeight + pad * 2;
  canvas.getContext("2d")?.drawImage(image, pad, pad);
  return { canvas, pad: pad / density };
};

/**
 * Decodes the steam's sheet off the main thread into one premultiplied
 * bitmap per row of frames, so it can go to the GPU a row a frame.
 */
const decodeSteamRows = async () => {
  const response = await fetch(steamSheetUrl);
  const sheet = await createImageBitmap(await response.blob(), {
    premultiplyAlpha: "premultiply",
  });
  const height = sheet.height / STEAM_SHEET.rows;
  const rows = await Promise.all(
    Array.from({ length: STEAM_SHEET.rows }, (_, row) =>
      createImageBitmap(sheet, 0, row * height, sheet.width, height, {
        premultiplyAlpha: "premultiply",
      })
    )
  );
  sheet.close();
  return rows;
};

/**
 * The steam's texture on unit 1, its storage allocated and nothing in it
 * yet, without mipmaps: each frame is sampled inside its own cell.
 */
const createSteamTexture = (
  gl: WebGL2RenderingContext,
  width: number,
  height: number
) => {
  const texture = gl.createTexture();
  gl.activeTexture(gl.TEXTURE1);
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texStorage2D(gl.TEXTURE_2D, 1, gl.RGBA8, width, height);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.activeTexture(gl.TEXTURE0);
  return texture;
};

const compile = (
  gl: WebGL2RenderingContext,
  type: number,
  source: string
): WebGLShader => {
  const shader = gl.createShader(type);
  if (!shader) {
    throw new Error("Could not create a shader");
  }
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  return shader;
};

/**
 * Waits, a frame at a time, for the program to finish compiling and linking.
 * Asking for its status at once waited on the GPU process to compile the trip
 * shader, about 30 ms of the first hover; with KHR_parallel_shader_compile
 * the compile runs off the main thread and is polled without blocking.
 */
const whenLinked = (gl: WebGL2RenderingContext, program: WebGLProgram) =>
  new Promise<void>((resolve, reject) => {
    const parallel = gl.getExtension("KHR_parallel_shader_compile");
    const poll = () => {
      if (
        !parallel ||
        gl.getProgramParameter(program, parallel.COMPLETION_STATUS_KHR)
      ) {
        resolve();
      } else if (gl.isContextLost()) {
        reject(new Error("WebGL2 context lost"));
      } else {
        requestAnimationFrame(poll);
      }
    };
    poll();
  });

/**
 * Draws the time machine's trip with WebGL2 on `canvas`, which covers each
 * frame's `bounds`: room around the car's box and the trails wherever
 * they lie. Throws when WebGL2 is unavailable
 * or the shader does not compile; the effect then goes without it.
 */
export const createTripRenderer = async (
  canvas: HTMLCanvasElement,
  image: HTMLImageElement,
  geometry: TripGeometry
): Promise<TripRenderer> => {
  const gl = canvas.getContext("webgl2", {
    alpha: true,
    antialias: false,
    premultipliedAlpha: true,
  });
  if (!gl) {
    throw new Error("No WebGL2");
  }
  const program = gl.createProgram();
  const vertex = compile(gl, gl.VERTEX_SHADER, VERTEX_SOURCE);
  const fragment = compile(gl, gl.FRAGMENT_SHADER, fragmentSource);
  gl.attachShader(program, vertex);
  gl.attachShader(program, fragment);
  gl.linkProgram(program);
  await whenLinked(gl, program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const log = [vertex, fragment]
      .map((shader) => gl.getShaderInfoLog(shader))
      .join("");
    throw new Error(
      `Trip shader failed to build: ${log}${gl.getProgramInfoLog(program)}`
    );
  }
  gl.deleteShader(vertex);
  gl.deleteShader(fragment);

  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]),
    gl.STATIC_DRAW
  );
  const vao = gl.createVertexArray();
  gl.bindVertexArray(vao);
  const position = gl.getAttribLocation(program, "position");
  gl.enableVertexAttribArray(position);
  gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);

  // Premultiplied and mipmapped: the ice reads a coarse level for its edges.
  const padded = padImage(image, geometry.width);
  const texture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
  gl.texImage2D(
    gl.TEXTURE_2D,
    0,
    gl.RGBA,
    gl.RGBA,
    gl.UNSIGNED_BYTE,
    padded.canvas
  );
  gl.generateMipmap(gl.TEXTURE_2D);
  gl.texParameteri(
    gl.TEXTURE_2D,
    gl.TEXTURE_MIN_FILTER,
    gl.LINEAR_MIPMAP_LINEAR
  );
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

  gl.useProgram(program);
  const uniform = (name: string) => gl.getUniformLocation(program, name);
  const locations = {
    arrival: uniform("uArrival"),
    blur: uniform("uBlur"),
    burn: uniform("uBurn"),
    car: uniform("uCar"),
    clip: uniform("uClip"),
    drive: uniform("uDrive"),
    fire: uniform("uFire"),
    flashes: uniform("uFlashes"),
    impact: uniform("uImpact"),
    orb: uniform("uOrb"),
    origin: uniform("uOrigin"),
    pad: uniform("uPad"),
    rear: uniform("uRear"),
    resolution: uniform("uResolution"),
    rift: uniform("uRift"),
    rows: uniform("uRows"),
    scale: uniform("uScale"),
    scorchFade: uniform("uScorchFade"),
    size: uniform("uSize"),
    skid: uniform("uSkid"),
    steam: uniform("uSteam"),
    lamp: uniform("uLamp"),
    steamGrid: uniform("uSteamGrid"),
    steamRegion: uniform("uSteamRegion"),
    steamSheet: uniform("uSteamSheet"),
    fireGrid: uniform("uFireGrid"),
    fireSheet: uniform("uFireSheet"),
    fireTile: uniform("uFireTile"),
    texture: uniform("uCarTexture"),
    time: uniform("uTime"),
    trailShift: uniform("uTrailShift"),
    trails: uniform("uTrails"),
    vapour: uniform("uVapor"),
  };
  gl.uniform1i(locations.texture, 0);
  gl.uniform1i(locations.steamSheet, 1);
  let destroyed = false;
  gl.uniform1i(locations.fireSheet, 2);
  gl.uniform4f(
    locations.fireGrid,
    FIRE_SHEET.cols,
    FIRE_SHEET.rows,
    FIRE_SHEET.frames,
    0
  );
  gl.uniform3f(
    locations.fireTile,
    FIRE_SHEET.tile.width,
    FIRE_SHEET.tile.height,
    FIRE_SHEET.tile.base
  );
  // The trails' fire: decoded off the main thread, then one grey texture.
  // Until it is in, or without it, the shader's own flames stand in.
  let fireTexture: WebGLTexture | null = null;
  fetch(fireSheetUrl)
    .then((response) => response.blob())
    .then((blob) => createImageBitmap(blob))
    .then((sheet) => {
      if (destroyed) {
        sheet.close();
        return;
      }
      fireTexture = gl.createTexture();
      gl.activeTexture(gl.TEXTURE2);
      gl.bindTexture(gl.TEXTURE_2D, fireTexture);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.R8, gl.RED, gl.UNSIGNED_BYTE, sheet);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.activeTexture(gl.TEXTURE0);
      sheet.close();
      gl.uniform4f(
        locations.fireGrid,
        FIRE_SHEET.cols,
        FIRE_SHEET.rows,
        FIRE_SHEET.frames,
        1
      );
    })
    .catch(() => undefined);
  const { region } = STEAM_SHEET;
  gl.uniform4f(
    locations.steamRegion,
    region.left,
    region.top,
    region.width,
    region.height
  );
  gl.uniform4f(
    locations.steamGrid,
    STEAM_SHEET.cols,
    STEAM_SHEET.rows,
    STEAM_SHEET.frames,
    0
  );
  // The steam's frames: decoded when asked, then uploaded a row of frames
  // an animation frame once wanted (the whole sheet at once held a frame
  // for 30-70 ms).
  let steamTexture: WebGLTexture | null = null;
  let steamRows: ImageBitmap[] = [];
  let steamRequested = false;
  let steamWanted = false;
  let steamUploading = false;
  let steamFrame = 0;
  const uploadSteamRow = (row: number) => {
    steamFrame = 0;
    const bitmap = steamRows[row];
    if (destroyed || !bitmap) {
      return;
    }
    if (!steamTexture) {
      steamTexture = createSteamTexture(
        gl,
        bitmap.width,
        bitmap.height * steamRows.length
      );
    }
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, steamTexture);
    gl.texSubImage2D(
      gl.TEXTURE_2D,
      0,
      0,
      row * bitmap.height,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      bitmap
    );
    gl.activeTexture(gl.TEXTURE0);
    bitmap.close();
    if (row + 1 < steamRows.length) {
      steamFrame = requestAnimationFrame(() => uploadSteamRow(row + 1));
      return;
    }
    steamRows = [];
    // The renderer's one program stays current.
    gl.uniform4f(
      locations.steamGrid,
      STEAM_SHEET.cols,
      STEAM_SHEET.rows,
      STEAM_SHEET.frames,
      1
    );
  };
  const uploadSteam = () => {
    if (steamRows.length > 0 && steamWanted && !steamUploading) {
      steamUploading = true;
      steamFrame = requestAnimationFrame(() => uploadSteamRow(0));
    }
  };
  const prepareSteam = (upload: boolean) => {
    steamWanted ||= upload;
    if (steamRequested) {
      uploadSteam();
      return;
    }
    steamRequested = true;
    decodeSteamRows()
      .then((rows) => {
        if (destroyed) {
          for (const row of rows) {
            row.close();
          }
          return;
        }
        steamRows = rows;
        uploadSteam();
      })
      // Without it the shader's own steam stands in.
      .catch(() => undefined);
  };
  gl.uniform2f(locations.size, geometry.width, geometry.height);
  gl.uniform1f(locations.pad, padded.pad);
  gl.uniform1f(locations.rear, geometry.rear);
  gl.uniform2f(locations.rows, geometry.rows[0], geometry.rows[1]);
  gl.uniform4f(
    locations.drive,
    DEPARTURE.driveFromMs / 1000,
    DEPARTURE.driveMs / 1000,
    DEPARTURE.drivePower,
    getDriveDistance(geometry.width)
  );
  gl.uniform3f(
    locations.fire,
    -DEPARTURE.slicePx,
    DEPARTURE.fireSpeed,
    getSliceTimes(geometry.width, geometry.rear).igniteAt / 1000
  );
  gl.uniform4f(
    locations.burn,
    DEPARTURE.igniteMs / 1000,
    DEPARTURE.flameHoldMs / 1000,
    DEPARTURE.flameFadeMs / 1000,
    DEPARTURE.smokeFadeMs / 1000
  );
  gl.uniform1f(locations.scorchFade, DEPARTURE.scorchFadeMs / 1000);
  const [first = 0, second = 0, third = 0] = ARRIVAL.flashesMs;
  gl.uniform3f(locations.flashes, first / 1000, second / 1000, third / 1000);

  const reserve = (width: number, height: number) => {
    if (canvas.width >= width && canvas.height >= height) {
      return;
    }
    canvas.width = Math.max(canvas.width, toBacking(width));
    canvas.height = Math.max(canvas.height, toBacking(height));
  };

  return {
    destroy: () => {
      destroyed = true;
      cancelAnimationFrame(steamFrame);
      for (const row of steamRows) {
        row.close();
      }
      gl.deleteTexture(texture);
      gl.deleteTexture(steamTexture);
      gl.deleteTexture(fireTexture);
      gl.deleteBuffer(buffer);
      gl.deleteVertexArray(vao);
      gl.deleteProgram(program);
    },
    prepareSteam,
    reserve,
    render: (frame) => {
      const pixelWidth = Math.round(frame.bounds.width * frame.scale);
      const pixelHeight = Math.round(frame.bounds.height * frame.scale);
      reserve(pixelWidth, pixelHeight);
      // gl_FragCoord counts from the bottom, so the frame's own px line up
      // with the shader's whatever the backing store's extra size.
      gl.viewport(0, 0, pixelWidth, pixelHeight);
      gl.useProgram(program);
      gl.bindVertexArray(vao);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, texture);
      if (steamTexture) {
        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, steamTexture);
        gl.activeTexture(gl.TEXTURE0);
      }
      gl.uniform2f(locations.resolution, pixelWidth, pixelHeight);
      gl.uniform1f(locations.scale, frame.scale);
      gl.uniform2f(locations.origin, -frame.bounds.x, -frame.bounds.y);
      gl.uniform1f(locations.time, frame.time);
      const [newest, older] = frame.trails;
      gl.uniform4f(
        locations.trails,
        (newest?.elapsed ?? 0) / 1000,
        newest?.length ?? 0,
        (older?.elapsed ?? 0) / 1000,
        older?.length ?? 0
      );
      gl.uniform4f(
        locations.trailShift,
        newest?.shift.x ?? 0,
        newest?.shift.y ?? 0,
        older?.shift.x ?? 0,
        older?.shift.y ?? 0
      );
      gl.uniform4f(
        locations.car,
        frame.car.offset,
        frame.car.glare,
        frame.car.frost,
        frame.car.standing ? 1 : 0
      );
      gl.uniform2f(locations.blur, frame.car.blur.reach, frame.car.blur.share);
      gl.uniform2f(
        locations.arrival,
        frame.arrival < 0 ? -1 : frame.arrival / 1000,
        ARRIVAL.slidePx
      );
      gl.uniform1f(locations.vapour, frame.vapour);
      gl.uniform2f(locations.clip, frame.clip.from, frame.clip.to);
      gl.uniform4f(
        locations.rift,
        frame.rift.x,
        frame.rift.open,
        frame.rift.since < 0 ? -1 : frame.rift.since / 1000,
        frame.rift.heat
      );
      gl.uniform1f(locations.orb, frame.rift.orb);
      gl.uniform4f(
        locations.impact,
        frame.impact?.kickX ?? 0,
        frame.impact?.kickY ?? 0,
        frame.impact?.surge ?? 0,
        frame.impact?.pulse ?? 1
      );
      gl.uniform3f(locations.skid, ARRIVAL.slidePx, geometry.front, frame.skid);
      const { lamp } = frame;
      gl.uniform4f(
        locations.lamp,
        lamp?.x ?? 0,
        lamp?.y ?? 0,
        lamp?.height ?? 1,
        lamp ? 1 : 0
      );
      gl.uniform2f(
        locations.steam,
        frame.steam.amount,
        Math.max(0, frame.steam.since) / 1000
      );
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      return { height: canvas.height, width: canvas.width };
    },
  };
};
