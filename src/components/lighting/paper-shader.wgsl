// Lights one sheet of paper under the desk lamp: its surface texture and a
// curled corner or edge. The canvas covers the paper and is multiplied over
// it, so the shading falls on the DOM paper and its printed text alike. It
// overhangs the paper by a margin; there the isolated group behind it is
// empty, so the curl's shadow composites normally onto the desk.
// Units are the paper's untransformed CSS px ("local px").
//
// Every texture layer returns the slope of its relief directly (rather than
// a height to difference), which keeps layers cheap to stack. The pattern
// ideas (curling fibres from noise, faceted wrinkles) follow
// Paper Shaders' paper-texture (paper.design, Apache-2.0); here they become
// real relief lit by the desk lamp.

struct Paper {
  size: vec2f,
  radius: f32,
  // 0 leaves the DOM paper untouched, 1 is the full lamp.
  intensity: f32,
  // xyz: lamp position in local px; z is its height above the paper.
  // w: how far the canvas overhangs the paper on each side, in local px.
  light: vec4f,
  seed: vec2f,
  // Height the curl lifts the paper, in local px.
  curl: f32,
  // 0: a sheet curling at one corner, 1: a sticky note lifting at its foot.
  kind: f32,
  curlCorner: vec2f,
  curlRadius: f32,
  // Scales every texture layer's relief.
  relief: f32,
  // How much of each layer: x pulp, y fibres, z wrinkles; w is unused.
  // Periodic patterns (laid lines) are left out on purpose: the eye picks up
  // regular stripes at far lower contrast than grain, and near the pixel
  // pitch they alias into moiré.
  texture: vec4f,
  // x: how glossy the coating is (photo paper); y: 0 for the shading pass
  // (multiplied), 1 for the gloss pass (screened over the sheet).
  finish: vec4f,
}

@group(0) @binding(0) var<uniform> paper: Paper;

struct VertexOut {
  @builtin(position) position: vec4f,
  @location(0) local: vec2f,
}

@vertex
fn vs(@builtin(vertex_index) index: u32) -> VertexOut {
  let corner = vec2f(f32(index & 1u), f32(index >> 1u));
  var out: VertexOut;
  out.position = vec4f(corner * vec2f(2.0, -2.0) + vec2f(-1.0, 1.0), 0.0, 1.0);
  let margin = paper.light.w;
  out.local = corner * (paper.size + vec2f(margin * 2.0)) - vec2f(margin);
  return out;
}

const TAU = 6.2831853;
const LAMP_COLOR = vec3f(1.0, 0.94, 0.84);
// The curl's shadow is capped like every other lamp shadow (lamp-shadow.ts).
const MAX_SHADOW_REACH = 1.6;

// Sizes and heights below are in local px. Real paper texture is far finer
// than a pixel at rest; these keep it a fine tooth that reads under the lamp.
const PULP_WAVELENGTH = 1.6;
const PULP_HEIGHT = 0.06;
// Fibres: thin threads along a noise field's isolines, which curl.
const FIBRE_WAVELENGTH = 16.0;
const FIBRE_WIDTH = 0.35;
const FIBRE_HEIGHT = 0.1;
// Wrinkles: faceted cells, each tilted its own way, with soft creases.
const WRINKLE_CELL = 46.0;
const WRINKLE_TILT = 0.05;
const CREASE_SOFTNESS = 0.07;

fn hash(p: vec2f) -> f32 {
  let q = fract(p * vec2f(0.1031, 0.1030));
  let r = q + dot(q, q.yx + 33.33);
  return fract((r.x + r.y) * r.x);
}

fn hash2(p: vec2f) -> vec2f {
  return vec2f(hash(p), hash(p + vec2f(19.19, 7.31)));
}

fn rotate(v: vec2f, angle: f32) -> vec2f {
  let c = cos(angle);
  let s = sin(angle);
  return vec2f(c * v.x - s * v.y, s * v.x + c * v.y);
}

// Value noise and its gradient: (value, d/dx, d/dy).
fn noised(p: vec2f) -> vec3f {
  let i = floor(p);
  let f = fract(p);
  let u = f * f * (3.0 - 2.0 * f);
  let du = 6.0 * f * (1.0 - f);
  let a = hash(i);
  let b = hash(i + vec2f(1.0, 0.0));
  let c = hash(i + vec2f(0.0, 1.0));
  let d = hash(i + vec2f(1.0, 1.0));
  let k = a - b - c + d;
  return vec3f(
    a + (b - a) * u.x + (c - a) * u.y + k * u.x * u.y,
    du * vec2f(b - a + k * u.y, c - a + k * u.x),
  );
}

// How much of a feature `size` local px across survives when one device
// pixel covers `footprint` local px. Finer detail would only alias into
// coarse noise, so it fades out, and returns as the camera zooms in.
fn resolved(size: f32, footprint: f32) -> f32 {
  return smoothstep(1.0, 2.5, size / footprint);
}

// Pressed pulp: an even, isotropic tooth.
fn pulpSlope(p: vec2f, footprint: f32) -> vec2f {
  var slope = vec2f(0.0);
  var amplitude = 0.5;
  var wavelength = PULP_WAVELENGTH;
  var offset = paper.seed;
  for (var i = 0; i < 3; i++) {
    let n = noised(p / wavelength + offset);
    slope += amplitude * n.yz / wavelength * resolved(wavelength, footprint);
    wavelength /= 2.03;
    amplitude *= 0.5;
    offset += vec2f(17.1, 9.2);
  }
  return slope * PULP_HEIGHT;
}

// Fibres: where smooth noise crosses one half, its isoline curls through the
// sheet; a thin ridge along it reads as a thread. Each layer turns and
// shrinks, and a second noise thins the threads out into patches.
// Returns the slope and how much thread covers the point.
fn fibreSlope(p: vec2f, footprint: f32) -> vec3f {
  var slope = vec2f(0.0);
  var cover = 0.0;
  var wavelength = FIBRE_WAVELENGTH;
  for (var i = 0; i < 3; i++) {
    let angle = f32(i) * 0.8 + paper.seed.x;
    let q = rotate(p, angle) / wavelength + paper.seed + vec2f(f32(i) * 7.3, 0.0);
    let n = noised(q);
    let gradient = max(length(n.yz), 0.15);
    let offset = n.x - 0.5;
    // Distance to the isoline in px, from the noise and its gradient.
    let across = abs(offset) / gradient * wavelength / FIBRE_WIDTH;
    let ridge = exp(-across * across);
    let clump = smoothstep(0.5, 0.8, noised(q * 0.37 + vec2f(3.1, 8.7)).x);
    let fade = resolved(FIBRE_WIDTH * 2.0, footprint) * clump;
    // d(ridge)/dq along the noise gradient, turned back into the sheet's axes.
    let along = -2.0 * across * ridge * sign(offset) / (FIBRE_WIDTH / wavelength)
      * n.yz / gradient;
    slope += rotate(along, -angle) / wavelength * fade;
    cover += ridge * fade;
    wavelength /= 1.7;
  }
  return vec3f(slope * FIBRE_HEIGHT, cover);
}

// One layer of facets: the nearest cell's tilt, eased into the next cell's
// across a soft crease on the border between them.
fn facetSlope(p: vec2f, cell: f32, salt: f32) -> vec2f {
  let v = p / cell;
  let base = floor(v);
  var near = 9.0;
  var second = 9.0;
  var nearSite = vec2f(0.0);
  var secondSite = vec2f(0.0);
  var nearTilt = vec2f(0.0);
  var secondTilt = vec2f(0.0);
  for (var y = -1; y <= 1; y++) {
    for (var x = -1; x <= 1; x++) {
      let c = base + vec2f(f32(x), f32(y));
      let site = c + 0.1 + 0.8 * hash2(c + paper.seed * 13.0 + salt);
      let toSite = v - site;
      let squared = dot(toSite, toSite);
      let random = hash2(c * 1.7 + paper.seed.yx + salt + 5.3);
      let tilt = vec2f(cos(random.x * TAU), sin(random.x * TAU)) * mix(0.3, 1.0, random.y);
      if (squared < near) {
        second = near;
        secondSite = nearSite;
        secondTilt = nearTilt;
        near = squared;
        nearSite = site;
        nearTilt = tilt;
      } else if (squared < second) {
        second = squared;
        secondSite = site;
        secondTilt = tilt;
      }
    }
  }
  let toBorder = (second - near) / (2.0 * max(length(nearSite - secondSite), 1e-4));
  let blend = smoothstep(0.0, CREASE_SOFTNESS, toBorder);
  let middle = 0.5 * (nearTilt + secondTilt);
  return middle + (nearTilt - middle) * blend;
}

fn wrinkleSlope(p: vec2f, footprint: f32) -> vec2f {
  let coarse = facetSlope(p, WRINKLE_CELL, 0.0);
  let fine = facetSlope(p + vec2f(31.7, 11.3), WRINKLE_CELL / 2.3, 17.0)
    * resolved(WRINKLE_CELL * CREASE_SOFTNESS, footprint);
  return (coarse + 0.45 * fine) * WRINKLE_TILT;
}

// Curl height and its slope.
fn curlField(p: vec2f) -> vec3f {
  var t = 0.0;
  var dt = vec2f(0.0);
  if (paper.kind < 0.5) {
    // Paper only bends one way: the corner rolls up around a line across the
    // diagonal, like a cylinder, rather than rising as a dome.
    let toward = sign(paper.curlCorner - paper.size * 0.5) * 0.70710678;
    t = 1.0 - dot(paper.curlCorner - p, toward) / paper.curlRadius;
    dt = toward / paper.curlRadius;
  } else {
    t = (p.y - (paper.size.y - paper.curlRadius)) / paper.curlRadius;
    dt = vec2f(0.0, 1.0 / paper.curlRadius);
  }
  let lift = clamp(t, 0.0, 1.0);
  let bending = select(0.0, 1.0, t > 0.0 && t < 1.0);
  // Flat until the bend, then rising ever faster toward the edge.
  return vec3f(
    paper.curl * lift * lift * lift,
    paper.curl * 3.0 * lift * lift * bending * dt,
  );
}

// Signed distance to the paper's rounded rectangle.
fn roundedBox(p: vec2f) -> f32 {
  let half = paper.size * 0.5;
  let q = abs(p - half) - half + vec2f(paper.radius);
  return length(max(q, vec2f(0.0))) + min(max(q.x, q.y), 0.0) - paper.radius;
}

@fragment
fn fs(in: VertexOut) -> @location(0) vec4f {
  let p = in.local;
  // Local px under one device pixel; changes with camera zoom and DPR.
  let footprint = max(fwidth(p.x), fwidth(p.y));

  let curl = curlField(p);
  let fibres = fibreSlope(p, footprint);
  let texture = paper.texture.x * pulpSlope(p, footprint)
    + paper.texture.y * fibres.xy
    + paper.texture.z * wrinkleSlope(p, footprint);
  let slope = curl.yz + texture * paper.relief;
  let n = normalize(vec3f(-slope, 1.0));

  let lamp = paper.light.xyz;
  let l = normalize(lamp - vec3f(p, curl.x));
  let flatLight = normalize(lamp - vec3f(p, 0.0));
  let lampDistance = length(lamp - vec3f(p, 0.0));
  // A distant lamp lights the paper less, so its relief shows less.
  let falloff = 1.0 / (1.0 + pow(lampDistance / (lamp.z * 1.9), 2.0));
  // The change in light against flat paper, not their ratio: dividing by
  // the flat term multiplied the grain up to 12x under grazing light.
  let delta = max(dot(n, l), 0.0) - flatLight.z;
  // Fibres sit denser in the sheet and read faintly even in flat light.
  let fibreTint = 1.0 - 0.03 * paper.texture.y * fibres.z;
  // White paper cannot get brighter than white, so flat paper sits a touch
  // below it and only faces turned to the lamp reach full white.
  let shade = clamp((0.975 + delta * 1.4 * falloff) * fibreTint, 0.0, 1.0);
  let tone = mix(1.0, shade, paper.intensity);

  let coverage = clamp(0.5 - roundedBox(p), 0.0, 1.0);

  // Shadow of the lifted curl on the desk beside the paper: find the paper
  // point above this desk point as seen from the lamp, at the curl's height.
  let edge = clamp(p, vec2f(0.0), paper.size);
  let lift = curlField(edge).x;
  let toward = lamp.xy - p;
  let reach = min(
    length(toward) * lift / max(lamp.z - lift, 1.0),
    lift * MAX_SHADOW_REACH,
  );
  let shift = toward * reach / max(length(toward), 0.0001);
  let softness = 1.0 + lift * 0.6;
  let occluded = smoothstep(softness, -softness, roundedBox(p + shift));
  let shadow = occluded * smoothstep(0.0, 2.0, lift)
    * (0.06 + 0.16 * falloff) * paper.intensity;

  if (paper.finish.y > 0.5) {
    // Gloss pass: a coated print mirrors the lamp as a soft hotspot that
    // slides across it and bends over the curl, plus a wide, faint sheen.
    let halfway = normalize(l + vec3f(0.0, 0.0, 1.0));
    let nh = max(dot(n, halfway), 0.0);
    let reflection = pow(nh, 90.0) * 0.32 + pow(nh, 12.0) * 0.05;
    let gloss = LAMP_COLOR * reflection * paper.finish.x * falloff * paper.intensity;
    return vec4f(gloss * coverage, coverage);
  }

  // Premultiplied: grey shading over the paper, black shadow off it.
  let alpha = coverage + (1.0 - coverage) * shadow;
  return vec4f(vec3f(tone) * coverage, alpha);
}
