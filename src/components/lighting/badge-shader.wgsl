// Draws the profile picture as a round pin badge under the desk lamp: a disc
// with real thickness, both faces gently domed under a glossy film, a photo
// on each face, and the white rim rolled over the edge. The disc is ray
// marched, so it turns in 3D as it flips and shows its edge band side on,
// and it casts its own soft shadow onto the desk below.
// Units are the card's untransformed CSS px ("local px"); x runs right, y
// down and z out of the desk, towards the viewer, as in CSS 3D.

struct Badge {
  size: vec2f,
  // 0 leaves the badge unlit, 1 is the full lamp.
  intensity: f32,
  // The flip: rotation about the vertical axis, in radians (CSS rotateY).
  angle: f32,
  // xyz: lamp position relative to the card's top left, z above its plane;
  // w: the canvas margin around the card for the shadow, in local px.
  light: vec4f,
  // x: radius, y: half the thickness at the rim, z: dome height of each
  // face, w: width of the white rim on the face.
  shape: vec4f,
  // x: height of the badge's middle above the desk, y: perspective distance
  // (CSS perspective), z: photo layer on the front, w: on the back.
  params: vec4f,
}

@group(0) @binding(0) var<uniform> badge: Badge;
@group(0) @binding(1) var photos: texture_2d_array<f32>;
@group(0) @binding(2) var photoSampler: sampler;

struct VertexOut {
  @builtin(position) position: vec4f,
  @location(0) local: vec2f,
}

@vertex
fn vs(@builtin(vertex_index) index: u32) -> VertexOut {
  let corner = vec2f(f32(index & 1u), f32(index >> 1u));
  let margin = badge.light.w;
  var out: VertexOut;
  out.position = vec4f(corner * vec2f(2.0, -2.0) + vec2f(-1.0, 1.0), 0.0, 1.0);
  out.local = corner * (badge.size + vec2f(margin * 2.0)) - vec2f(margin);
  return out;
}

const LAMP_COLOR = vec3f(1.0, 0.97, 0.92);
// The rolled edge, in local px.
const EDGE_ROUND = 3.0;
const MARCH_STEPS = 64;
const SHADOW_STEPS = 40;
// Penumbra: lower is softer; 1 / the lamp's apparent radius. The penumbra
// widens with the distance from the desk to the badge along the shadow ray,
// so with the lamp overhead (it follows the pointer, so on hover) the shadow
// stays a narrow contact shadow tucked under the badge rather than a halo.
const SHADOW_SOFTNESS = 2.5;
// Penumbra limits, in local px. The minimum keeps the umbra's edge from
// reading as an outline; the maximum bounds how far the blur spreads.
const MIN_PENUMBRA = 3.0;
const MAX_PENUMBRA = 16.0;
// Shadow length cap, as a multiple of the badge's height above the desk: the
// DOM shadows' (lamp-shadow.ts), so the badge's shadow matches the cards'.
const MAX_REACH_PER_LIFT = 1.6;
// Room kept between the blurred shadow's end and the canvas edge, in local px.
const EDGE_CLEARANCE = 4.0;
const RIM_WHITE = vec3f(1.0);

// CSS rotateY: the right side turns away from the viewer for positive angles.
fn rotateY(p: vec3f, angle: f32) -> vec3f {
  let c = cos(angle);
  let s = sin(angle);
  return vec3f(p.x * c + p.z * s, p.y, -p.x * s + p.z * c);
}

fn smoothMax(a: f32, b: f32, k: f32) -> f32 {
  let h = max(k - abs(a - b), 0.0) / k;
  return max(a, b) + h * h * k * 0.25;
}

// Signed distance to the badge in its own frame (faces along z): a cylinder
// cut by two large spheres, one per domed face, with the edge rolled round.
fn badgeDistance(p: vec3f) -> f32 {
  let radius = badge.shape.x;
  let rim = badge.shape.y;
  let dome = max(badge.shape.z, 0.01);
  // The sphere through the rim (at z = rim) and the dome's crown.
  let sphere = (radius * radius + dome * dome) / (2.0 * dome);
  let side = length(p.xy) - radius;
  let mirrored = vec3f(p.xy, abs(p.z));
  let face = length(mirrored - vec3f(0.0, 0.0, rim + dome - sphere)) - sphere;
  return smoothMax(side, face, EDGE_ROUND);
}

fn normalAt(p: vec3f) -> vec3f {
  let e = vec2f(0.05, -0.05);
  return normalize(
    e.xyy * badgeDistance(p + e.xyy) + e.yyx * badgeDistance(p + e.yyx)
      + e.yxy * badgeDistance(p + e.yxy) + e.xxx * badgeDistance(p + e.xxx),
  );
}

// Where a ray from `origin` enters and leaves a sphere `slack` px wider than
// the badge, or x > y when it misses.
fn bounds(origin: vec3f, direction: vec3f, slack: f32) -> vec2f {
  let reach = badge.shape.x + slack;
  let b = dot(origin, direction);
  let c = dot(origin, origin) - reach * reach;
  let disc = b * b - c;
  if (disc < 0.0) {
    return vec2f(1.0, 0.0);
  }
  let root = sqrt(disc);
  return vec2f(max(-b - root, 0.0), -b + root);
}

// The surface colour at a point of the badge, in its own frame: a photo on
// each face inside the white rim, and white over the rolled edge.
fn albedo(local: vec3f, footprint: f32) -> vec3f {
  let inner = badge.shape.x - badge.shape.w;
  let r = length(local.xy);
  let photo = 1.0 - smoothstep(inner - footprint, inner, r);
  // Seen from behind, the back's x runs the other way.
  let front = local.z >= 0.0;
  let x = select(-local.x, local.x, front);
  let uv = vec2f(x, local.y) / (2.0 * inner) + 0.5;
  let layer = i32(select(badge.params.w, badge.params.z, front));
  let texels = f32(textureDimensions(photos).x) / (2.0 * inner);
  let lod = log2(max(texels * footprint, 1.0));
  let color = textureSampleLevel(photos, photoSampler, uv, layer, lod).rgb;
  return mix(RIM_WHITE, color, photo);
}

// The lamp position relative to the badge's middle.
fn lampAt() -> vec3f {
  return badge.light.xyz - vec3f(badge.size * 0.5, 0.0);
}

// The lamp as the shadow sees it. A far, low lamp throws a long shadow, which
// would run past the canvas margin and end in a square cut. Like the DOM
// shadows, its length is capped: the lamp keeps its direction and height but
// comes in close enough that the badge's highest point, which rises to the
// rim side on, throws no further than the cap or the margin allows.
fn shadowLampAt() -> vec3f {
  let lamp = lampAt();
  let lift = badge.params.x;
  let top =
    lift + badge.shape.x * abs(sin(badge.angle)) + badge.shape.y + badge.shape.z;
  let reach = min(
    lift * MAX_REACH_PER_LIFT,
    badge.light.w - MAX_PENUMBRA - EDGE_CLEARANCE
  );
  // Similar triangles: a point `top` above the desk, under a lamp `lampZ`
  // above it at horizontal distance d, throws a shadow d * top / (lampZ - top).
  // The edge furthest from the lamp is a radius further away than the middle.
  let lampZ = lamp.z + lift;
  let maxDistance = reach * max(lampZ - top, 1.0) / top - badge.shape.x;
  let distance = length(lamp.xy);
  if (distance <= maxDistance) {
    return lamp;
  }
  return vec3f(lamp.xy * (max(maxDistance, 0.0) / distance), lamp.z);
}

fn falloffAt(p: vec3f) -> f32 {
  let lamp = lampAt();
  return 1.0 / (1.0 + pow(length(lamp - p) / (lamp.z * 1.9), 2.0));
}

// The badge lit at a point of its surface, in world space.
fn shade(world: vec3f, eye: vec3f, footprint: f32) -> vec3f {
  let local = rotateY(world, -badge.angle);
  let n = rotateY(normalAt(local), badge.angle);
  let lamp = lampAt();
  let l = normalize(lamp - world);
  let falloff = falloffAt(world);
  // The change in light against a face lying flat, as the folders are lit:
  // facing the camera and the lamp, the photo keeps its own colours.
  let flatLight = normalize(lamp - vec3f(world.xy, 0.0));
  let delta = max(dot(n, l), 0.0) - flatLight.z;
  // The rolled edge turned from the lamp still catches the room's light, so
  // it shades softly rather than outlining the badge, even with the lamp
  // overhead, when the whole edge turns from it.
  let tone = max(0.97 + delta * falloff * 0.5, 0.82);
  // The glossy film: a tight highlight over a wide, faint sheen.
  let halfway = normalize(l + normalize(eye - world));
  let nh = max(dot(n, halfway), 0.0);
  let film = (pow(nh, 90.0) * 0.16 + pow(nh, 12.0) * 0.02) * falloff;
  let lit = albedo(local, footprint) * tone + LAMP_COLOR * film;
  return mix(albedo(local, footprint), lit, badge.intensity);
}

// How much of the lamp the badge hides from a point on the desk, softened by
// how near the shadow ray passes to its surface for how far it has come.
fn shadowAt(desk: vec3f) -> f32 {
  let toLamp = normalize(shadowLampAt() - desk);
  // Rays that pass within a penumbra of the badge still darken the desk; a
  // tighter bound would cut the falloff off in a hard edge.
  let span = bounds(desk, toLamp, MAX_PENUMBRA);
  if (span.x > span.y) {
    return 0.0;
  }
  var visible = 1.0;
  var t = span.x;
  for (var i = 0; i < SHADOW_STEPS; i++) {
    let d = badgeDistance(rotateY(desk + toLamp * t, -badge.angle));
    let penumbra = clamp(t / SHADOW_SOFTNESS, MIN_PENUMBRA, MAX_PENUMBRA);
    visible = min(visible, d / penumbra);
    if (visible < 0.001 || t > span.y) {
      break;
    }
    t += max(d, 0.3);
  }
  // Fainter further from the lamp, as the DOM shadows are (lamp-shadow.ts),
  // and a little lighter, since theirs spread their darkness by blurring.
  let strength = (0.08 + 0.16 * falloffAt(desk)) * 0.75;
  // Eased at the umbra's edge, so it leaves no crease, and quickly faded
  // after it, so the darkness gathers at the badge's edge, not in a halo.
  let hidden = 1.0 - smoothstep(0.0, 1.0, visible);
  return hidden * hidden * strength;
}

@fragment
fn fs(in: VertexOut) -> @location(0) vec4f {
  // Local px under one device pixel; changes with camera zoom and DPR.
  let footprint = max(fwidth(in.local.x), fwidth(in.local.y));
  // CSS perspective: the eye sits above the card's middle, and each pixel
  // looks at its own point of the card's plane.
  let eye = vec3f(0.0, 0.0, badge.params.y);
  let onPlane = vec3f(in.local - badge.size * 0.5, 0.0);
  let direction = normalize(onPlane - eye);

  var coverage = 0.0;
  var color = vec3f(0.0);
  let span = bounds(eye, direction, 1.0);
  if (span.x <= span.y) {
    var t = span.x;
    var nearest = 1e4;
    var nearestT = t;
    var hit = false;
    for (var i = 0; i < MARCH_STEPS; i++) {
      let d = badgeDistance(rotateY(eye + direction * t, -badge.angle));
      if (d < nearest) {
        nearest = d;
        nearestT = t;
      }
      if (d < 0.01) {
        hit = true;
        break;
      }
      t += d;
      if (t > span.y) {
        break;
      }
    }
    // Missing by less than a pixel still covers part of it: smooth edges.
    coverage = select(1.0 - smoothstep(0.0, footprint, nearest), 1.0, hit);
    if (coverage > 0.0) {
      color = shade(eye + direction * select(nearestT, t, hit), eye, footprint);
    }
  }

  // The desk lies below the badge; where the view reaches it, the badge may
  // hide the lamp.
  var shadow = 0.0;
  if (coverage < 1.0) {
    let deskZ = -badge.params.x;
    let desk = eye + direction * ((deskZ - eye.z) / direction.z);
    shadow = shadowAt(desk) * badge.intensity;
  }
  // Premultiplied: the badge over its shadow.
  return vec4f(color * coverage, coverage + shadow * (1.0 - coverage));
}
