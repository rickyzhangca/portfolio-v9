// Draws the email card's body under the desk lamp in the keyboard's oblique
// view (keyboard-shader.wgsl), where a height of z lifts a point z px up the
// screen, so front faces show: a white soft-touch pill lying on the desk,
// a small screen of dark glass set a little into it under the address, as
// on old electronics, with the scanlines of a tube across it, and a round
// button of bead-blasted orange aluminium that presses in like a key. The
// DOM draws the glowing address over the glass. The DOM keeps the address, its copy animation and the envelope
// icon on top; the pill's top face sits exactly where the DOM draws the card.
// The button shades the pill, and both cast their shadow onto the desk.
// Units are the card's untransformed CSS px ("local px"); x runs right, y
// down and z up out of the desk. A footprint is where a part stands in the
// desk's plane: a point drawn at screen y on a face at height z has y + z.

struct Email {
  size: vec2f,
  // 0 leaves the card unlit, 1 is the full lamp.
  intensity: f32,
  // How brightly the screen glows: 0 at rest, 1 under the pointer.
  glow: f32,
  // xyz: lamp position relative to the card's top left, z above the desk;
  // w: the canvas margin around the card for the shadow, in local px.
  light: vec4f,
  // The button's box as the DOM draws it, at rest.
  button: vec4f,
  // x: the pill's thickness, y: the button's height above the pill now,
  // z: its height at rest, w: how far the screen is set into the pill.
  shape: vec4f,
  // The screen, as the DOM lays it out on the top face.
  screen: vec4f,
}

@group(0) @binding(0) var<uniform> email: Email;

struct VertexOut {
  @builtin(position) position: vec4f,
  @location(0) local: vec2f,
}

@vertex
fn vs(@builtin(vertex_index) index: u32) -> VertexOut {
  let corner = vec2f(f32(index & 1u), f32(index >> 1u));
  let margin = email.light.w;
  var out: VertexOut;
  out.position = vec4f(corner * vec2f(2.0, -2.0) + vec2f(-1.0, 1.0), 0.0, 1.0);
  out.local = corner * (email.size + vec2f(margin * 2.0)) - vec2f(margin);
  return out;
}

const LAMP_COLOR = vec3f(1.0, 0.97, 0.92);
// Towards the viewer of the oblique view: up the screen as much as out of it.
const VIEW = vec3f(0.0, 0.70710678, 0.70710678);
// A clean, faintly cool white.
const PILL_COLOR = vec3f(0.965, 0.972, 0.98);
const PILL_BEVEL = 2.5;
// Anodised orange aluminium, bead-blasted: its colour, and the chamfer cut
// round the top of the button.
const BUTTON_COLOR = vec3f(0.9, 0.36, 0.14);
const BUTTON_BEVEL = 2.6;
// How wide the sloped wall round the screen is, in local px.
const SCREEN_WALL = 2.0;
// The screen's glass, nearly black, and the faint amber of its phosphor.
const GLASS_COLOR = vec3f(0.05, 0.048, 0.044);
const PHOSPHOR = vec3f(1.0, 0.62, 0.26);
// The tube's scanlines: a dark line this many local px apart.
const SCANLINE = 3.0;
// Shadows, as the keyboard's but softer at their narrowest: the pill is thin
// and white, and a tight shadow round it reads as a dark outline.
const SHADOW_SOFTNESS = 2.5;
const MIN_PENUMBRA = 5.0;
const MAX_PENUMBRA = 16.0;
const SHADOW_STEPS = 6;

// Light is summed in linear light, then tone mapped and encoded back to
// sRGB, as a camera would: highlights roll off near white instead of
// clipping, and faces turned from the lamp fall properly dark. The room's
// light from above keeps white plastic white away from the lamp (the page's
// room dimming already darkens it there); the lamp adds to it, fading with
// distance, and the dark comes from shadows and faces turned away.
const ROOM_LIGHT = 0.95;
const LAMP_LIGHT = 0.8;
const EXPOSURE = 1.5;
// The linear level that maps to full white.
const WHITE_POINT = 2.0;

const PART_DESK = 0;
const PART_PILL = 1;
const PART_BUTTON = 2;

fn sdRoundRect(p: vec2f, rect: vec4f, radius: f32) -> f32 {
  let half = rect.zw * 0.5;
  let r = min(radius, min(half.x, half.y));
  let q = abs(p - (rect.xy + half)) - half + vec2f(r);
  return length(max(q, vec2f(0.0))) + min(max(q.x, q.y), 0.0) - r;
}

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
// the top face and 1 on the front wall.
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

fn pillHeight() -> f32 {
  return email.shape.x;
}

fn buttonTop() -> f32 {
  return pillHeight() + email.shape.y;
}

// The pill's footprint: its top face lies where the DOM draws the card.
fn pillRect() -> vec4f {
  return vec4f(0.0, pillHeight(), email.size);
}

fn pillRadius() -> f32 {
  return email.size.y * 0.5;
}

// The button's round footprint. At rest its top face and the side below it
// together sit centred where the DOM draws the button; it sinks from there
// as it is pressed.
fn buttonRect() -> vec4f {
  let middle = email.button.xy + email.button.zw * 0.5 + vec2f(0.0, pillHeight() + email.shape.z * 0.5);
  let r = buttonRadius();
  return vec4f(middle - vec2f(r), vec2f(2.0 * r));
}

// The screen's footprint, on the pill's face.
fn screenRect() -> vec4f {
  return email.screen + vec4f(0.0, pillHeight(), 0.0, 0.0);
}

fn screenRadius() -> f32 {
  return min(email.screen.z, email.screen.w) * 0.5;
}

// The screen's glass at p, depth inside its edge: dark, darker towards its
// edge as a tube's face is, holding a faint glow, and reflecting the lamp
// and, along its top, the room.
fn shadeGlass(p: vec3f, depth: f32, footprint: f32) -> vec3f {
  let rect = screenRect();
  let lamp = email.light.xyz;
  let l = normalize(lamp - p);
  let falloff = falloffAt(p);
  let shadow = visibility(p, PART_PILL);
  let nh = max(dot(vec3f(0.0, 0.0, 1.0), normalize(l + VIEW)), 0.0);
  let vignette = mix(0.55, 1.0, smoothstep(0.0, 10.0, depth));
  // The phosphor's glow, which blooms towards the middle under the pointer.
  let middle = 1.0 - smoothstep(0.0, rect.z * 0.5, abs(p.x - (rect.x + rect.z * 0.5)));
  let glow = PHOSPHOR * (0.025 + email.glow * (0.08 + 0.1 * middle)) * vignette;
  let room = (1.0 - clamp((p.y - rect.y) / rect.w, 0.0, 1.0)) * 0.035;
  let reflection = (pow(nh, 40.0) * 0.18 + pow(nh, 8.0) * 0.03) * falloff * shadow;
  // A 1px dark line every SCANLINE, faded out where it would be finer than
  // the display's pixels.
  let fromLine = abs(fract((p.y - rect.y) / SCANLINE) - 0.5) * SCANLINE;
  let line = 1.0 - smoothstep(0.5 - footprint * 0.5, 0.5 + footprint * 0.5, fromLine);
  let scan = 1.0 - 0.45 * line * smoothstep(1.0, 2.0, SCANLINE / footprint);
  let lit = (GLASS_COLOR * vignette + glow) * scan + LAMP_COLOR * (reflection + room);
  return mix((GLASS_COLOR + glow) * scan, lit, email.intensity);
}

// The button, face and side together, is as tall as the screen.
fn buttonRadius() -> f32 {
  return (email.screen.w - email.shape.z) * 0.5;
}

fn bevel(outward: vec2f, along: f32) -> vec3f {
  let angle = clamp(along, 0.0, 1.0) * 1.5707963;
  return vec3f(outward * sin(angle), cos(angle));
}

fn hash(p: vec2f) -> f32 {
  let q = fract(p * vec2f(0.1031, 0.1030));
  let r = q + dot(q, q.yx + 33.33);
  return fract((r.x + r.y) * r.x);
}

// The lamp as shadows see it from p: no further off than casts a shadow 1.6
// times as long as the caster is tall, as the DOM shadows are capped.
fn shadowLamp(p: vec3f) -> vec3f {
  let lamp = email.light.xyz;
  let away = lamp.xy - p.xy;
  let reach = 1.6 * (lamp.z - p.z);
  let distance = length(away);
  if (distance <= reach) {
    return lamp;
  }
  return vec3f(p.xy + away * (reach / distance), lamp.z);
}

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

// How much of the lamp reaches p past every part but the one it lies on.
fn visibility(p: vec3f, part: i32) -> f32 {
  let lamp = shadowLamp(p);
  var visible = 1.0;
  if (part != PART_PILL) {
    visible = min(visible, visiblePast(p, lamp, pillRect(), pillRadius(), 0.0, pillHeight()));
  }
  if (part != PART_BUTTON) {
    visible = min(
      visible,
      visiblePast(p, lamp, buttonRect(), buttonRadius(), pillHeight(), buttonTop()),
    );
  }
  return smoothstep(0.0, 1.0, clamp(visible, 0.0, 1.0));
}

fn toLinear(c: vec3f) -> vec3f {
  return pow(max(c, vec3f(0.0)), vec3f(2.2));
}

fn toSrgb(c: vec3f) -> vec3f {
  return pow(clamp(c, vec3f(0.0), vec3f(1.0)), vec3f(1.0 / 2.2));
}

// A surface of the given sRGB colour under the room's light (`room`: how
// much of it reaches the face) and the lamp's (`lamp`: facing, falloff and
// shadow), plus light it reflects, in linear light.
fn expose(albedo: vec3f, room: f32, lamp: f32, reflected: vec3f) -> vec3f {
  let light = (toLinear(albedo) * (ROOM_LIGHT * room + LAMP_LIGHT * lamp) + reflected) * EXPOSURE;
  let mapped = light * (1.0 + light / (WHITE_POINT * WHITE_POINT)) / (1.0 + light);
  return toSrgb(mapped);
}

fn falloffAt(p: vec3f) -> f32 {
  let lamp = email.light.xyz;
  return 1.0 / (1.0 + pow(length(lamp - p) / (lamp.z * 1.9), 2.0));
}

// The pill at p: soft-touch white, its edge gently rounded.
fn shadePill(p: vec3f, wall: bool, footprint: f32) -> vec3f {
  let rect = pillRect();
  let outward = edgeNormal(p.xy, rect, pillRadius());
  var n: vec3f;
  var occlusion = 1.0;
  if (wall) {
    n = bevel(outward, 1.0 - 0.5 * clamp(1.0 - (pillHeight() - p.z) / PILL_BEVEL, 0.0, 1.0));
    occlusion = mix(0.92, 1.0, smoothstep(0.0, pillHeight(), p.z));
  } else {
    let edge = sdRoundRect(p.xy, rect, pillRadius());
    n = bevel(outward, 0.5 * clamp(1.0 + edge / PILL_BEVEL, 0.0, 1.0));
    // The wall round the screen slopes down and in to the glass.
    let inScreen = sdRoundRect(p.xy, screenRect(), screenRadius());
    if (inScreen < 0.0) {
      let t = clamp(-inScreen / SCREEN_WALL, 0.0, 1.0);
      let slope = email.shape.w * 6.0 * t * (1.0 - t) / SCREEN_WALL;
      let wallOut = edgeNormal(p.xy, screenRect(), screenRadius());
      n = normalize(vec3f(-wallOut * slope, 1.0));
      occlusion *= 1.0 - 0.15 * t;
    }
    // The button's foot hides the face round it from the room.
    let foot = sdRoundRect(p.xy, buttonRect(), buttonRadius());
    occlusion *= 1.0 - (1.0 - smoothstep(0.0, 4.0, foot)) * 0.2 * smoothstep(0.0, 2.0, email.shape.y);
  }
  let lamp = email.light.xyz;
  let l = normalize(lamp - p);
  let falloff = falloffAt(p);
  let shadow = visibility(p, PART_PILL);
  // The room's light comes from above, so faces turned down see less.
  let room = (0.55 + 0.45 * n.z) * occlusion;
  let diffuse = max(dot(n, l), 0.0) * falloff * shadow;
  let nh = max(dot(n, normalize(l + VIEW)), 0.0);
  // Soft-touch: a wide, faint sheen of the lamp.
  let sheen = toLinear(LAMP_COLOR) * pow(nh, 6.0) * 0.08 * falloff * shadow;
  let color = expose(PILL_COLOR, room, diffuse, sheen);
  let pill = mix(PILL_COLOR, color, email.intensity);
  if (wall) {
    return pill;
  }
  // The glass begins where the wall meets the screen's floor.
  let depth = -sdRoundRect(p.xy, screenRect(), screenRadius()) - SCREEN_WALL;
  let glass = smoothstep(-0.5, 0.5, depth);
  if (glass <= 0.0) {
    return pill;
  }
  return mix(pill, shadeGlass(p, depth, footprint), glass);
}

// The button at p: bead-blasted anodised aluminium. Its fine grain gives a
// soft, wide sheen in its own colour with a few glints, and the chamfer
// round its top catches the lamp brightly, which is what reads as metal.
fn shadeButton(p: vec3f, wall: bool) -> vec3f {
  let rect = buttonRect();
  let outward = edgeNormal(p.xy, rect, buttonRadius());
  var n: vec3f;
  var chamfer = 0.0;
  if (wall) {
    let edge = clamp(1.0 - (buttonTop() - p.z) / BUTTON_BEVEL, 0.0, 1.0);
    n = bevel(outward, 1.0 - 0.5 * edge);
    chamfer = edge;
  } else {
    let edge = sdRoundRect(p.xy, rect, buttonRadius());
    let along = clamp(1.0 + edge / BUTTON_BEVEL, 0.0, 1.0);
    n = bevel(outward, 0.5 * along);
    chamfer = along;
  }
  let lamp = email.light.xyz;
  let l = normalize(lamp - p);
  let falloff = falloffAt(p);
  let shadow = visibility(p, PART_BUTTON);
  let halfway = normalize(l + VIEW);
  let nh = max(dot(n, halfway), 0.0);
  let room = 0.55 + 0.45 * n.z;
  let diffuse = max(dot(n, l), 0.0) * falloff * shadow;
  // Each tiny dent in the blasted face is a facet tipped its own way.
  let cell = floor(p.xy / 0.7);
  let facet = normalize(n + vec3f((vec2f(hash(cell), hash(cell + 19.19)) - 0.5) * 0.25, 0.0));
  let glint = pow(max(dot(facet, halfway), 0.0), 60.0) * pow(hash(cell + 3.7), 3.0) * 0.12;
  let tint = mix(vec3f(1.0), BUTTON_COLOR, 0.45);
  let sheen = (pow(nh, 10.0) * 0.35 + pow(nh, 36.0) * 0.15 + glint * 2.0) * falloff * shadow;
  let edgeLight = chamfer * pow(max(dot(n, l), 0.0), 2.0) * 0.5 * falloff * shadow;
  let reflected = toLinear(LAMP_COLOR * tint) * (sheen + edgeLight);
  let color = expose(BUTTON_COLOR, room, diffuse, reflected);
  return mix(BUTTON_COLOR, color, email.intensity);
}

// The card's shadow on the desk at p: the lamp's, and the soft dark at the
// pill's foot where the room's light cannot reach.
fn deskShadow(p: vec3f) -> f32 {
  let hidden = 1.0 - visibility(p, PART_DESK);
  let strength = (0.08 + 0.16 * falloffAt(p)) * 0.55;
  let lampShadow = hidden * hidden * strength;
  let foot = (1.0 - smoothstep(0.0, 10.0, sdRoundRect(p.xy, pillRect(), pillRadius()))) * 0.06;
  return (1.0 - (1.0 - lampShadow) * (1.0 - foot)) * email.intensity;
}

// Premultiplied colour at screen point s.
fn colorAt(s: vec2f, footprint: f32) -> vec4f {
  var best = -1.0;
  var part = PART_DESK;
  var wall = false;
  let pill = extrusion(s, pillRect(), pillRadius(), 0.0, pillHeight());
  if (pill.x > best) {
    best = pill.x;
    part = PART_PILL;
    wall = pill.y > 0.5;
  }
  let button = extrusion(s, buttonRect(), buttonRadius(), pillHeight(), buttonTop());
  // A button pressed flush with the pill still shows over it.
  if (button.x >= 0.0 && button.x >= best) {
    best = button.x;
    part = PART_BUTTON;
    wall = button.y > 0.5;
  }
  if (part == PART_DESK) {
    return vec4f(0.0, 0.0, 0.0, deskShadow(vec3f(s, 0.0)));
  }
  let p = vec3f(s.x, s.y + best, best);
  if (part == PART_PILL) {
    return vec4f(shadePill(p, wall, footprint), 1.0);
  }
  return vec4f(shadeButton(p, wall), 1.0);
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
