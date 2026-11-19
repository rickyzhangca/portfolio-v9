// Lights the MacBook lid and its stickers with one desk lamp.
// Everything is in the card's untransformed CSS pixels ("local px"), so the
// canvas inherits the canvas camera's transform like any other DOM child.

struct Globals {
  canvasSize: vec2f,
  // 0 reproduces the plain DOM look, 1 is the full lamp.
  intensity: f32,
  time: f32,
  // xyz: lamp position in local px (z is height above the desk).
  light: vec4f,
}

struct Quad {
  // Image rectangle in canvas-local px.
  rect: vec4f,
  texSize: vec2f,
  // How far the quad extends past the image to make room for its shadow.
  pad: f32,
  // 0: aluminium lid, 1: vinyl sticker.
  kind: f32,
  // Height above the surface below, in local px.
  lift: f32,
  _pad0: f32,
  _pad1: f32,
  _pad2: f32,
}

@group(0) @binding(0) var<uniform> g: Globals;
@group(0) @binding(1) var linearSampler: sampler;
@group(1) @binding(0) var<uniform> q: Quad;
@group(1) @binding(1) var image: texture_2d<f32>;
// Pre-baked static lid normal slopes (rg), logo mask (b), and grain (a).
@group(1) @binding(2) var bakedLid: texture_2d<f32>;

struct VertexOut {
  @builtin(position) position: vec4f,
  @location(0) local: vec2f,
}

@vertex
fn vs(@builtin(vertex_index) index: u32) -> VertexOut {
  let corner = vec2f(f32(index & 1u), f32(index >> 1u));
  let origin = q.rect.xy - vec2f(q.pad);
  let size = q.rect.zw + vec2f(q.pad * 2.0);
  let local = origin + corner * size;
  let clip = local / g.canvasSize * vec2f(2.0, -2.0) + vec2f(-1.0, 1.0);
  var out: VertexOut;
  out.position = vec4f(clip, 0.0, 1.0);
  out.local = local;
  return out;
}

@vertex
fn vsBake(@builtin(vertex_index) index: u32) -> VertexOut {
  let corner = vec2f(f32(index & 1u), f32(index >> 1u));
  var out: VertexOut;
  out.position = vec4f(corner * vec2f(2.0, -2.0) + vec2f(-1.0, 1.0), 0.0, 1.0);
  out.local = q.rect.xy + corner * q.rect.zw;
  return out;
}

const LAMP_COLOR = vec3f(1.0, 0.97, 0.92);
// Shadows lean cool: where the warm lamp is blocked, only the room's light
// is left. A tint darkens less than black, so its opacity is raised to keep
// shadows as deep. Both match the DOM shadows (lamp-shadow.ts).
const SHADOW_TINT = vec3f(0.11, 0.14, 0.23);
const SHADOW_DEPTH = 1.16;
const LUMA = vec3f(0.299, 0.587, 0.114);
// Safe upper bound on |-edge * 0.45 - lumaGrad * 3.5| with exact zero at 127/255.
const MAX_LID_SLOPE = 4.0;
const LID_SLOPE_ZERO = 127.0 / 255.0;
const LID_SLOPE_ENCODE = 127.0 / (255.0 * MAX_LID_SLOPE);
const LID_SLOPE_DECODE = 255.0 * MAX_LID_SLOPE / 127.0;
// Poisson disk for soft shadows.
const DISK = array<vec2f, 12>(
  vec2f(-0.326, -0.406), vec2f(-0.840, -0.074), vec2f(-0.696, 0.457),
  vec2f(-0.203, 0.621), vec2f(0.962, -0.195), vec2f(0.473, -0.480),
  vec2f(0.519, 0.767), vec2f(0.185, -0.893), vec2f(0.507, 0.064),
  vec2f(0.896, 0.412), vec2f(-0.322, -0.933), vec2f(-0.792, -0.598),
);

fn toUv(local: vec2f) -> vec2f {
  return (local - q.rect.xy) / q.rect.zw;
}

fn inside(uv: vec2f) -> f32 {
  let s = step(vec2f(0.0), uv) * step(uv, vec2f(1.0));
  return s.x * s.y;
}

// Samples the premultiplied image at a local-px position, transparent outside
// its rect. Textures are premultiplied so their mipmaps filter without fringes.
fn tap(local: vec2f) -> vec4f {
  let uv = toUv(local);
  return textureSample(image, linearSampler, uv) * inside(uv);
}

// Alpha averaged over roughly `radius` local px, read from the mip level
// whose texels are that size, so wide shadows stay smooth with few taps.
fn blurredAlpha(local: vec2f, radius: f32) -> f32 {
  let texelsPerPx = q.texSize.x / q.rect.z;
  let lod = log2(max(radius * texelsPerPx, 1.0));
  var sum = 0.0;
  for (var i = 0; i < 12; i++) {
    let uv = toUv(local + DISK[i] * radius);
    sum += textureSampleLevel(image, linearSampler, uv, lod).a * inside(uv);
  }
  return sum / 12.0;
}

fn hash(p: vec2f) -> f32 {
  return fract(sin(dot(p, vec2f(127.1, 311.7))) * 43758.5453);
}

fn valueNoise(p: vec2f) -> f32 {
  let i = floor(p);
  let f = fract(p);
  let u = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(hash(i), hash(i + vec2f(1.0, 0.0)), u.x),
    mix(hash(i + vec2f(0.0, 1.0)), hash(i + vec2f(1.0, 1.0)), u.x),
    u.y,
  );
}

// Coverage of the occluder hovering `lift` px above `p`, as seen from `p`.
// The plain DOM look is a fixed drop shadow (0 16px 16px at 12%), which the
// lamp shadow replaces as intensity rises.
fn shadowAt(p: vec2f, lift: f32, strength: f32, isSticker: bool) -> f32 {
  let lamp = g.light.xyz;
  let projected = lamp.xy + (p - lamp.xy) * (lamp.z - lift) / max(lamp.z, lift + 1.0);
  let delta = projected - p;
  let len = length(delta);
  // Clamped without branching: textureSample needs uniform control flow.
  let lampDelta = delta * min(1.0, lift * 1.6 / max(len, 0.0001));
  let domDelta = select(vec2f(0.0, -16.0), vec2f(0.0, -1.0), isSticker);
  let offset = mix(domDelta, lampDelta, g.intensity);
  // Stickers adhere flat to the lid: tight edge shadow rather than a wide puddle.
  let domRadius = select(16.0, 1.0, isSticker);
  let lampRadius = select(
    1.5 + lift * 0.45 + len * 0.15,
    0.4 + lift * 0.45 + len * 0.08,
    isSticker,
  );
  let radius = mix(domRadius, lampRadius, g.intensity);
  let domOpacity = select(0.12, 0.14, isSticker);
  let opacity = mix(domOpacity, strength, g.intensity);
  return blurredAlpha(p + offset, radius) * opacity;
}

// One-time bake of the lid's static edge/logo normal slope (rg), logo mask (b)
// and bead-blasted grain (a), replacing 20 texture taps + noise per frame with 1.
@fragment
fn fsBake(in: VertexOut) -> @location(0) vec4f {
  let p = in.local;
  let texel = tap(p);
  let base = vec4f(texel.rgb / max(texel.a, 0.0001), texel.a);
  let luma = dot(base.rgb, LUMA);

  // Rounded edges: the alpha gradient tilts the normal outward.
  let r = 7.0;
  let edge = vec2f(
    tap(p + vec2f(r, 0.0)).a - tap(p - vec2f(r, 0.0)).a,
    tap(p + vec2f(0.0, r)).a - tap(p - vec2f(0.0, r)).a,
  );
  // The logo is the only sharp luminance detail on the lid.
  let s = 1.25;
  let lumaGrad = vec2f(
    dot(tap(p + vec2f(s, 0.0)).rgb, LUMA) - dot(tap(p - vec2f(s, 0.0)).rgb, LUMA),
    dot(tap(p + vec2f(0.0, s)).rgb, LUMA) - dot(tap(p - vec2f(0.0, s)).rgb, LUMA),
  );
  // Logo mask: brighter than its surroundings.
  var ring = 0.0;
  var ringWeight = 0.0;
  for (var i = 0; i < 12; i++) {
    let sample = tap(p + DISK[i] * 44.0);
    ring += dot(sample.rgb, LUMA);
    ringWeight += sample.a;
  }
  let logo = smoothstep(0.025, 0.06, luma - ring / max(ringWeight, 0.001));

  let normalSlope = -edge * 0.45 - lumaGrad * 3.5;
  let encodedSlope = clamp(
    normalSlope * LID_SLOPE_ENCODE + LID_SLOPE_ZERO,
    vec2f(0.0),
    vec2f(1.0),
  );
  // Bead-blasted aluminium: an even, isotropic grain with no direction.
  let grain = valueNoise(p * 0.9);
  return vec4f(encodedSlope, logo, grain);
}

fn lidColor(p: vec2f, base: vec4f) -> vec3f {
  let lamp = g.light.xyz;
  let baked = textureSampleLevel(bakedLid, linearSampler, toUv(p), 0.0);
  let normalSlope = (baked.rg - vec2f(LID_SLOPE_ZERO)) * LID_SLOPE_DECODE;
  let logo = baked.b;
  let grain = baked.a - 0.5;

  let n = normalize(vec3f(normalSlope, 1.0));
  let toLight = lamp - vec3f(p, 0.0);
  let dist = length(toLight);
  let l = toLight / dist;
  let h = normalize(l + vec3f(0.0, 0.0, 1.0));
  let falloff = 1.0 / (1.0 + pow(dist / (lamp.z * 1.9), 2.0));

  // Half-Lambert keeps the far side from going grey.
  let diffuse = dot(n, l) * 0.5 + 0.5;
  // Matte: the blasted surface scatters the lamp into a wide, dim sheen
  // instead of a sharp reflection. The logo is a little smoother, not a mirror.
  let nh = max(dot(n, h), 0.0);
  let sheen = pow(nh, 3.0);
  let satin = pow(nh, 22.0);

  let albedo = base.rgb * (1.0 + grain * 0.012 * (1.0 - logo));
  var color = albedo * (0.84 + 0.24 * diffuse * falloff);
  color += LAMP_COLOR * falloff * sheen * 0.05;
  color += LAMP_COLOR * logo * satin * 0.1 * falloff;
  // Rim catch-light on the bevel facing the lamp.
  let rimSlope = normalSlope * (1.0 - logo);
  let rim = clamp(dot(normalize(rimSlope + vec2f(1e-5)), normalize(l.xy + vec2f(1e-5))), 0.0, 1.0)
    * min(length(rimSlope) / 0.45, 1.0);
  color += LAMP_COLOR * rim * 0.1 * falloff;
  return color;
}

fn stickerColor(p: vec2f, base: vec4f) -> vec3f {
  let lamp = g.light.xyz;
  // Vinyl curls slightly at its cut edge.
  let r = 2.5;
  let edge = vec2f(
    tap(p + vec2f(r, 0.0)).a - tap(p - vec2f(r, 0.0)).a,
    tap(p + vec2f(0.0, r)).a - tap(p - vec2f(0.0, r)).a,
  );
  let n = normalize(vec3f(-edge * 0.6, 1.0));
  let toLight = lamp - vec3f(p, q.lift);
  let dist = length(toLight);
  let l = toLight / dist;
  let h = normalize(l + vec3f(0.0, 0.0, 1.0));
  let falloff = 1.0 / (1.0 + pow(dist / (lamp.z * 1.9), 2.0));
  let nh = max(dot(n, h), 0.0);

  var color = base.rgb * (0.88 + 0.18 * (dot(n, l) * 0.5 + 0.5) * falloff);
  color += LAMP_COLOR * pow(nh, 70.0) * 0.45 * falloff;
  return color;
}

@fragment
fn fs(in: VertexOut) -> @location(0) vec4f {
  let p = in.local;
  let texel = tap(p);
  let base = vec4f(texel.rgb / max(texel.a, 0.0001), texel.a);
  var lit = base.rgb;
  if (q.kind < 0.5) {
    lit = lidColor(p, base);
  } else {
    lit = stickerColor(p, base);
  }
  let isSticker = q.kind > 0.5;
  let strength = select(0.24, 0.22, isSticker);
  let shadow = shadowAt(p, q.lift, strength, isSticker);
  let rgb = mix(base.rgb, lit, g.intensity);
  // Premultiplied: the image over its own cool shadow.
  let tinted = (1.0 - base.a) * min(shadow * SHADOW_DEPTH, 1.0);
  return vec4f(rgb * base.a + SHADOW_TINT * tinted, base.a + tinted);
}
