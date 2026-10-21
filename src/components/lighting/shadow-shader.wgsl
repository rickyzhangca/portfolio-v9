// The desk lamp's shadow of one rounded-rectangle caster (a print, a sheet),
// drawn on a canvas behind it. It is the shadow a CSS drop-shadow of the
// caster draws, a Gaussian blur of its outline, worked out in closed form
// instead of blurred: across a straight edge a blurred outline is the
// Gaussian's integral, an erf of the distance to the edge, and the corners
// follow the rounded box's distance field. Units are the caster's own CSS px.

struct Shadow {
  size: vec2f,
  radius: f32,
  // How far the canvas overhangs the caster on each side.
  margin: f32,
  // xy: offset away from the lamp; z: blur, the Gaussian's standard
  // deviation (as drop-shadow reads it); w: opacity, 0 draws nothing.
  drop: vec4f,
}

@group(0) @binding(0) var<uniform> shadow: Shadow;

struct VertexOut {
  @builtin(position) position: vec4f,
  @location(0) local: vec2f,
}

@vertex
fn vs(@builtin(vertex_index) index: u32) -> VertexOut {
  let corner = vec2f(f32(index & 1u), f32(index >> 1u));
  var out: VertexOut;
  out.position = vec4f(corner * vec2f(2.0, -2.0) + vec2f(-1.0, 1.0), 0.0, 1.0);
  out.local = corner * (shadow.size + vec2f(shadow.margin * 2.0)) - vec2f(shadow.margin);
  return out;
}

// The DOM shadows' tint and depth (lamp-shadow.ts): rgb(28 36 59), with
// opacity raised 1.16x so the tint darkens as much as black would.
const SHADOW_TINT = vec3f(0.1098, 0.1412, 0.2314);
const SHADOW_DEPTH = 1.16;

// Signed distance to the caster's rounded rectangle.
fn roundedBox(p: vec2f) -> f32 {
  let half = shadow.size * 0.5;
  let q = abs(p - half) - half + vec2f(shadow.radius);
  return length(max(q, vec2f(0.0))) + min(max(q.x, q.y), 0.0) - shadow.radius;
}

// Abramowitz and Stegun 7.1.26: within 1.5e-7 of erf.
fn erf(x: f32) -> f32 {
  let a = abs(x);
  let t = 1.0 / (1.0 + 0.3275911 * a);
  let poly = ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t
    - 0.284496736) * t + 0.254829592) * t;
  return sign(x) * (1.0 - poly * exp(-a * a));
}

@fragment
fn fs(in: VertexOut) -> @location(0) vec4f {
  let distance = roundedBox(in.local - shadow.drop.xy);
  let deviation = max(shadow.drop.z, 0.25);
  let cover = 0.5 - 0.5 * erf(distance / (deviation * 1.4142136));
  let alpha = cover * min(shadow.drop.w * SHADOW_DEPTH, 1.0);
  // Premultiplied.
  return vec4f(SHADOW_TINT * alpha, alpha);
}
