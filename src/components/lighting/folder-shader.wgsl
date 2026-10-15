// Lights a folder's front panel under the desk lamp. The folder outline comes
// in as coverage blurred two ways (folder-renderer.ts): slightly, for the
// rounded cut edge (the board's thickness), and widely, for the pillow the
// papers inside push into the panel. Two passes share this shader: pass 0 is
// multiplied over the cover (shading), pass 1 is screened over it (sheen and
// the catch-light on the edge), so the DOM cover art and text stay in place.
// Units are the cover's untransformed CSS px ("local px").

struct Folder {
  size: vec2f,
  // 0 leaves the DOM cover untouched, 1 is the full lamp.
  intensity: f32,
  // 0: matte cardstock, 1: soft-touch board.
  material: f32,
  // xyz: lamp position in local px; w: transparent margin around the outline
  // in the coverage texture, in local px.
  light: vec4f,
  seed: vec2f,
  // How far the papers inside push the panel up, in local px.
  bulge: f32,
  // 0: shading pass, 1: light pass. ("pass" is reserved in WGSL.)
  stage: f32,
  // Where the logo sits on the board, in local px (zero size: no logo).
  logoRect: vec4f,
  // x: relief height in local px (raised), y: gloss, z: shininess,
  // w: how much the reflection takes the logo's own colour (foil).
  logoFinish: vec4f,
}

@group(0) @binding(0) var<uniform> folder: Folder;
@group(0) @binding(1) var shape: texture_2d<f32>;
@group(0) @binding(2) var shapeSampler: sampler;
@group(0) @binding(3) var logo: texture_2d<f32>;

struct VertexOut {
  @builtin(position) position: vec4f,
  @location(0) local: vec2f,
}

@vertex
fn vs(@builtin(vertex_index) index: u32) -> VertexOut {
  let corner = vec2f(f32(index & 1u), f32(index >> 1u));
  var out: VertexOut;
  out.position = vec4f(corner * vec2f(2.0, -2.0) + vec2f(-1.0, 1.0), 0.0, 1.0);
  out.local = corner * folder.size;
  return out;
}

const LAMP_COLOR = vec3f(1.0, 0.94, 0.84);
// Board thickness, in local px.
const THICKNESS = 2.0;

fn shapeUv(p: vec2f) -> vec2f {
  let margin = folder.light.w;
  return (p + vec2f(margin)) / (folder.size + vec2f(margin * 2.0));
}

// Blurred outline coverage: g for the rounded edge, b for the bulge.
fn outline(p: vec2f) -> vec4f {
  return textureSampleLevel(shape, shapeSampler, shapeUv(p), 0.0);
}

// The logo artwork at p (premultiplied), transparent outside its rect. A
// coarser level softens its edge into a small bevel for the relief.
fn logoAt(p: vec2f, lod: f32) -> vec4f {
  let uv = (p - folder.logoRect.xy) / max(folder.logoRect.zw, vec2f(0.0001));
  let inside = step(vec2f(0.0), uv) * step(uv, vec2f(1.0));
  return textureSampleLevel(logo, shapeSampler, uv, lod) * inside.x * inside.y;
}

fn hash(p: vec2f) -> f32 {
  let q = fract(p * vec2f(0.1031, 0.1030));
  let r = q + dot(q, q.yx + 33.33);
  return fract((r.x + r.y) * r.x);
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

// Detail finer than about two device pixels only aliases; fade it out.
fn resolved(wavelength: f32, footprint: f32) -> f32 {
  return smoothstep(1.0, 2.5, wavelength / footprint);
}

// Cardstock: pressed pulp with a faint fibre direction.
fn cardstock(p: vec2f, footprint: f32) -> f32 {
  var value = 0.0;
  var amplitude = 0.5;
  var wavelength = 1.8;
  var q = p / wavelength + folder.seed;
  for (var i = 0; i < 4; i++) {
    value += amplitude * valueNoise(q) * resolved(wavelength, footprint);
    q = q * 2.03 + vec2f(17.1, 9.2);
    wavelength /= 2.03;
    amplitude *= 0.5;
  }
  let fibre = valueNoise(vec2f(p.x * 0.08, p.y * 1.1) + folder.seed.yx);
  let ridge = pow(1.0 - abs(fibre * 2.0 - 1.0), 10.0) * resolved(0.9, footprint);
  return value * 0.12 + ridge * 0.05;
}

// Soft-touch coating: an even, very fine tooth.
fn board(p: vec2f, footprint: f32) -> f32 {
  return (valueNoise(p * 1.3 + folder.seed) - 0.5) * 0.05 * resolved(0.8, footprint);
}

fn rimHeight(p: vec2f) -> f32 {
  return smoothstep(0.0, 1.0, outline(p).g) * THICKNESS;
}

fn height(p: vec2f, footprint: f32) -> f32 {
  let body = smoothstep(0.5, 1.0, outline(p).b) * folder.bulge;
  var surface = 0.0;
  if (folder.material < 0.5) {
    surface = cardstock(p, footprint);
  } else {
    surface = board(p, footprint);
  }
  let mark = folder.logoFinish.x * logoAt(p, 1.0).a;
  return rimHeight(p) + body + surface + mark;
}

@fragment
fn fs(in: VertexOut) -> @location(0) vec4f {
  let p = in.local;
  // Local px under one device pixel; changes with camera zoom and DPR.
  let footprint = max(fwidth(p.x), fwidth(p.y));
  let e = max(0.6, footprint);
  let h = height(p, footprint);
  let slope = vec2f(
    height(p + vec2f(e, 0.0), footprint) - height(p - vec2f(e, 0.0), footprint),
    height(p + vec2f(0.0, e), footprint) - height(p - vec2f(0.0, e), footprint),
  ) / (2.0 * e);
  let n = normalize(vec3f(-slope, 1.0));

  let lamp = folder.light.xyz;
  let toLamp = lamp - vec3f(p, h);
  let l = normalize(toLamp);
  let flatLight = normalize(lamp - vec3f(p, 0.0));
  // A distant lamp lights the folder less, so its relief shows less.
  let falloff = 1.0 / (1.0 + pow(length(toLamp) / (lamp.z * 1.9), 2.0));

  if (folder.stage < 0.5) {
    // The change in light against a flat panel, not their ratio, which
    // explodes under grazing light.
    let delta = max(dot(n, l), 0.0) - flatLight.z;
    let gain = select(1.3, 0.9, folder.material > 0.5);
    let tone = clamp(0.97 + delta * gain * falloff, 0.0, 1.0);
    return vec4f(vec3f(mix(1.0, tone, folder.intensity)), 1.0);
  }

  let halfway = normalize(l + vec3f(0.0, 0.0, 1.0));
  let nh = max(dot(n, halfway), 0.0);
  // Soft-touch board scatters the lamp into a wide, dim sheen; cardstock
  // barely shines at all. Neither has a sharp reflection.
  let sheen = select(pow(nh, 5.0) * 0.03, pow(nh, 14.0) * 0.08, folder.material > 0.5);

  // The rounded cut edge catches the lamp on the side that faces it.
  let rimSlope = vec2f(
    rimHeight(p + vec2f(e, 0.0)) - rimHeight(p - vec2f(e, 0.0)),
    rimHeight(p + vec2f(0.0, e)) - rimHeight(p - vec2f(0.0, e)),
  ) / (2.0 * e);
  let rimFacing = max(dot(normalize(-rimSlope + vec2f(1e-5)), normalize(l.xy + vec2f(1e-5))), 0.0);
  let rim = smoothstep(0.05, 0.45, length(rimSlope)) * rimFacing;
  let rimStrength = select(0.1, 0.2, folder.material > 0.5);

  // The logo's own finish: foil mirrors the lamp in its own colour, glass
  // catches a tight highlight, print barely shines.
  let mark = logoAt(p, 0.0);
  let markColor = mark.rgb / max(mark.a, 0.0001);
  let tint = mix(vec3f(1.0), markColor, folder.logoFinish.w);
  let markShine = pow(nh, max(folder.logoFinish.z, 1.0)) * folder.logoFinish.y * mark.a;

  let added = (LAMP_COLOR * (sheen + rim * rimStrength) + LAMP_COLOR * tint * markShine)
    * falloff * folder.intensity;
  return vec4f(added, 1.0);
}
