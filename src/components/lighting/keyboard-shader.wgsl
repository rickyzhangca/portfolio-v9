// Draws the socials keyboard under the desk lamp: an aluminium chassis with
// three keycaps (low-profile, or sculpted mechanical caps with sloped sides),
// legends printed on their tops, and a toggle whose
// cylindrical knob slides between three stops in a groove milled into the
// chassis, each marked beside it. The DOM
// keyboard is drawn in an oblique view, where a height of z lifts a point z px
// up the screen, so its front faces show; the shader keeps that view. Every
// part is an extruded rounded rectangle (the knob a round one, the groove a
// rounded pocket), so a view ray is intersected with each analytically, and
// shadows test the same shapes. The keyboard casts its own shadow onto the
// desk around it.
// Units are the card's untransformed CSS px ("local px"); x runs right, y
// down and z up out of the desk. A footprint is where a part stands in the
// desk's plane: a point drawn at screen y on a face at height z has y + z.

struct Keyboard {
  size: vec2f,
  // 0 leaves the keyboard unlit, 1 is the full lamp.
  intensity: f32,
  // The look, as the toggle's position: 0 Logitech (round, dished caps),
  // 1 Apple (flat caps), 2 mechanical (tall, sloped, sculpted caps).
  mode: f32,
  // xyz: lamp position relative to the card's top left, z above the desk;
  // w: the canvas margin around the card for the shadow, in local px.
  light: vec4f,
  // The chassis's top face as drawn (screen px, at the chassis's height).
  chassis: vec4f,
  // Each key's slot as drawn on the chassis's top face.
  keys: array<vec4f, 3>,
  // The toggle's track and its knob at rest, as drawn on the top face.
  track: vec4f,
  knob: vec4f,
  // xyz: each keycap's height above the chassis; w: the knob's travel down
  // the track.
  travel: vec4f,
  // x: chassis height, y: chassis corner radius, z: keycap corner radius,
  // w: depth of the caps' round dish.
  shape: vec4f,
  // x: how far a keycap's top is inset from its foot (its sloped sides),
  // y: depth of the cylindrical dish across its top. zw: unused.
  cap: vec4f,
}

@group(0) @binding(0) var<uniform> kb: Keyboard;
@group(0) @binding(1) var legends: texture_2d_array<f32>;
@group(0) @binding(2) var legendSampler: sampler;

struct VertexOut {
  @builtin(position) position: vec4f,
  @location(0) local: vec2f,
}

@vertex
fn vs(@builtin(vertex_index) index: u32) -> VertexOut {
  let corner = vec2f(f32(index & 1u), f32(index >> 1u));
  let margin = kb.light.w;
  var out: VertexOut;
  out.position = vec4f(corner * vec2f(2.0, -2.0) + vec2f(-1.0, 1.0), 0.0, 1.0);
  out.local = corner * (kb.size + vec2f(margin * 2.0)) - vec2f(margin);
  return out;
}

const LAMP_COLOR = vec3f(1.0, 0.97, 0.92);
// Shadows lean cool: where the warm lamp is blocked, only the room's light
// is left. A tint darkens less than black, so its opacity is raised to keep
// shadows as deep. Both match the DOM shadows (lamp-shadow.ts).
const SHADOW_TINT = vec3f(0.11, 0.14, 0.23);
const SHADOW_DEPTH = 1.16;
// Towards the viewer of the oblique view: up the screen as much as out of it.
const VIEW = vec3f(0.0, 0.70710678, 0.70710678);
// Rounded edges, in local px.
const CHASSIS_BEVEL = 2.0;
const KEY_BEVEL = 1.5;
// Steps down a keycap's height when looking for its sloped side.
const CAP_STEPS = 16;
// Tick marks printed beside the groove at each stop, as the DOM draws them:
// their gap from the groove, length and width, in local px.
const TICK_GAP = 4.0;
const TICK_LENGTH = 6.0;
const TICK_WIDTH = 1.5;
// A legend's box on its keycap, in local px.
const LEGEND_SIZE = 24.0;
const LEGEND_COLOR = vec3f(0.906);
// The dish stops this far inside the keycap's edge.
const DISH_INSET = 4.0;
// The toggle's groove, sunk into the chassis's top face.
const GROOVE_DEPTH = 4.0;
const GROOVE_LIP = 1.2;
// The knob: a short steel cylinder standing on the groove's floor, nearly as
// wide as the groove, and rising above the face.
const KNOB_RADIUS = 9.0;
const KNOB_RISE = 5.0;
const KNOB_BEVEL = 1.2;
// Shadows: penumbra growth with distance (1 / the lamp's apparent radius)
// and its limits, as the badge's (badge-shader.wgsl).
const SHADOW_SOFTNESS = 2.5;
const MIN_PENUMBRA = 2.0;
const MAX_PENUMBRA = 16.0;
const SHADOW_STEPS = 6;
// Light the room gives every face, and how much the lamp adds.
// Lit as the email card is (email-shader.wgsl): summed in linear light,
// tone mapped, and encoded back to sRGB, so metal stays clean away from the
// lamp, and shadows and turned faces give the dark.
const ROOM_LIGHT = 0.95;
const LAMP_LIGHT = 0.8;
const EXPOSURE = 1.5;
const WHITE_POINT = 2.0;

const PART_DESK = 0;
const PART_CHASSIS = 1;
const PART_KEY = 2;
const PART_KNOB = 3;

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

// The view ray through screen point s against a footprint extruded from
// height z0 to z1: x is the height it meets it at (-1 for a miss), y is 0 on
// the top face and 1 on the front wall. The ray falls as it runs up the
// footprint, so the first face it meets is the highest.
fn extrusion(s: vec2f, rect: vec4f, radius: f32, z0: f32, z1: f32) -> vec2f {
  let span = column(s.x, rect, radius);
  if (span.x > span.y) {
    return vec2f(-1.0, 0.0);
  }
  let yTop = s.y + z1;
  if (yTop >= span.x && yTop <= span.y) {
    return vec2f(z1, 0.0);
  }
  if (yTop > span.y) {
    let z = span.y - s.y;
    if (z >= z0 && z <= z1) {
      return vec2f(z, 1.0);
    }
  }
  return vec2f(-1.0, 0.0);
}

fn chassisHeight() -> f32 {
  return kb.shape.x;
}

// Footprints in the desk's plane.
fn chassisRect() -> vec4f {
  return kb.chassis + vec4f(0.0, chassisHeight(), 0.0, 0.0);
}

fn keyRect(i: i32) -> vec4f {
  return kb.keys[i] + vec4f(0.0, chassisHeight(), 0.0, 0.0);
}

fn trackRect() -> vec4f {
  return kb.track + vec4f(0.0, chassisHeight(), 0.0, 0.0);
}

fn keyTop(i: i32) -> f32 {
  return chassisHeight() + kb.travel[i];
}

// A keycap's outline at its inset: its sides slope in towards the top.
fn capRect(i: i32, inset: f32) -> vec4f {
  return keyRect(i) + vec4f(vec2f(inset), vec2f(-2.0 * inset));
}

fn capRadius(inset: f32) -> f32 {
  return max(kb.shape.z - inset * 0.5, 1.0);
}

fn capInsetAt(i: i32, z: f32) -> f32 {
  let rise = max(keyTop(i) - chassisHeight(), 0.01);
  return kb.cap.x * clamp((z - chassisHeight()) / rise, 0.0, 1.0);
}

fn insideCap(s: vec2f, i: i32, z: f32) -> bool {
  let inset = capInsetAt(i, z);
  return sdRoundRect(vec2f(s.x, s.y + z), capRect(i, inset), capRadius(inset)) <= 0.0;
}

// The view ray through s against keycap i, whose sides may slope: x is the
// height it meets it at (-1 for a miss), y is 0 on the top and 1 on a side.
// It steps down the cap's height, then bisects the step it entered in.
fn keyHit(s: vec2f, i: i32) -> vec2f {
  let foot = chassisHeight();
  let top = keyTop(i);
  let span = column(s.x, keyRect(i), kb.shape.z);
  if (span.x > span.y || s.y + foot > span.y || s.y + top < span.x) {
    return vec2f(-1.0, 0.0);
  }
  if (insideCap(s, i, top)) {
    return vec2f(top, 0.0);
  }
  var above = top;
  for (var k = 1; k <= CAP_STEPS; k++) {
    let z = mix(top, foot, f32(k) / f32(CAP_STEPS));
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
      return vec2f(inside, 1.0);
    }
    above = z;
  }
  return vec2f(-1.0, 0.0);
}

// A value for each look, blended along the toggle's travel.
fn byLook(logi: vec3f, apple: vec3f, mech: vec3f) -> vec3f {
  return mix(mix(logi, apple, clamp(kb.mode, 0.0, 1.0)), mech, clamp(kb.mode - 1.0, 0.0, 1.0));
}

fn grooveRadius() -> f32 {
  return min(kb.track.z, kb.track.w) * 0.5;
}

fn grooveFloor() -> f32 {
  return chassisHeight() - GROOVE_DEPTH;
}

fn knobTop() -> f32 {
  return chassisHeight() + KNOB_RISE;
}

// The knob's round footprint, centred where the DOM draws the knob.
fn knobRect() -> vec4f {
  let rest = kb.knob.xy + kb.knob.zw * 0.5;
  let center = vec2f(rest.x, rest.y + kb.travel.w + chassisHeight());
  return vec4f(center - vec2f(KNOB_RADIUS), vec2f(KNOB_RADIUS * 2.0));
}

// The chassis's surface through screen point s, with the groove cut into
// it: x is the height (-1 for a miss), y the face: 0 top, 1 front wall,
// 2 groove floor, 3 the groove's far wall (the near one faces away).
fn chassisSurface(s: vec2f) -> vec2f {
  let outer = extrusion(s, chassisRect(), kb.shape.y, 0.0, chassisHeight());
  if (outer.x < 0.0 || outer.y > 0.5) {
    return outer;
  }
  let groove = trackRect();
  if (sdRoundRect(vec2f(s.x, s.y + chassisHeight()), groove, grooveRadius()) > 0.0) {
    return outer;
  }
  // Inside the groove the ray falls on towards its far wall.
  let span = column(s.x, groove, grooveRadius());
  if (s.y + grooveFloor() >= span.x) {
    return vec2f(grooveFloor(), 2.0);
  }
  return vec2f(span.x - s.y, 3.0);
}

// A rounded edge between a top face and a wall: `along` runs from 0 (facing
// straight up) to 1 (facing straight out, along `outward`).
fn bevel(outward: vec2f, along: f32) -> vec3f {
  let angle = clamp(along, 0.0, 1.0) * 1.5707963;
  return vec3f(outward * sin(angle), cos(angle));
}

// How much of the lamp reaches p past one extruded part, softened by how
// near the shadow ray passes to it for how far it has come.
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
// (lamp-shadow.ts), so a distant lamp does not stretch them across the desk.
fn shadowLamp(p: vec3f) -> vec3f {
  let lamp = kb.light.xyz;
  let away = lamp.xy - p.xy;
  let reach = 1.6 * (lamp.z - p.z);
  let distance = length(away);
  if (distance <= reach) {
    return lamp;
  }
  return vec3f(p.xy + away * (reach / distance), lamp.z);
}

// How much of the lamp reaches p past every part but the one it lies on.
fn visibility(p: vec3f, part: i32, index: i32) -> f32 {
  let lamp = shadowLamp(p);
  var visible = 1.0;
  if (part != PART_CHASSIS) {
    visible = min(visible, visiblePast(p, lamp, chassisRect(), kb.shape.y, 0.0, chassisHeight()));
  }
  for (var i = 0; i < 3; i++) {
    if (part != PART_KEY || index != i) {
      visible = min(
        visible,
        visiblePast(
          p,
          lamp,
          capRect(i, kb.cap.x * 0.5),
          capRadius(kb.cap.x * 0.5),
          chassisHeight(),
          keyTop(i),
        ),
      );
    }
  }
  if (part != PART_KNOB) {
    visible = min(
      visible,
      visiblePast(p, lamp, knobRect(), KNOB_RADIUS, grooveFloor(), knobTop()),
    );
  }
  return smoothstep(0.0, 1.0, clamp(visible, 0.0, 1.0));
}

fn falloffAt(p: vec3f) -> f32 {
  let lamp = kb.light.xyz;
  return 1.0 / (1.0 + pow(length(lamp - p) / (lamp.z * 1.9), 2.0));
}

struct Finish {
  albedo: vec3f,
  // Strength and shininess of a tight highlight (xy) and a wide sheen (zw).
  lobes: vec4f,
}

// Below the chassis's face only the groove's opening lets the lamp in: how
// much of it reaches p past the groove's rim.
fn grooveLight(p: vec3f) -> f32 {
  let face = chassisHeight();
  if (p.z >= face - 0.01) {
    return 1.0;
  }
  let toLamp = kb.light.xyz - p;
  if (toLamp.z <= 0.0) {
    return 0.0;
  }
  let opening = p.xy + toLamp.xy * (face - p.z) / toLamp.z;
  return 1.0 - smoothstep(-1.0, 1.0, sdRoundRect(opening, trackRect(), grooveRadius()));
}

// A surface lit by the room and the lamp.
fn toLinear(c: vec3f) -> vec3f {
  return pow(max(c, vec3f(0.0)), vec3f(2.2));
}

fn toSrgb(c: vec3f) -> vec3f {
  return pow(clamp(c, vec3f(0.0), vec3f(1.0)), vec3f(1.0 / 2.2));
}

fn lit(p: vec3f, n: vec3f, finish: Finish, part: i32, index: i32, occlusion: f32) -> vec3f {
  let lamp = kb.light.xyz;
  let l = normalize(lamp - p);
  let falloff = falloffAt(p);
  let shadow = visibility(p, part, index) * grooveLight(p);
  // Faces turned from the room's light (the walls) see less of it.
  let room = (0.55 + 0.45 * n.z) * occlusion;
  let diffuse = max(dot(n, l), 0.0) * falloff * shadow;
  let nh = max(dot(n, normalize(l + VIEW)), 0.0);
  let lobes = finish.lobes;
  let shine = (pow(nh, lobes.y) * lobes.x + pow(nh, lobes.w) * lobes.z) * falloff * shadow;
  let light = (toLinear(finish.albedo) * (ROOM_LIGHT * room + LAMP_LIGHT * diffuse)
    + toLinear(LAMP_COLOR) * shine) * EXPOSURE;
  let color = toSrgb(light * (1.0 + light / (WHITE_POINT * WHITE_POINT)) / (1.0 + light));
  return mix(finish.albedo, color, kb.intensity);
}

// Bead-blasted aluminium anodised a deep, cool graphite: dark enough to read
// as metal rather than grey plastic, with a broad sheen of the lamp and a
// brighter, tighter one.
fn chassisFinish() -> Finish {
  let albedo = byLook(vec3f(0.3, 0.31, 0.335), vec3f(0.26, 0.27, 0.295), vec3f(0.28, 0.29, 0.315));
  return Finish(albedo, vec4f(0.3, 40.0, 0.18, 8.0));
}

// Matte keycap plastic.
fn capFinish() -> Finish {
  let albedo = byLook(vec3f(0.2, 0.205, 0.215), vec3f(0.16, 0.162, 0.17), vec3f(0.19, 0.192, 0.2));
  return Finish(albedo, vec4f(0.05, 24.0, 0.02, 5.0));
}

fn legendAt(p: vec2f, i: i32, footprint: f32) -> f32 {
  let rect = keyRect(i);
  let uv = (p - (rect.xy + rect.zw * 0.5)) / LEGEND_SIZE + 0.5;
  if (any(uv < vec2f(0.0)) || any(uv > vec2f(1.0))) {
    return 0.0;
  }
  let texels = f32(textureDimensions(legends).x) / LEGEND_SIZE;
  let lod = log2(max(texels * footprint, 1.0));
  return textureSampleLevel(legends, legendSampler, uv, i, lod).a;
}

// How much of a tick mark covers p on the chassis's face.
fn tickMarks(p: vec2f) -> f32 {
  let rest = kb.knob.xy + kb.knob.zw * 0.5;
  let travelRange = kb.track.w - kb.knob.w;
  let start = kb.track.x + kb.track.z + TICK_GAP + TICK_WIDTH * 0.5;
  let end = start + TICK_LENGTH - TICK_WIDTH;
  var mark = 0.0;
  for (var k = 0; k < 3; k++) {
    // Level with the middle of the knob as it is seen, which its rise lifts
    // up the screen.
    let y = rest.y + chassisHeight() + f32(k) * travelRange * 0.5 - KNOB_RISE * 0.5;
    let d = length(p - vec2f(clamp(p.x, start, end), y)) - TICK_WIDTH * 0.5;
    mark = max(mark, 1.0 - smoothstep(-0.4, 0.4, d));
  }
  return mark;
}

// The chassis at p, on the given face (chassisSurface).
fn shadeChassis(p: vec3f, face: i32) -> vec3f {
  let rect = chassisRect();
  let radius = kb.shape.y;
  let outward = edgeNormal(p.xy, rect, radius);
  let groove = sdRoundRect(p.xy, trackRect(), grooveRadius());
  let intoGroove = -edgeNormal(p.xy, trackRect(), grooveRadius());
  var n: vec3f;
  var finish = chassisFinish();
  var occlusion = 1.0;
  if (face == 1) {
    n = bevel(outward, 1.0 - 0.5 * clamp(1.0 - (chassisHeight() - p.z) / CHASSIS_BEVEL, 0.0, 1.0));
    // The desk's edge hides the foot of the wall from the room.
    occlusion = mix(0.75, 1.0, smoothstep(0.0, chassisHeight(), p.z));
  } else if (face == 2) {
    // The groove's floor: anodised dark, hidden from the room near its walls
    // and around the knob's foot.
    n = vec3f(0.0, 0.0, 1.0);
    finish.albedo = vec3f(0.11, 0.112, 0.12);
    finish.lobes = vec4f(0.06, 40.0, 0.02, 6.0);
    let knob = sdRoundRect(p.xy, knobRect(), KNOB_RADIUS);
    occlusion = mix(0.45, 0.85, smoothstep(0.0, 5.0, -groove))
      * (1.0 - (1.0 - smoothstep(0.0, 3.0, knob)) * 0.35);
  } else if (face == 3) {
    // The groove's far wall, machined bare, darker towards the floor.
    n = bevel(intoGroove, 1.0 - 0.5 * clamp(1.0 - (chassisHeight() - p.z) / GROOVE_LIP, 0.0, 1.0));
    finish.albedo *= 0.8;
    occlusion = mix(0.5, 0.9, smoothstep(grooveFloor(), chassisHeight(), p.z));
  } else {
    let edge = sdRoundRect(p.xy, rect, radius);
    n = bevel(outward, 0.5 * clamp(1.0 + edge / CHASSIS_BEVEL, 0.0, 1.0));
    // The stops' tick marks, printed light beside the groove.
    finish.albedo = mix(finish.albedo, vec3f(0.78), tickMarks(p.xy) * 0.8);
    // The groove's lip rolls down into it.
    if (groove < GROOVE_LIP) {
      n = bevel(intoGroove, 0.5 * clamp(1.0 - groove / GROOVE_LIP, 0.0, 1.0));
    }
    // Raised parts hide the face around their feet from the room.
    for (var i = 0; i < 3; i++) {
      let nearKey = 1.0 - smoothstep(0.0, 5.0, sdRoundRect(p.xy, keyRect(i), kb.shape.z));
      occlusion *= 1.0 - nearKey * 0.35 * smoothstep(0.0, 3.0, kb.travel[i]);
    }
  }
  return lit(p, n, finish, PART_CHASSIS, 0, occlusion);
}

// Keycap i at p: its top (dished, with its legend) or its front wall.
fn shadeKey(p: vec3f, i: i32, wall: bool, footprint: f32) -> vec3f {
  let inset = capInsetAt(i, p.z);
  let rect = capRect(i, inset);
  let radius = capRadius(inset);
  let outward = edgeNormal(p.xy, rect, radius);
  var finish = capFinish();
  var n: vec3f;
  if (wall) {
    // Sloped sides lean back by the inset over the cap's height.
    let slope = kb.cap.x / max(keyTop(i) - chassisHeight(), 0.01);
    let side = normalize(vec3f(outward, slope));
    let edge = clamp(1.0 - (keyTop(i) - p.z) / KEY_BEVEL, 0.0, 1.0);
    n = normalize(mix(side, normalize(side + vec3f(0.0, 0.0, 1.0)), edge));
  } else {
    let edge = sdRoundRect(p.xy, rect, radius);
    n = bevel(outward, 0.5 * clamp(1.0 + edge / KEY_BEVEL, 0.0, 1.0));
    // A mechanical cap's top is a shallow cylinder across its width.
    let trough = kb.cap.y;
    if (trough > 0.0) {
      let halfWidth = rect.z * 0.5 - 2.0;
      let across = p.x - (rect.x + rect.z * 0.5);
      let inTrough = 1.0 - smoothstep(halfWidth - 0.75, halfWidth, abs(across));
      let cylinder = halfWidth * halfWidth / (2.0 * trough);
      n = normalize(n + vec3f(-across / cylinder * inTrough, 0.0, 0.0));
    }
    // A shallow spherical dish: the surface rises towards its rim.
    let center = rect.xy + rect.zw * 0.5;
    let dishRadius = min(rect.z, rect.w) * 0.5 - DISH_INSET;
    let depth = kb.shape.w;
    if (depth > 0.0) {
      let d = p.xy - center;
      let inDish = 1.0 - smoothstep(dishRadius - 0.75, dishRadius, length(d));
      let sphere = dishRadius * dishRadius / (2.0 * depth);
      n = normalize(n + vec3f(-d / sphere * inDish, 0.0));
      // The dish's floor is moulded a shade darker than the flat around it.
      finish.albedo *= 1.0 - 0.05 * inDish * smoothstep(0.0, 1.0, depth);
    }
    let legend = legendAt(p.xy, i, footprint);
    finish.albedo = mix(finish.albedo, LEGEND_COLOR, legend);
  }
  return lit(p, n, finish, PART_KEY, i, 1.0);
}

// The knob at p: brushed steel, a flat top with a rounded edge over a
// polished side.
fn shadeKnob(p: vec3f, wall: bool) -> vec3f {
  let rect = knobRect();
  let outward = edgeNormal(p.xy, rect, KNOB_RADIUS);
  var n: vec3f;
  if (wall) {
    n = bevel(outward, 1.0 - 0.5 * clamp(1.0 - (knobTop() - p.z) / KNOB_BEVEL, 0.0, 1.0));
  } else {
    let edge = sdRoundRect(p.xy, rect, KNOB_RADIUS);
    n = bevel(outward, 0.5 * clamp(1.0 + edge / KNOB_BEVEL, 0.0, 1.0));
  }
  let finish = Finish(vec3f(0.6, 0.62, 0.66), vec4f(0.5, 80.0, 0.12, 10.0));
  return lit(p, n, finish, PART_KNOB, 0, 1.0);
}

// The keyboard's shadow on the desk at p: the lamp's, and the soft dark at
// the chassis's foot where the room's light cannot reach.
fn deskShadow(p: vec3f) -> f32 {
  let hidden = 1.0 - visibility(p, PART_DESK, 0);
  let strength = (0.08 + 0.16 * falloffAt(p)) * 0.9;
  let lamp = hidden * hidden * strength;
  let foot = (1.0 - smoothstep(0.0, 7.0, sdRoundRect(p.xy, chassisRect(), kb.shape.y))) * 0.16;
  return (1.0 - (1.0 - lamp) * (1.0 - foot)) * kb.intensity;
}

// Premultiplied colour at screen point s.
fn colorAt(s: vec2f, footprint: f32) -> vec4f {
  var best = -1.0;
  var part = PART_DESK;
  var index = 0;
  var wall = false;
  var face = 0;

  let chassis = chassisSurface(s);
  if (chassis.x > best) {
    best = chassis.x;
    part = PART_CHASSIS;
    face = i32(chassis.y + 0.5);
  }
  for (var i = 0; i < 3; i++) {
    let key = keyHit(s, i);
    // A key pressed flush with the chassis still shows over it.
    if (key.x >= 0.0 && key.x >= best) {
      best = key.x;
      part = PART_KEY;
      index = i;
      wall = key.y > 0.5;
    }
  }
  let knob = extrusion(s, knobRect(), KNOB_RADIUS, grooveFloor(), knobTop());
  if (knob.x > best) {
    best = knob.x;
    part = PART_KNOB;
    wall = knob.y > 0.5;
  }

  if (part == PART_DESK) {
    let shadow = min(deskShadow(vec3f(s, 0.0)) * SHADOW_DEPTH, 1.0);
    return vec4f(SHADOW_TINT * shadow, shadow);
  }
  let p = vec3f(s.x, s.y + best, best);
  if (part == PART_CHASSIS) {
    return vec4f(shadeChassis(p, face), 1.0);
  }
  if (part == PART_KEY) {
    return vec4f(shadeKey(p, index, wall, footprint), 1.0);
  }
  return vec4f(shadeKnob(p, wall), 1.0);
}

@fragment
fn fs(in: VertexOut) -> @location(0) vec4f {
  // Local px under one device pixel; changes with camera zoom and DPR.
  let footprint = max(fwidth(in.local.x), fwidth(in.local.y));
  // Four samples per pixel smooth the silhouettes the ray cast leaves hard.
  var sum = vec4f(0.0);
  for (var i = 0; i < 4; i++) {
    let offset = (vec2f(f32(i & 1), f32(i >> 1u)) - 0.5) * 0.5 * footprint;
    sum += colorAt(in.local + offset, footprint);
  }
  return sum * 0.25;
}
