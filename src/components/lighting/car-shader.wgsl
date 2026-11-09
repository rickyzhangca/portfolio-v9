// Lights the toy time machine with the desk lamp. The car is a rendered
// photo, shot orthographically from 26 degrees off straight down towards the
// screen's bottom; alongside it come its normals (in desk space: x
// right, y down the screen, z up) and its surface (metalness, roughness,
// glass), so the lamp can slide real highlights over the steel and glass.
// Everything is in the card's untransformed CSS px ("local px").

struct Globals {
  canvasSize: vec2f,
  // 0 reproduces the plain DOM look, 1 is the full lamp.
  intensity: f32,
  // How high the car's surfaces sit above the desk, on average, in local px.
  surfaceHeight: f32,
  // xyz: lamp position in local px (z is height above the desk).
  light: vec4f,
  // The photo's rectangle in canvas px, its transparent padding included.
  rect: vec4f,
  // The car's own lights (its charge's bolts or the flash it lands in, and
  // the fire it drove through): xyz position in local px, w intensity; and
  // each one's colour.
  glowA: vec4f,
  glowAColor: vec4f,
  glowB: vec4f,
  glowBColor: vec4f,
}

@group(0) @binding(0) var<uniform> g: Globals;
@group(0) @binding(1) var linearSampler: sampler;
// Layers: 0 the photo, 1 normals, 2 surface. All premultiplied by coverage.
@group(0) @binding(2) var maps: texture_2d_array<f32>;

struct VertexOut {
  @builtin(position) position: vec4f,
  @location(0) local: vec2f,
}

@vertex
fn vs(@builtin(vertex_index) index: u32) -> VertexOut {
  let corner = vec2f(f32(index & 1u), f32(index >> 1u));
  let local = corner * g.canvasSize;
  var out: VertexOut;
  out.position = vec4f(corner * vec2f(2.0, -2.0) + vec2f(-1.0, 1.0), 0.0, 1.0);
  out.local = local;
  return out;
}

const PI = 3.14159265;
const LAMP_COLOR = vec3f(1.0, 0.97, 0.92);
// As the MacBook's: blocked lamp light leaves the room's cooler light.
const SHADOW_TINT = vec3f(0.11, 0.14, 0.23);
const SHADOW_DEPTH = 1.16;
// Towards the camera: 26 degrees off straight up, towards the screen's bottom.
const VIEW = vec3f(0.0, 0.4383711, 0.8987940);
const DISK = array<vec2f, 12>(
  vec2f(-0.326, -0.406), vec2f(-0.840, -0.074), vec2f(-0.696, 0.457),
  vec2f(-0.203, 0.621), vec2f(0.962, -0.195), vec2f(0.473, -0.480),
  vec2f(0.519, 0.767), vec2f(0.185, -0.893), vec2f(0.507, 0.064),
  vec2f(0.896, 0.412), vec2f(-0.322, -0.933), vec2f(-0.792, -0.598),
);

fn toUv(local: vec2f) -> vec2f {
  return (local - g.rect.xy) / g.rect.zw;
}

fn inside(uv: vec2f) -> f32 {
  let s = step(vec2f(0.0), uv) * step(uv, vec2f(1.0));
  return s.x * s.y;
}

// Coverage averaged over about `radius` local px, from the mip level whose
// texels are that size.
fn blurredAlpha(local: vec2f, radius: f32) -> f32 {
  let texelsPerPx = f32(textureDimensions(maps).x) / g.rect.z;
  let lod = log2(max(radius * texelsPerPx, 1.0));
  var sum = 0.0;
  for (var i = 0; i < 12; i++) {
    let uv = toUv(local + DISK[i] * radius);
    sum += textureSampleLevel(maps, linearSampler, uv, 0, lod).a * inside(uv);
  }
  return sum / 12.0;
}

// The car's silhouette `lift` px above the desk, cast away from the lamp. At
// intensity 0 it is the plain DOM drop shadow.
fn shadowAt(p: vec2f, lift: f32, strength: f32, domBlur: f32) -> f32 {
  let lamp = g.light.xyz;
  let projected = lamp.xy + (p - lamp.xy) * (lamp.z - lift) / max(lamp.z, lift + 1.0);
  let delta = projected - p;
  let len = length(delta);
  let lampDelta = delta * min(1.0, lift * 1.6 / max(len, 0.0001));
  let offset = mix(vec2f(0.0, -domBlur * 0.6), lampDelta, g.intensity);
  let radius = mix(domBlur, 1.5 + lift * 0.45 + len * 0.15, g.intensity);
  let opacity = mix(0.14, strength, g.intensity);
  return blurredAlpha(p + offset, radius) * opacity;
}

// One of the car's own lights on a point of it: a nearby, small source, so
// it falls off over about a car's width, brightening what faces it and
// sliding a tinted highlight over the steel and glass, as the lamp does.
fn glowAt(
  glow: vec4f,
  color: vec3f,
  p: vec2f,
  n: vec3f,
  base: vec3f,
  metal: f32,
  roughness: f32,
  glass: f32
) -> vec3f {
  if (glow.w <= 0.0) {
    return vec3f(0.0);
  }
  let toLight = glow.xyz - vec3f(p, g.surfaceHeight);
  let dist = length(toLight);
  let l = toLight / max(dist, 0.0001);
  let falloff = glow.w / (1.0 + pow(dist / 90.0, 2.0));
  let h = normalize(l + VIEW);
  let nl = max(dot(n, l), 0.0);
  let nh = max(dot(n, h), 0.0);
  let lh = max(dot(l, h), 0.0);
  let alpha = roughness * roughness;
  let alpha2 = alpha * alpha;
  let d = alpha2 / (PI * pow(nh * nh * (alpha2 - 1.0) + 1.0, 2.0));
  let f0 = mix(vec3f(0.04), clamp(base * 1.25, vec3f(0.0), vec3f(1.0)), metal);
  let fresnel = f0 + (vec3f(1.0) - f0) * pow(1.0 - lh, 5.0);
  let glint = min(d / (4.0 * max(lh * lh, 0.1)) * nl, 24.0);
  let specular = fresnel * glint * mix(0.3, 0.4, glass);
  let sheen = pow(nh, 6.0) * nl * metal * (1.0 - glass) * 0.3;
  let diffuse = base * nl * mix(0.55, 0.3, metal);
  return color * (diffuse + specular + sheen) * falloff;
}

@fragment
fn fs(in: VertexOut) -> @location(0) vec4f {
  let p = in.local;
  let uv = toUv(p);
  let cover = inside(uv);
  let photo = textureSample(maps, linearSampler, uv, 0) * cover;
  let normalTexel = textureSample(maps, linearSampler, uv, 1) * cover;
  let surfaceTexel = textureSample(maps, linearSampler, uv, 2) * cover;
  let a = photo.a;
  let unpremultiply = 1.0 / max(a, 0.0001);
  let base = photo.rgb * unpremultiply;
  let n = normalize(normalTexel.rgb * unpremultiply * 2.0 - 1.0 + vec3f(0.0, 0.0, 1e-4));
  let surface = clamp(surfaceTexel.rgb * unpremultiply, vec3f(0.0), vec3f(1.0));
  let metal = surface.r;
  let roughness = max(surface.g, 0.05);
  let glass = surface.b;

  let lamp = g.light.xyz;
  let toLight = lamp - vec3f(p, g.surfaceHeight);
  let dist = length(toLight);
  let l = toLight / dist;
  let falloff = 1.0 / (1.0 + pow(dist / (lamp.z * 1.9), 2.0));
  let h = normalize(l + VIEW);
  let nl = max(dot(n, l), 0.0);
  let nh = max(dot(n, h), 0.0);
  let lh = max(dot(l, h), 0.0);

  // GGX highlight with a Schlick Fresnel; steel tints it, glass does not.
  let alpha = roughness * roughness;
  let alpha2 = alpha * alpha;
  let d = alpha2 / (PI * pow(nh * nh * (alpha2 - 1.0) + 1.0, 2.0));
  let f0 = mix(vec3f(0.04), clamp(base * 1.25, vec3f(0.0), vec3f(1.0)), metal);
  let fresnel = f0 + (vec3f(1.0) - f0) * pow(1.0 - lh, 5.0);
  let visibility = 1.0 / (4.0 * max(lh * lh, 0.1));
  // Kept below a soft ceiling: a mirror-sharp glint would alias.
  let glint = min(d * visibility * nl, 24.0);
  let specular = fresnel * glint * falloff * mix(0.32, 0.4, glass);
  // Brushed steel also spreads the lamp into a wide sheen around the glint.
  let sheen = pow(nh, 6.0) * nl * falloff * metal * (1.0 - glass) * 0.22;

  // The photo already holds the studio's light. The lamp brightens what
  // faces it and leaves the far side to the room.
  let facing = nl * 0.65 + 0.35;
  let diffuse = (0.82 + 0.36 * facing * falloff) * mix(1.0, 0.92, metal);
  let glow = glowAt(g.glowA, g.glowAColor.rgb, p, n, base, metal, roughness, glass)
    + glowAt(g.glowB, g.glowBColor.rgb, p, n, base, metal, roughness, glass);
  let lit = base * diffuse + LAMP_COLOR * (specular + sheen) + glow;
  let rgb = min(mix(base, lit, g.intensity), vec3f(1.0));

  // A tight contact shadow under the wheels and sills, a soft one from the
  // body above them.
  let contact = shadowAt(p, 3.0, 0.42, 6.0);
  let body = shadowAt(p, 22.0, 0.26, 16.0);
  let shadow = 1.0 - (1.0 - contact) * (1.0 - body);
  let tinted = (1.0 - a) * min(shadow * SHADOW_DEPTH, 1.0);
  return vec4f(rgb * a + SHADOW_TINT * tinted, a + tinted);
}
