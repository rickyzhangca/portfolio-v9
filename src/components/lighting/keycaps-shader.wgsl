// Draws the fun-project icons under the desk lamp as plastic keycaps lying on
// the desk, each with its icon printed on its top. The DOM draws the icons in
// the socials keyboard's oblique view (keyboard-shader.wgsl), where a height
// of z lifts a point z px up the screen: a cap's top shows above its front.
// A cap is a rounded square extruded into a soft pillow: its top rolls over
// into its sides along a quarter circle and its foot tucks under along a
// smaller one, so the ray is marched down the cap's height, as the keyboard's
// sloped caps are. Caps the pointer lifts float off the desk, and shade the
// desk and their neighbours.
// Units are the card's untransformed CSS px ("local px"); x runs right, y
// down and z up out of the desk. A footprint is where a cap stands in the
// desk's plane: a point drawn at screen y on a face at height z has y + z.

const MAX_CAPS = 12;

struct Cap {
  // Where the cap's top edge is drawn at rest, and its footprint's size.
  top: vec4f,
  // x: the underside's height above the desk (the cap's lift), y: the cap's
  // thickness, z: speckle in the plastic, w: unused.
  shape: vec4f,
  // The plastic's colour (sRGB) at the cap's far edge and at its foot.
  far: vec4f,
  near: vec4f,
}

struct Scene {
  size: vec2f,
  // 0 leaves the caps unlit, 1 is the full lamp.
  intensity: f32,
  count: f32,
  // xyz: lamp position relative to the card's top left, z above the desk;
  // w: the canvas margin around the card for shadows, in local px.
  light: vec4f,
  // x: the footprint's corner radius, y: the radius the top rolls over
  // with, z: the radius the foot tucks under with. w: unused.
  shape: vec4f,
  caps: array<Cap, MAX_CAPS>,
}

@group(0) @binding(0) var<uniform> scene: Scene;
@group(0) @binding(1) var glyphs: texture_2d_array<f32>;
@group(0) @binding(2) var glyphSampler: sampler;

struct VertexOut {
  @builtin(position) position: vec4f,
  @location(0) local: vec2f,
}

@vertex
fn vs(@builtin(vertex_index) index: u32) -> VertexOut {
  let corner = vec2f(f32(index & 1u), f32(index >> 1u));
  let margin = scene.light.w;
  var out: VertexOut;
  out.position = vec4f(corner * vec2f(2.0, -2.0) + vec2f(-1.0, 1.0), 0.0, 1.0);
  out.local = corner * (scene.size + vec2f(margin * 2.0)) - vec2f(margin);
  return out;
}

const LAMP_COLOR = vec3f(1.0, 0.97, 0.92);
// Towards the viewer of the oblique view: up the screen as much as out of it.
const VIEW = vec3f(0.0, 0.70710678, 0.70710678);
// Shadows: penumbra growth with distance (1 / the lamp's apparent radius)
// and its limits. Softer than the keyboard's, so a lifted cap's shadow
// spreads into a wide, faint haze rather than a dark copy of the cap.
const SHADOW_SOFTNESS = 1.4;
const MIN_PENUMBRA = 2.0;
const MAX_PENUMBRA = 40.0;
// How much a cap's shadow pales as it lifts: by half at this height.
const SHADOW_FADE_LIFT = 20.0;
const SHADOW_STEPS = 6;
// Lit as the keyboard is: summed in linear light, tone mapped, and encoded
// back to sRGB.
const ROOM_LIGHT = 0.95;
const LAMP_LIGHT = 0.8;
const EXPOSURE = 1.5;
const WHITE_POINT = 2.0;
// Soft-touch plastic: a faint, broad sheen of the lamp, no sharp glint.
const PLASTIC_LOBES = vec4f(0.05, 20.0, 0.04, 3.0);
// How far the top domes: the tilt at its edge, as a share of its width.
const DOME = 0.12;
// The print's size on the cap's top, as a share of the footprint's width.
const GLYPH_SCALE = 0.8;
// Steps down a cap's height when looking for its rounded side.
const CAP_STEPS = 16;

fn sdRoundRect(p: vec2f, rect: vec4f, radius: f32) -> f32 {
  let half = rect.zw * 0.5;
  let r = min(radius, min(half.x, half.y));
  let q = abs(p - (rect.xy + half)) - half + vec2f(r);
  return length(max(q, vec2f(0.0))) + min(max(q.x, q.y), 0.0) - r;
}

// The outward direction of a rounded rectangle's edge nearest p.
fn edgeNormal(p: vec2f, rect: vec4f, radius: f32) -> vec2f {
  let e = vec2f(0.25, 0.0);
  let g = vec2f(
    sdRoundRect(p + e.xy, rect, radius) - sdRoundRect(p - e.xy, rect, radius),
    sdRoundRect(p + e.yx, rect, radius) - sdRoundRect(p - e.yx, rect, radius),
  );
  return g / max(length(g), 1e-5);
}

// Where a rounded rectangle's column at x starts and ends in y, or x > y
// when x misses it.
fn column(x: f32, rect: vec4f, radius: f32) -> vec2f {
  let half = rect.zw * 0.5;
  let center = rect.xy + half;
  let r = min(radius, min(half.x, half.y));
  let dx = abs(x - center.x);
  if (dx > half.x) {
    return vec2f(1.0, 0.0);
  }
  let corner = dx - (half.x - r);
  var reach = half.y;
  if (corner > 0.0) {
    reach = half.y - r + sqrt(max(r * r - corner * corner, 0.0));
  }
  return vec2f(center.y - reach, center.y + reach);
}

fn capCount() -> i32 {
  return min(i32(scene.count + 0.5), MAX_CAPS);
}

fn cornerRadius() -> f32 {
  return scene.shape.x;
}

fn footprint(i: i32) -> vec4f {
  return scene.caps[i].top + vec4f(0.0, scene.caps[i].shape.y, 0.0, 0.0);
}

fn capBottom(i: i32) -> f32 {
  return scene.caps[i].shape.x;
}

fn capTop(i: i32) -> f32 {
  return scene.caps[i].shape.x + scene.caps[i].shape.y;
}

// How far in from its footprint cap i's outline is at height z: the top's
// roll and the foot's tuck are quarter circles.
fn insetAt(i: i32, z: f32) -> f32 {
  let roll = scene.shape.y;
  let fromTop = z - (capTop(i) - roll);
  if (fromTop > 0.0) {
    return roll - sqrt(max(roll * roll - fromTop * fromTop, 0.0));
  }
  let foot = scene.shape.z;
  let fromFoot = capBottom(i) + foot - z;
  if (fromFoot > 0.0) {
    return foot - sqrt(max(foot * foot - fromFoot * fromFoot, 0.0));
  }
  return 0.0;
}

fn outline(i: i32, inset: f32) -> vec4f {
  return footprint(i) + vec4f(vec2f(inset), vec2f(-2.0 * inset));
}

fn outlineRadius(inset: f32) -> f32 {
  return max(cornerRadius() - inset, 0.5);
}

fn insideCap(s: vec2f, i: i32, z: f32) -> bool {
  let inset = insetAt(i, z);
  return sdRoundRect(vec2f(s.x, s.y + z), outline(i, inset), outlineRadius(inset)) <= 0.0;
}

// The height the view ray through s meets cap i at, or -1 for a miss. It
// steps down the cap's height, then bisects the step it entered in.
fn capHit(s: vec2f, i: i32) -> f32 {
  let bottom = capBottom(i);
  let top = capTop(i);
  let span = column(s.x, footprint(i), cornerRadius());
  if (span.x > span.y || s.y + bottom > span.y || s.y + top < span.x) {
    return -1.0;
  }
  if (insideCap(s, i, top)) {
    return top;
  }
  var above = top;
  for (var k = 1; k <= CAP_STEPS; k++) {
    let z = mix(top, bottom, f32(k) / f32(CAP_STEPS));
    if (insideCap(s, i, z)) {
      var inside = z;
      var outside = above;
      for (var b = 0; b < 6; b++) {
        let middle = 0.5 * (inside + outside);
        if (insideCap(s, i, middle)) {
          inside = middle;
        } else {
          outside = middle;
        }
      }
      return inside;
    }
    above = z;
  }
  return -1.0;
}

struct Hit {
  z: f32,
  // -1 for the desk.
  index: i32,
}

// What the view ray through s meets first: nearer the viewer is higher,
// since the ray falls as it runs up the desk.
fn hitAt(s: vec2f) -> Hit {
  var hit = Hit(-1.0, -1);
  for (var i = 0; i < capCount(); i++) {
    let z = capHit(s, i);
    if (z >= 0.0 && z > hit.z) {
      hit = Hit(z, i);
    }
  }
  return hit;
}

// How much of the lamp reaches p past one cap, softened by how near the
// shadow ray passes to it for how far it has come.
fn visiblePast(p: vec3f, lamp: vec3f, rect: vec4f, radius: f32, z0: f32, z1: f32) -> f32 {
  let toLamp = lamp - p;
  if (z1 <= p.z + 0.01 || toLamp.z <= 0.0) {
    return 1.0;
  }
  let start = max(z0 - p.z, 0.0) / toLamp.z;
  let end = (z1 - p.z) / toLamp.z;
  let reach = length(toLamp);
  var visible = 1.0;
  for (var i = 0; i < SHADOW_STEPS; i++) {
    let t = mix(start, end, f32(i) / f32(SHADOW_STEPS - 1));
    let q = p + toLamp * t;
    let penumbra = clamp(t * reach / SHADOW_SOFTNESS, MIN_PENUMBRA, MAX_PENUMBRA);
    visible = min(visible, sdRoundRect(q.xy, rect, radius) / penumbra);
  }
  return visible;
}

// The lamp as shadows see it from p: no further off than casts a shadow 1.6
// times as long as the caster is tall, as the DOM shadows are capped
// (lamp-shadow.ts).
fn shadowLamp(p: vec3f) -> vec3f {
  let lamp = scene.light.xyz;
  let away = lamp.xy - p.xy;
  let reach = 1.6 * (lamp.z - p.z);
  let distance = length(away);
  if (distance <= reach) {
    return lamp;
  }
  return vec3f(p.xy + away * (reach / distance), lamp.z);
}

// How much of the lamp reaches p past every cap but its own (-1 for none):
// a cap is convex, so it never shades itself. Shadows are cast by the
// cap's body, its rounded edges taken in a little, and pale as it lifts:
// further from what it shades, it blocks less of the lamp's glow.
fn visibility(p: vec3f, own: i32) -> f32 {
  let lamp = shadowLamp(p);
  let inset = scene.shape.y * 0.3;
  var visible = 1.0;
  for (var i = 0; i < capCount(); i++) {
    let top = capTop(i);
    if (i == own || top <= p.z + 0.01) {
      continue;
    }
    let rect = outline(i, inset);
    // No shadow reaches further than its length plus its blur.
    if (sdRoundRect(p.xy, rect, outlineRadius(inset)) > 1.6 * top + MAX_PENUMBRA) {
      continue;
    }
    let past = visiblePast(p, lamp, rect, outlineRadius(inset), capBottom(i), top);
    let lift = max(capBottom(i) - p.z, 0.0);
    visible = min(visible, mix(past, 1.0, lift / (lift + SHADOW_FADE_LIFT) * 0.5));
  }
  return smoothstep(0.0, 1.0, clamp(visible, 0.0, 1.0));
}

fn falloffAt(p: vec3f) -> f32 {
  let lamp = scene.light.xyz;
  return 1.0 / (1.0 + pow(length(lamp - p) / (lamp.z * 1.9), 2.0));
}

fn toLinear(c: vec3f) -> vec3f {
  return pow(max(c, vec3f(0.0)), vec3f(2.2));
}

fn toSrgb(c: vec3f) -> vec3f {
  return pow(clamp(c, vec3f(0.0), vec3f(1.0)), vec3f(1.0 / 2.2));
}

// A point on cap `own` lit by the room and the lamp.
fn lit(p: vec3f, n: vec3f, albedo: vec3f, own: i32, occlusion: f32) -> vec3f {
  let l = normalize(scene.light.xyz - p);
  let falloff = falloffAt(p);
  let shadow = visibility(p, own);
  // Faces turned from the room's light (the sides, the foot) see less of it.
  let room = (0.55 + 0.45 * n.z) * occlusion;
  let diffuse = max(dot(n, l), 0.0) * falloff * shadow;
  let nh = max(dot(n, normalize(l + VIEW)), 0.0);
  let lobes = PLASTIC_LOBES;
  let shine = (pow(nh, lobes.y) * lobes.x + pow(nh, lobes.w) * lobes.z) * falloff * shadow;
  let light = (toLinear(albedo) * (ROOM_LIGHT * room + LAMP_LIGHT * diffuse)
    + toLinear(LAMP_COLOR) * shine) * EXPOSURE;
  let color = toSrgb(light * (1.0 + light / (WHITE_POINT * WHITE_POINT)) / (1.0 + light));
  return mix(albedo, color, scene.intensity);
}

fn hash(p: vec2f) -> f32 {
  return fract(sin(dot(p, vec2f(12.9898, 78.233))) * 43758.5453);
}

// Glyph texels per local px across cap i.
fn texelsPerPx(i: i32) -> f32 {
  return f32(textureDimensions(glyphs).x) / scene.caps[i].top.z;
}

// The plastic of cap i at footprint point q, drawn at screen y `drawnY`: a
// gradient down the cap as it is seen, speckled in glyph texels so the grain
// stays put as the cap moves.
fn plastic(i: i32, q: vec2f, drawnY: f32) -> vec3f {
  let cap = scene.caps[i];
  let drawnTop = cap.top.y - cap.shape.x;
  let t = clamp((drawnY - drawnTop) / (cap.top.w + cap.shape.y), 0.0, 1.0);
  var color = mix(cap.far.rgb, cap.near.rgb, t);
  let grain = cap.shape.z;
  if (grain > 0.0) {
    let texel = floor((q - footprint(i).xy) * texelsPerPx(i));
    color *= 1.0 + (hash(texel) - 0.5) * 0.16 * grain;
  }
  return color;
}

// Cap i's print at footprint point q, premultiplied.
fn glyphAt(i: i32, q: vec2f, pixel: f32) -> vec4f {
  let rect = footprint(i);
  let uv = (q - (rect.xy + rect.zw * 0.5)) / (rect.zw * GLYPH_SCALE) + 0.5;
  if (any(uv < vec2f(0.0)) || any(uv > vec2f(1.0))) {
    return vec4f(0.0);
  }
  let lod = log2(max(texelsPerPx(i) / GLYPH_SCALE * pixel, 1.0));
  return textureSampleLevel(glyphs, glyphSampler, uv, i, lod);
}

// Cap i at p: the printed top, which domes gently and rolls over into the
// sides, or the foot tucking under towards the desk.
fn shadeCap(p: vec3f, i: i32, pixel: f32, drawnY: f32) -> vec3f {
  let rect = footprint(i);
  let center = rect.xy + rect.zw * 0.5;
  let dome = -(p.xy - center) * (DOME * 2.0) / rect.z;
  let top = capTop(i);
  let roll = scene.shape.y;
  let foot = scene.shape.z;
  var n = normalize(vec3f(dome, 1.0));
  if (p.z < top - 0.01) {
    let inset = insetAt(i, p.z);
    let outward = edgeNormal(p.xy, outline(i, inset), outlineRadius(inset));
    let fromTop = p.z - (top - roll);
    let fromFoot = capBottom(i) + foot - p.z;
    if (fromTop > 0.0) {
      // The roll: turning from the dome at its crest to the side.
      let up = clamp(fromTop / roll, 0.0, 1.0);
      n = normalize(vec3f(outward * sqrt(1.0 - up * up) + dome * up, up));
    } else if (fromFoot > 0.0) {
      let down = clamp(fromFoot / foot, 0.0, 1.0);
      n = vec3f(outward * sqrt(1.0 - down * down), -down);
    } else {
      n = vec3f(outward, 0.0);
    }
  }
  // A resting cap's foot is hidden from the room by the desk.
  let resting = 1.0 - smoothstep(0.0, 6.0, capBottom(i));
  let occlusion = mix(1.0, mix(0.7, 1.0, smoothstep(0.0, roll, p.z)), resting);
  var albedo = plastic(i, p.xy, drawnY);
  if (p.z > top - roll) {
    let glyph = glyphAt(i, p.xy, pixel);
    albedo = albedo * (1.0 - glyph.a) + glyph.rgb;
  }
  return lit(p, n, albedo, i, occlusion);
}

// The caps' shadow on the desk at p: the lamp's, and the soft dark where a
// cap meets the desk, which fades and spreads as the cap lifts off it.
fn deskShadow(p: vec3f) -> f32 {
  let hidden = 1.0 - visibility(p, -1);
  let strength = (0.08 + 0.16 * falloffAt(p)) * 0.9;
  let lamp = hidden * hidden * strength;
  var contact = 0.0;
  for (var i = 0; i < capCount(); i++) {
    let lift = capBottom(i);
    let d = sdRoundRect(p.xy, footprint(i), cornerRadius());
    let footShadow = (1.0 - smoothstep(-4.0, 5.0 + lift, d)) * 0.2 / (1.0 + lift * 0.15);
    contact = max(contact, footShadow);
  }
  return (1.0 - (1.0 - lamp) * (1.0 - contact)) * scene.intensity;
}

// Premultiplied colour at screen point s, for what the ray there meets.
fn shade(s: vec2f, hit: Hit, pixel: f32) -> vec4f {
  if (hit.index < 0) {
    return vec4f(0.0, 0.0, 0.0, deskShadow(vec3f(s, 0.0)));
  }
  let p = vec3f(s.x, s.y + hit.z, hit.z);
  return vec4f(shadeCap(p, hit.index, pixel, s.y), 1.0);
}

@fragment
fn fs(in: VertexOut) -> @location(0) vec4f {
  // Local px under one device pixel; changes with camera zoom and DPR.
  let pixel = max(fwidth(in.local.x), fwidth(in.local.y));
  // Four samples smooth the silhouettes the ray cast leaves hard. Finding
  // what each sample meets is cheap and lighting it is not, so a pixel
  // whose samples all meet the same thing is lit once.
  let center = hitAt(in.local);
  var hits: array<Hit, 4>;
  var same = true;
  for (var i = 0; i < 4; i++) {
    let offset = (vec2f(f32(i & 1), f32(i >> 1u)) - 0.5) * 0.5 * pixel;
    hits[i] = hitAt(in.local + offset);
    same = same && hits[i].index == center.index;
  }
  if (same) {
    return shade(in.local, center, pixel);
  }
  var sum = vec4f(0.0);
  for (var i = 0; i < 4; i++) {
    let offset = (vec2f(f32(i & 1), f32(i >> 1u)) - 0.5) * 0.5 * pixel;
    sum += shade(in.local + offset, hits[i], pixel);
  }
  return sum * 0.25;
}
