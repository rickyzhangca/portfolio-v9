// Lights a folder's front panel under the desk lamp, as the material it is
// made of; folder-renderer.ts sets each material's look. The folder outline
// comes in as coverage blurred two ways (folder-renderer.ts): slightly, for the
// rounded cut edge (the board's thickness), and widely, for the pillow the
// papers inside push into the panel. Two passes share this shader: pass 0 is
// multiplied over the cover (shading), pass 1 is screened over it (sheen and
// the catch-light on the edge), so the DOM cover art and text stay in place.
// Units are the cover's untransformed CSS px ("local px").

struct Folder {
  size: vec2f,
  // 0 leaves the DOM cover untouched, 1 is the full lamp.
  intensity: f32,
  // The material's fine relief: 0 cardstock, 1 silicone, 2 frosted metal,
  // 3 glass, 4 leather, 5 kraft.
  surface: f32,
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
  // rgb: the board's colour; w: how much the material's reflection takes it.
  tint: vec4f,
  // Shininess and strength of the wide sheen (xy) and the tight highlight (zw).
  lobes: vec4f,
  // x: relief shading strength, y: flat panel tone, z: rim height scale,
  // w: rim catch-light.
  shading: vec4f,
  // x: glint on the rim facing away (glass), y: metal grain sparkle,
  // zw: unused.
  effects: vec4f,
  // How brightly coloured light answers the lamp: x the board's glows,
  // y the logo's own colour. zw: unused.
  response: vec4f,
}

@group(0) @binding(0) var<uniform> folder: Folder;
@group(0) @binding(1) var shape: texture_2d<f32>;
@group(0) @binding(2) var shapeSampler: sampler;
@group(0) @binding(3) var logo: texture_2d<f32>;
// Leather stitching (folder-renderer.ts): r thread, g the groove it lies in.
@group(0) @binding(4) var seam: texture_2d<f32>;
// Coloured light pooled in the board (folder-renderer.ts), over the board.
@group(0) @binding(5) var glows: texture_2d<f32>;

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

fn hash2(p: vec2f) -> vec2f {
  return vec2f(hash(p), hash(p + vec2f(19.19, 7.73)));
}

fn surfaceIs(id: f32) -> bool {
  return abs(folder.surface - id) < 0.5;
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

// Silicone: a skin so fine it only softens the light, over a faint, slow
// unevenness of the cast.
fn silicone(p: vec2f, footprint: f32) -> f32 {
  let skin = (valueNoise(p * 1.1 + folder.seed) - 0.5) * 0.04 * resolved(0.9, footprint);
  let unevenness = (valueNoise(p / 30.0 + folder.seed.yx) - 0.5) * 0.25;
  return skin + unevenness;
}

// Bead-blasted metal: a dense, even grain of tiny dents, only just visible.
fn frostedMetal(p: vec2f, footprint: f32) -> f32 {
  return (valueNoise(p * 2.2 + folder.seed) - 0.5) * 0.025 * resolved(0.45, footprint);
}

// Pebbled leather: rounded grains of irregular size, with creases between.
const PEBBLE = 2.6;
fn pebble(p: vec2f) -> f32 {
  let q = p / PEBBLE + folder.seed;
  let cell = floor(q);
  let f = fract(q);
  var nearest = 8.0;
  var second = 8.0;
  for (var y = -1; y <= 1; y++) {
    for (var x = -1; x <= 1; x++) {
      let offset = vec2f(f32(x), f32(y));
      let d = length(offset + 0.1 + 0.8 * hash2(cell + offset) - f);
      second = min(second, max(nearest, d));
      nearest = min(nearest, d);
    }
  }
  // Distance to the crease between this grain and its neighbour.
  return smoothstep(0.0, 0.45, second - nearest);
}

fn leather(p: vec2f, footprint: f32) -> f32 {
  let grain = pebble(p) * 0.28 * resolved(PEBBLE, footprint);
  // Hides are not uniform: the grain is deeper in places.
  let depth = 0.6 + 0.8 * valueNoise(p / 46.0 + folder.seed.yx);
  return grain * depth;
}

// Kraft fibres: short strands lying every which way, a few per cell. Returns
// how close p is to a strand (x), and that strand's shade (y): -1 dark to
// 1 light, as recycled pulp mixes them.
const FIBRE_CELL = 3.0;
fn kraftFibres(p: vec2f) -> vec2f {
  let q = p / FIBRE_CELL + folder.seed;
  let cell = floor(q);
  var ridge = 0.0;
  var shade = 0.0;
  for (var y = -1; y <= 1; y++) {
    for (var x = -1; x <= 1; x++) {
      let id = cell + vec2f(f32(x), f32(y));
      let jitter = hash2(id);
      let angle = hash(id + 11.3) * 3.14159;
      let along = vec2f(cos(angle), sin(angle));
      let center = id + jitter;
      let reach = 0.2 + 0.4 * hash(id + 4.1);
      // Distance to the strand, in cells.
      let offset = q - center;
      let t = clamp(dot(offset, along), -reach, reach);
      let d = length(offset - along * t) * FIBRE_CELL;
      let strand = (1.0 - smoothstep(0.1, 0.5, d)) * (0.4 + 0.6 * hash(id + 2.9));
      if (strand > ridge) {
        ridge = strand;
        shade = hash(id + 7.7) * 2.0 - 1.0;
      }
    }
  }
  return vec2f(ridge, shade);
}

fn kraft(p: vec2f, footprint: f32) -> f32 {
  let pulp = cardstock(p * 1.3, footprint) * 1.2;
  let fibres = kraftFibres(p).x * 0.07 * resolved(1.0, footprint);
  return pulp + fibres;
}

fn seamAt(p: vec2f) -> vec4f {
  return textureSampleLevel(seam, shapeSampler, shapeUv(p), 0.0);
}

fn rimHeight(p: vec2f) -> f32 {
  return smoothstep(0.0, 1.0, outline(p).g) * THICKNESS * folder.shading.z;
}

fn surfaceHeight(p: vec2f, footprint: f32) -> f32 {
  if (surfaceIs(0.0)) {
    return cardstock(p, footprint);
  }
  if (surfaceIs(1.0)) {
    return silicone(p, footprint);
  }
  if (surfaceIs(2.0)) {
    return frostedMetal(p, footprint);
  }
  if (surfaceIs(4.0)) {
    // The thread stands proud of a groove pressed into the leather.
    let stitch = seamAt(p);
    return leather(p, footprint) * (1.0 - stitch.g) - stitch.g * 0.5 + stitch.r * 0.75;
  }
  if (surfaceIs(5.0)) {
    return kraft(p, footprint);
  }
  // Glass is polished flat.
  return 0.0;
}

fn height(p: vec2f, footprint: f32) -> f32 {
  let body = smoothstep(0.5, 1.0, outline(p).b) * folder.bulge;
  let mark = folder.logoFinish.x * logoAt(p, 1.0).a;
  return rimHeight(p) + body + surfaceHeight(p, footprint) + mark;
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
    var tone = clamp(folder.shading.y + delta * folder.shading.x * falloff, 0.0, 1.0);
    if (surfaceIs(5.0)) {
      // Darker strands in the pulp.
      let fibre = kraftFibres(p);
      tone *= 1.0 - fibre.x * max(-fibre.y, 0.0) * 0.07 * resolved(1.0, footprint);
    }
    return vec4f(vec3f(mix(1.0, tone, folder.intensity)), 1.0);
  }

  let halfway = normalize(l + vec3f(0.0, 0.0, 1.0));
  let nh = max(dot(n, halfway), 0.0);
  let lobes = folder.lobes;
  let sheen = pow(nh, max(lobes.x, 1.0)) * lobes.y + pow(nh, max(lobes.z, 1.0)) * lobes.w;
  let color = mix(vec3f(1.0), folder.tint.rgb, folder.tint.w);

  // The rounded cut edge catches the lamp on the side that faces it; glass
  // also flashes where light leaves through the far side.
  let rimSlope = vec2f(
    rimHeight(p + vec2f(e, 0.0)) - rimHeight(p - vec2f(e, 0.0)),
    rimHeight(p + vec2f(0.0, e)) - rimHeight(p - vec2f(0.0, e)),
  ) / (2.0 * e);
  let rimFacing = dot(normalize(-rimSlope + vec2f(1e-5)), normalize(l.xy + vec2f(1e-5)));
  let rimEdge = smoothstep(0.05, 0.45, length(rimSlope) / max(folder.shading.z, 0.1));
  let rim = rimEdge * (max(rimFacing, 0.0) * folder.shading.w
    + max(-rimFacing, 0.0) * folder.effects.x);

  var extra = vec3f(0.0);
  if (folder.effects.y > 0.0) {
    // Metal grain: each tiny dent is a facet tipped its own way, and the few
    // that face the lamp glint.
    let cell = floor(p / 0.7 + folder.seed);
    let tilt = (hash2(cell) - 0.5) * 0.25;
    let facet = normalize(n + vec3f(tilt, 0.0));
    let glint = pow(max(dot(facet, halfway), 0.0), 60.0) * pow(hash(cell + 3.7), 3.0);
    extra += color * glint * folder.effects.y * resolved(1.4, footprint);
  }

  // The logo's own finish: foil mirrors the lamp in its own colour, glass
  // catches a tight highlight, print barely shines.
  let mark = logoAt(p, 0.0);
  let markColor = mark.rgb / max(mark.a, 0.0001);
  let markTint = mix(vec3f(1.0), markColor, folder.logoFinish.w);
  let markShine = pow(nh, max(folder.logoFinish.z, 1.0)) * folder.logoFinish.y * mark.a;

  // Coloured light in the board and the logo lights up in its own colour as
  // the lamp nears: strongest right under it, fading with distance.
  let nearness = max(dot(n, l), 0.0) * falloff * (0.4 + pow(nh, 6.0));
  let pooled = textureSampleLevel(glows, shapeSampler, p / folder.size, 0.0).rgb;
  let colored = pooled * folder.response.x + mark.rgb * folder.response.y;

  var added = LAMP_COLOR * (color * (sheen + rim) + extra + markTint * markShine
    + colored * nearness);
  if (surfaceIs(4.0)) {
    // The thread is a shade lighter than the hide it is sewn into.
    added += LAMP_COLOR * seamAt(p).r * 0.05;
  }
  if (surfaceIs(5.0)) {
    // Lighter strands in the pulp catch the lamp, over the board's cloudy
    // formation, where the pulp lies thicker or thinner.
    let fibre = kraftFibres(p);
    let formation = valueNoise(p / 14.0 + folder.seed) * valueNoise(p / 5.0 + folder.seed.yx);
    added += LAMP_COLOR * (fibre.x * max(fibre.y, 0.0) * 0.08 * resolved(1.0, footprint)
      + formation * 0.06);
  }
  return vec4f(added * falloff * folder.intensity, 1.0);
}
