#version 300 es
// The toy time machine's trip, drawn over the desk around it, after the
// film. Leaving: the burnt rubber of its launch, the ball of light it
// gathers ahead of its nose, which stops and tears open into the time slice
// (a white-hot slit with ribbons of plasma whipping back over the car,
// which is gone front to back as it goes through, and one flash as it
// snaps shut), and the twin fire trails that erupt there and race on ahead
// (seen from above: flames that turn blue as they die, embers, white smoke,
// char and the light they throw). Each departure's trails keep their own
// clock, so they burn on whatever the car does next. Arriving: three
// flashes, each bigger, and out of the last the car comes through nose
// first and skids in iced over, its vents pouring steam and cold vapour
// rolling off it as it thaws.
// Everything is in the card's untransformed CSS px ("local px"): x right,
// y down the screen, the car's parked box at (0, 0). Output is
// premultiplied.
precision highp float;

uniform vec2 uResolution;
// Canvas px per local px, and where the car's box sits in the canvas, local
// px from its top-left.
uniform float uScale;
uniform vec2 uOrigin;
// The car's box, local px.
uniform vec2 uSize;
// Transparent room around the photo in its texture, local px, so blurred
// reads past the car's edge find nothing rather than its clamped edge.
uniform float uPad;
uniform float uTime;
// Where the rear tyres park, and the far and near track rows, local px.
uniform float uRear;
uniform vec2 uRows;
// Two sets of trails: seconds since their click and how far the fire
// races past the slice (0 for none), x/y and z/w.
uniform vec4 uTrails;
// Where each set lies on the desk relative to the car now, local px, x/y
// and z/w: the trails stay where they were burnt when the car is dragged.
uniform vec4 uTrailShift;
// Seconds: when the car starts to move and how long it takes to bring its
// tail through the slice; distance grows as time to the power z; w is that
// distance, local px. Mirrors getDriveOffset in src/lib/flux-charge.ts.
uniform vec4 uDrive;
// The fire: x where the slice stands (the parked nose's x minus how far
// ahead), y how fast it races on, px/s, z when it erupts, s. Mirrors
// getFirePass.
uniform vec3 uFire;
// Seconds after the fire reaches a spot: x to ignite, y burning at full
// height, z dying down, w smoke thinning out after; then scorch fading.
// Mirrors getFlameIntensity, getSmoke and getScorch.
uniform vec4 uBurn;
uniform float uScorchFade;
// x: the car's offset along the desk, y: glare as it lands (0-1), z: ice
// (0-1), w: 1 while the car stands on the desk (it hides the trails under
// it), else 0.
uniform vec4 uCar;
// The car's motion blur: x how far back along the desk its exposure
// reaches, local px (+x when it moves left), y how much of the car the
// blurred one draws (the DOM car gives way as it speeds up).
uniform vec2 uBlur;
// x: seconds since the time machine landed (negative for none), y: where
// it comes through, local px; the flashes' times, s.
uniform vec2 uArrival;
uniform vec3 uFlashes;
// The landing's skid: x where the car came through, local px, y where its
// front tyres sit along its box, z how dark the marks still are (0-1).
uniform vec3 uSkid;
uniform float uVapor;
// The car shows only between these x, local px: it is gone where it has
// gone through the slice, and not yet there where it has not come through.
uniform vec2 uClip;
// The slice it goes through or comes out of: x where it stands, y how far
// it is open (0-1), z seconds since it snapped shut (negative while open or
// for none), w how hot the car's cut edge glows (0-1).
uniform vec4 uRift;
// The ball of light ahead of the departing car's nose, how grown (0-1); it
// stands at uRift.x.
uniform float uOrb;
// The light ahead's reaction to the motes slamming into it: xy its recoil,
// px, z its swell (0-1), w its pulse (about 1), which the room's light and
// its dim share, so the room flickers with it.
uniform vec4 uImpact;
// The returned car's vents: x how hard they pour steam (0-1), y seconds
// since they started.
uniform vec2 uSteam;
uniform sampler2D uCarTexture;
// The landing's steam, rendered in Blender: a sheet of frames (premultiplied),
// x cols, y rows, z frames, w 1 once loaded; and the desk it covers, CSS px
// from the middle of the car's photo (left, top, width, height). Its red,
// green and blue are the steam's brightness under each of three suns (and
// the room's sky), its alpha the steam's coverage.
uniform sampler2D uSteamSheet;
uniform vec4 uSteamGrid;
uniform vec4 uSteamRegion;
// The desk lamp, local px: x and y over the desk, z its height, w 1 while
// it is on (the room's daylight otherwise).
uniform vec4 uLamp;
// STEAM_SHEET.fps and .lights in src/lib/flux-charge.ts: the three suns'
// azimuths (anticlockwise from the screen's right, 90 up the screen) and
// height, which the first, the room's daylight, shares.
const float STEAM_FPS = 10.0;
const vec3 STEAM_LIGHTS = vec3(135.0, 255.0, 15.0);
const float STEAM_LIGHT_ELEVATION = 35.0;
// How high the steam stands over the desk on average, local px: its shadow
// falls this far from it, scaled by the light's slant.
const float STEAM_LIFT = 40.0;
// How much of the rendered passes' shading the steam keeps.
const float STEAM_SHADE_DEPTH = 0.45;
// The photo's camera leans 26 degrees: height shows up the screen.
const vec2 TILT_TRIG = vec2(0.8988, 0.4384);
// Where the light ahead and the slice stand across the car's height, a share
// of it from its top; ORB_Y in flux-charge.tsx matches.
const float ORB_Y = 0.52;

out vec4 outColor;

float hash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
    mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
    u.y
  );
}

const mat2 OCTAVE = mat2(1.6, 1.2, -1.2, 1.6);

float fbm(vec2 p) {
  float value = 0.0;
  float amplitude = 0.5;
  for (int i = 0; i < 5; i++) {
    value += amplitude * noise(p);
    p = OCTAVE * p;
    amplitude *= 0.5;
  }
  return value;
}

float fbm3(vec2 p) {
  float value = 0.0;
  float amplitude = 0.5;
  for (int i = 0; i < 3; i++) {
    value += amplitude * noise(p);
    p = OCTAVE * p;
    amplitude *= 0.5;
  }
  return value;
}

// The film's fire: an overexposed white heart, pale gold around it and
// only a thin amber rim, with cobalt blue at its cool edges and roots; as
// it dies down the whole of it turns blue, as burning fuel does, before it
// goes out. `blue` is how far it has turned. Generic orange flames read as
// a campfire, not the film's trails.
vec3 fireColor(float t, float blue) {
  vec3 warm = mix(vec3(0.95, 0.42, 0.05), vec3(1.0, 0.74, 0.3), smoothstep(0.08, 0.3, t));
  warm = mix(warm, vec3(1.0, 0.93, 0.72), smoothstep(0.3, 0.55, t));
  warm = mix(warm, vec3(1.0), smoothstep(0.55, 0.85, t));
  vec3 cold = mix(vec3(0.07, 0.17, 0.9), vec3(0.3, 0.6, 1.0), smoothstep(0.15, 0.6, t));
  cold = mix(cold, vec3(0.88, 0.95, 1.0), smoothstep(0.72, 1.0, t));
  return mix(warm, cold, blue);
}

// Half a tyre's track on the desk, local px: a tread about 10 px wide.
const float TRACK_HALF = 4.6;

vec4 over(vec4 top, vec4 under) {
  return top + under * (1.0 - top.a);
}

// The car's photo in its padded texture, at a box uv.
vec4 carTexel(vec2 uv, float lod) {
  vec2 padded = (uv * uSize + uPad) / (uSize + 2.0 * uPad);
  return textureLod(uCarTexture, padded, lod);
}

// Where the tear runs at height `y` (px from the middle of the car's
// height): not a ruled line but one that wanders and shivers, wider apart
// towards its ends. The car is cut along it, so the cut is never straight.
float tearLine(float y) {
  float ends = smoothstep(10.0, 110.0, abs(y));
  // It bows round the car, cupping it.
  float side = uArrival.x >= 0.0 ? -1.0 : 1.0;
  float bow = side * 10.0 * (1.0 - min(y * y / 3900.0, 1.0));
  float wave = sin(y * 0.05 - uTime * 26.0 * sign(y)) * 1.6 * ends;
  return bow + wave + (fbm3(vec2(y * 0.025, uTime * 9.0)) - 0.5) * (3.0 + 7.0 * ends) + (noise(vec2(y * 0.18, uTime * 30.0)) - 0.5) * 0.8;
}

// Leaving, the car is drawn out into the tear over its last px: how far
// back along it to read its photo at `p`, local px.
float tearPull(vec2 p) {
  if (uRift.w <= 0.0 || uArrival.x >= 0.0 || p.x - uClip.x > 60.0) {
    return 0.0;
  }
  float at = p.x - uClip.x - tearLine(p.y - uSize.y * ORB_Y);
  return 14.0 * uRift.w * (1.0 - smoothstep(0.0, 28.0, at));
}

// How much of the car shows at `p`: none past the slice it went through or
// before the one it is coming out of, cut along the tear.
float shown(vec2 p) {
  // The tear wanders under 20 px either way: away from it, skip its noise.
  float near = min(abs(p.x - uClip.x), abs(p.x - uClip.y));
  float tear = near < 32.0 ? tearLine(p.y - uSize.y * ORB_Y) : 0.0;
  return smoothstep(uClip.x + tear - 0.8, uClip.x + tear + 1.6, p.x) * (1.0 - smoothstep(uClip.y + tear - 1.6, uClip.y + tear + 0.8, p.x));
}

// One tyre track. Behind the slice, the launch's burnt rubber, laid as the
// rear tyre spun and passed, darkest where it spun hardest at the start,
// with a puff of burnout smoke. Past it, the fire erupts where the tyre
// crossed and races on ahead at its own speed: seen from above, a sheet of
// flame over the track whose licks lean up the screen as they rise (the
// view tilts 26 degrees), charring the desk under it, lighting it, turning
// blue as it dies and leaving white smoke. `fireLength` is how far the fire
// runs past the slice.
vec4 trail(vec2 p, float row, float seed, float t, float fireLength) {
  float beyond = uFire.x - p.x;
  float h = row - p.y;
  if (p.x > uRear + 40.0 || beyond > fireLength + 60.0 || h < -70.0 || h > 170.0) {
    return vec4(0.0);
  }
  float burntOut = uBurn.y + uBurn.z;
  float across = p.y - row;
  vec4 color = vec4(0.0);

  if (beyond < 0.0) {
    float covered = uRear - p.x;
    float pass = uDrive.x + uDrive.y * pow(clamp(covered / uDrive.w, 0.0, 1.0), 1.0 / uDrive.z);
    float age = t - pass;
    if (age < 0.0) {
      return vec4(0.0);
    }
    // Rubber only where the tyres spun at the start: a long even line read
    // as rails, and a blunt dark cap where the tyre stood as a cut edge.
    // It darkens in over a ragged run behind the parked tyre, falls away
    // within a car length, and breaks into the tread's streaks as it goes.
    float jitter = (fbm3(vec2(across * 0.3, seed)) - 0.5) * 22.0;
    float start = smoothstep(-14.0, 36.0, covered + jitter);
    float falloff = exp(-pow(max(covered, 0.0) / 85.0, 1.6));
    float spin = falloff * start * mix(0.35, 1.0, fbm3(vec2(p.x * 0.03, seed + 4.0)));
    float rubber = smoothstep(0.0, 0.02, age) * (1.0 - clamp((age - burntOut) / uScorchFade, 0.0, 1.0)) * spin;
    float edge = abs(across) + (fbm3(vec2(p.x * 0.09, across * 0.3 + seed)) - 0.5) * 4.0;
    float strip = 1.0 - smoothstep(TRACK_HALF * 0.35, TRACK_HALF * 1.15, edge);
    // Streaks along the tread, thinning out where the spin eases.
    float tread = fbm3(vec2(p.x * 0.012 + seed, across * 0.55));
    float streaks = smoothstep(0.62 - 0.45 * falloff, 0.82, tread + 0.25 * falloff);
    float mark = strip * streaks * (0.45 + 0.3 * fbm3(vec2(p.x * 0.05, across * 0.4 + seed * 3.0))) * rubber;
    color = vec4(vec3(0.1, 0.09, 0.085) * mark, mark);
    float smokeAmount = clamp(age / 0.2, 0.0, 1.0) * (1.0 - clamp(age / 1.8, 0.0, 1.0)) * spin * 0.8;
    if (smokeAmount > 0.0) {
      vec2 sq = vec2((p.x + age * 18.0) / 26.0 + seed, (h - age * 30.0) / 26.0);
      float smoke = fbm3(sq + vec2(fbm3(sq * 1.7 + uTime * 0.15), fbm3(sq * 1.3 - 2.7)) * 1.1);
      float band = smoothstep(-6.0, 6.0, h) * (1.0 - smoothstep(20.0, 60.0, h));
      float alpha = pow(smoothstep(0.42, 0.72, smoke), 1.4) * band * smokeAmount * 0.45;
      color = over(vec4(vec3(0.62, 0.62, 0.63) * alpha, alpha), color);
    }
    return color;
  }

  float age = t - (uFire.z + beyond / uFire.y);
  if (age < 0.0) {
    return vec4(0.0);
  }
  // It grows in over a ragged run from where it erupted, never from a cut
  // edge, and peters out at the far end.
  float jag = (fbm3(vec2(across * 0.12, seed * 3.0 + 1.0)) - 0.5) * 36.0;
  float lead = smoothstep(-6.0, 46.0, beyond + jag);
  float along = lead * (1.0 - smoothstep(fireLength - 40.0, fireLength, beyond));
  float fade = clamp((age - uBurn.y) / uBurn.z, 0.0, 1.0);
  float intensity = clamp(age / uBurn.x, 0.0, 1.0) * (1.0 - fade) * along;
  float blue = smoothstep(0.0, 0.45, fade);
  // Where it erupted it flares for a moment, then burns like the rest.
  float flare = exp(-pow((beyond - 30.0) / 40.0, 2.0)) * exp(-age / 0.35) * lead;

  // The char: the line the fire burnt wanders and swells, patchy and
  // blistered, inside a soft soot shadow; a ruled strip read as a pen line.
  float wander = (fbm3(vec2(p.x * 0.011, seed * 3.1)) - 0.5) * 7.0;
  float c = across - wander;
  float swell = fbm3(vec2(p.x * 0.021 + seed, 1.7));
  float halfWidth = TRACK_HALF * (0.7 + 1.5 * swell) * smoothstep(-6.0, 46.0, beyond + jag);
  float blotch = fbm(vec2(p.x * 0.045, c * 0.1) + seed * 7.0);
  float rough = (fbm3(vec2(p.x * 0.11, c * 0.25 + seed)) - 0.5) * 5.0;
  float charring = smoothstep(0.0, 0.6, age) * (1.0 - clamp((age - burntOut) / uScorchFade, 0.0, 1.0));
  float core = (1.0 - smoothstep(halfWidth * 0.45, halfWidth * 0.45 + 2.5, abs(c) + rough * 0.6)) * smoothstep(0.3, 0.62, blotch);
  float halo = 1.0 - smoothstep(halfWidth * 0.5, halfWidth * 1.8 + 5.0, abs(c) + rough);
  float sootAlpha = halo * (0.16 + 0.26 * blotch) * charring * along;
  float charAlpha = core * 0.78 * charring * along;
  color = over(vec4(vec3(0.33, 0.3, 0.27) * sootAlpha, sootAlpha), color);
  color = over(vec4(vec3(0.09, 0.075, 0.065) * charAlpha, charAlpha), color);
  // Smouldering specks in the char as the flames die down.
  vec2 speckCell = floor(vec2(p.x * 0.5, c * 0.5));
  float speck = step(0.86, hash(speckCell + seed)) * smoothstep(0.55, 0.0, length(fract(vec2(p.x * 0.5, c * 0.5)) - 0.5));
  float smoulder = speck * core * smoothstep(0.15, 0.6, fade) * (1.0 - clamp((age - burntOut) / 1.6, 0.0, 1.0)) * (0.6 + 0.4 * noise(vec2(uTime * 6.0, speckCell.x)));
  color = over(vec4(vec3(1.0, 0.45, 0.1) * smoulder, smoulder), color);

  // The flames' light on the desk around them, flickering with them.
  float flicker = 0.8 + 0.2 * noise(vec2(uTime * 7.0, seed + p.x * 0.004));
  float lit = intensity + flare;
  float light = exp(-pow(c / (14.0 + 8.0 * lit), 2.0)) * min(lit, 1.4) * flicker * 0.2;
  color = over(vec4(mix(vec3(1.0, 0.66, 0.3), vec3(0.4, 0.58, 1.0), blue) * light, light), color);

  // White smoke, rising up the screen and billowing wider as it climbs:
  // a veil while the fire burns, heavier as it dies, then thinning away.
  float dying = smoothstep(0.3, 1.0, fade);
  float smokeAmount = clamp(age / 0.6, 0.0, 1.0) * (0.35 + 0.65 * dying) * (1.0 - clamp((age - burntOut) / uBurn.w, 0.0, 1.0)) * along;
  if (smokeAmount > 0.0) {
    float puffSize = mix(20.0, 56.0, smoothstep(0.0, 5.0, age));
    vec2 sq = vec2((p.x + age * 14.0) / puffSize + seed, (h - age * 24.0) / puffSize);
    vec2 swirl = vec2(fbm3(sq * 1.7 + uTime * 0.15), fbm3(sq * 1.3 - 2.7));
    float smoke = fbm3(sq + swirl * 1.1);
    float above = fbm3(sq + swirl * 1.1 + vec2(0.0, 0.09));
    float top = mix(36.0, 90.0, smokeAmount) + age * 9.0;
    float band = smoothstep(-8.0, 8.0, h) * (1.0 - smoothstep(top * 0.4, top, h));
    float density = pow(smoothstep(0.4, 0.72, smoke), 1.3) * band * smokeAmount;
    float alpha = density * 0.5;
    float facing = clamp(0.5 + (smoke - above) * 7.0, 0.0, 1.0);
    vec3 shade = mix(vec3(0.66, 0.68, 0.72), vec3(0.97, 0.97, 0.98), facing);
    // Lit from under by the flames.
    shade = mix(shade, mix(vec3(1.0, 0.7, 0.42), vec3(0.6, 0.72, 1.0), blue), (1.0 - smoothstep(0.0, 22.0, h)) * intensity * 0.45);
    color = over(vec4(shade * alpha, alpha), color);
  }

  if (intensity + flare <= 0.002) {
    return color;
  }
  // The flames, from above: a sheet over the track, wider where more
  // rubber burns, its licks reaching up the screen. Gases stream up and
  // speed up as they climb; the noise moves with them, so the sheet seethes.
  float burning = min(1.0, intensity + flare * 0.8);
  float shrink = 1.0 - 0.55 * blue;
  float spread = TRACK_HALF * (1.2 + 1.0 * burning) * (0.75 + 0.5 * fbm3(vec2(p.x * 0.03 + seed, uTime * 0.4))) * shrink;
  float reach = (16.0 + 26.0 * flare) * burning * shrink * (0.45 + 1.0 * fbm3(vec2(p.x * 0.04 - seed, uTime * 0.9)));
  float up = max(0.0, -c);
  float climb = c * 0.11 - up * up * 0.0016;
  vec2 q = vec2(p.x * 0.085 + seed * 5.0, climb + uTime * 3.4);
  vec2 warp = vec2(fbm3(q * 0.8 + vec2(0.0, uTime * 0.7)), fbm3(q * 0.8 + vec2(4.3, -uTime * 0.5)));
  float n = fbm(q + (warp - 0.5) * 2.2);
  float fuel = noise(vec2(p.x * 0.06 - seed * 2.0, uTime * 0.9)) * 0.6 + noise(vec2(p.x * 0.25, uTime * 3.0)) * 0.4;
  // Thinning quickly past its near edge, slowly along the licks.
  // Its near edge curls too, a few px down the screen: a straight lower
  // edge read as a strip laid on the desk.
  float curl = spread * (0.55 + 0.6 * fbm3(vec2(p.x * 0.07 - seed, uTime * 1.3))) + 2.0;
  float shape = c >= 0.0
    ? 1.0 - smoothstep(curl * 0.3, curl, c)
    : 1.0 - smoothstep(spread * 0.3, spread + reach, up);
  // Nothing past the licks: noise alone stood flames up as specks all
  // over the desk around the trail.
  float envelope = c >= 0.0
    ? 1.0 - smoothstep(curl, curl + 6.0, c)
    : 1.0 - smoothstep(spread + reach, spread + reach + 8.0, up);
  float density = (shape * mix(0.6, 1.25, fuel) + (n - 0.5) * 1.6 - 0.18) * envelope;
  float heat = clamp(density, 0.0, 1.2);
  float alpha = smoothstep(0.02, 0.5, heat) * min(1.0, burning * 1.6) * mix(1.0, 0.72, blue);
  // Hottest over the burning rubber, cooling out and up; just caught, it is
  // white-hot.
  float middle = exp(-pow(c / max(spread * 0.7, 1.0), 2.0));
  float front = 1.0 - smoothstep(0.0, 0.12, age);
  float temperature = clamp(heat * 0.5 + middle * 0.45 * mix(0.6, 1.0, fuel) + front * 0.5 + flare * 0.5, 0.0, 1.0);
  vec3 flame = fireColor(temperature, blue);
  // Blue roots at its cool rim, down by the desk, as the film's have.
  float root = (1.0 - smoothstep(0.2, 0.55, heat)) * (1.0 - blue);
  // They glow: lighter and thinner than the body, so a faint root adds
  // light to the desk; a dark cobalt at low alpha read as purple dirt.
  flame = mix(flame, vec3(0.42, 0.64, 1.0), root * 0.75);
  color = over(vec4(flame * alpha, alpha * mix(1.0, 0.45, root)), color);

  // Embers drifting up out of it.
  vec2 grid = vec2(p.x * 0.22 + sin(h * 0.08 + uTime * 2.0) * 0.4, (h + uTime * 34.0) * 0.12);
  vec2 cell = floor(grid);
  vec2 spot = vec2(hash(cell + seed + 1.7), hash(cell + 3.1));
  float distance = length((fract(grid) - spot) * vec2(1.0, 1.4));
  float ember = step(0.975, hash(cell + seed)) * smoothstep(0.08, 0.0, distance);
  ember *= step(2.0, h) * (1.0 - smoothstep(reach * 0.6, reach * 1.2 + 6.0, h)) * burning * (1.0 - blue);
  return over(vec4(vec3(1.0, 0.8, 0.45) * ember, ember), color);
}

// The landing car's skid: dark rubber laid by all four tyres from where
// they came through to where they are, fading once it has stopped.
vec4 skid(vec2 p) {
  if (uArrival.x < 0.0 || uSkid.z <= 0.0) {
    return vec4(0.0);
  }
  float mark = 0.0;
  for (int axle = 0; axle < 2; axle++) {
    float tyre = axle == 0 ? uSkid.y : uRear;
    float from = tyre + uCar.x;
    float to = uSkid.x;
    // Laid as it slid in: faint where the brakes first locked, darkest
    // where it stopped.
    // Darkest where it stopped, faint where it came through: locked tyres
    // lay rubber as they heat.
    float along = smoothstep(from - 2.0, from + 4.0, p.x) * (1.0 - smoothstep(from + 10.0, from + 140.0, p.x) * 0.9) * (1.0 - smoothstep(to - 35.0, to, p.x));
    for (int r = 0; r < 2; r++) {
      float row = r == 0 ? uRows.x : uRows.y;
      // A little off the departure's tracks, so both show.
      float wobble = 3.0 + (noise(vec2(p.x * 0.05, float(axle * 2 + r))) - 0.5) * 2.5;
      float across = abs(p.y - row - wobble);
      float strip = 1.0 - smoothstep(TRACK_HALF - 1.6, TRACK_HALF + 0.4, across);
      float grain = 0.75 + 0.25 * noise(vec2(p.x * 0.02, across * 0.8 + float(r)));
      mark = max(mark, strip * along * grain);
    }
  }
  float alpha = mark * 0.55 * uSkid.z;
  return vec4(vec3(0.06, 0.055, 0.05) * alpha, alpha);
}

// The arriving car: a glare as it lands, then a coat of hoar frost that
// melts away, over the DOM car, as cold-soaked metal frosts in warm humid
// air. It lies thickest and longest in the middle of the big flat panels,
// which hold the cold; thin trim, edges, seams and tyres warm fastest and
// clear first, and so does the reactor; glass is frosted all over, thinner.
// Each spot melts through the real stages: dry white crystals that blur
// the car under them, then translucent slush (meltwater fills the pores and
// the white goes before the ice does), then a water film that darkens the
// steel a little and gleams, breaking into beads that dry off. Frost that
// held out longest along seams and edges left a wireframe of the car once
// its panels had cleared. Its noise is in the car's own px, so it rides
// with the car as it slides to a stop.
vec4 ice(vec2 p) {
  float frost = uCar.z;
  float glare = uCar.y;
  if (uCar.w < 0.5 || frost + glare <= 0.0) {
    return vec4(0.0);
  }
  vec2 uv = (p - vec2(uCar.x, 0.0)) / uSize;
  vec4 texel = carTexel(uv, 0.0);
  float body = texel.a * shown(p);
  if (body <= 0.0) {
    return vec4(0.0);
  }
  vec2 local = uv * uSize;
  vec4 blurred = carTexel(uv, 2.0);
  vec3 soft = blurred.rgb / max(blurred.a, 0.001);
  vec4 coarser = carTexel(uv, 3.5);
  vec3 broad = coarser.rgb / max(coarser.a, 0.001);
  // Busy detail a few px wide (trim, seams, the engine bay) and the
  // silhouette, read from blurred levels: from the sharp photo every 1 px
  // seam cleared at once and showed through dark, like a pencil sketch.
  float edge = clamp(length(soft - broad) * 3.0 + (1.0 - coarser.a) * 1.5, 0.0, 1.0);
  // Glass and rubber by their broad tone, so thin dark seams are not glass.
  float dark = 1.0 - smoothstep(0.18, 0.45, dot(soft, vec3(0.299, 0.587, 0.114)));
  float panel = (1.0 - dark) * (1.0 - edge);
  // The reactor and the vents behind it are warm.
  float reactor = max(exp(-pow(length(local - uSize * vec2(0.86, 0.5)) / 60.0, 2.0)), smoothstep(0.88, 0.97, uv.x));
  // Blotches 28 px across and clusters of 6, as frost grows unevenly.
  float coarse = fbm3(local / 28.0 + 3.0);
  float cluster = fbm3(local / 6.5 + 11.0);
  float grain = noise(local * 0.7) * 0.4 + noise(local * 1.7 + 7.0) * 0.3 + noise(local * 2.6 + 3.0) * 0.3;
  float hold = clamp(0.5 + 0.3 * panel - 0.25 * edge - 0.22 * dark - 0.45 * reactor + 0.55 * (coarse - 0.44) + 0.25 * (cluster - 0.44), 0.0, 1.0);
  // How far past melting each spot is: the warm edges begin at once and
  // the melt eats steadily inward over the thaw, with wide soft fronts. A
  // late start and narrow fronts held the hood frozen for most of it, then
  // cleared it within a second.
  float thaw = 1.0 - frost;
  float state = hold + 0.1 - thaw * 1.45;
  float dry = smoothstep(0.02, 0.3, state + 0.1 * (grain - 0.5));
  float slush = smoothstep(-0.04, 0.2, state) * (1.0 - dry);
  float wet = smoothstep(-0.24, -0.02, state) * (1.0 - smoothstep(-0.02, 0.06, state));
  vec4 color = vec4(0.0);
  // Under the ice the car shows blurred.
  float under = body * clamp(0.75 * dry + 0.25 * slush, 0.0, 1.0);
  color = over(vec4(soft * under, under), color);
  // Meltwater darkens the steel, coolly: wet brushed steel is darker and
  // crisper, never milky. Slush lays a thin grey-clear veil.
  float damp = body * (0.16 * wet + 0.06 * slush);
  color = over(vec4(vec3(0.086, 0.133, 0.18) * damp, damp), color);
  float veil = body * 0.25 * slush;
  color = over(vec4(vec3(0.82, 0.88, 0.93) * veil, veil), color);
  // Dry frost: bright matte white with a faint crystal grain, bluer where
  // it is thin, thinner over glass and rubber.
  // Not an opaque blanket: the steel's grain shows through it.
  float coat = body * dry * (1.0 - 0.35 * dark) * (0.72 + 0.12 * grain);
  vec3 tone = mix(vec3(0.8, 0.88, 0.96), vec3(0.9, 0.95, 1.0), smoothstep(0.1, 0.5, state)) + 0.08 * (grain - 0.5);
  vec2 flakeCell = floor(local * 1.2);
  float flake = step(0.988, hash(flakeCell)) * (0.6 + 0.4 * sin(uTime * 9.0 + hash(flakeCell + 7.0) * 40.0)) * dry;
  tone = mix(tone, vec3(1.0), flake);
  color = over(vec4(tone * coat, coat), color);
  // The water film gleams, then breaks into beads that dry off.
  float sheen = body * wet * 0.16 * (1.0 - dark);
  color = over(vec4(vec3(0.88, 0.94, 1.0) * sheen, sheen), color);
  // Beads 1.5-2.5 px across, sitting on the steel with a faint dark rim;
  // lone white px read as dust.
  vec2 beadCell = floor(local * 0.22);
  vec2 beadAt = (fract(local * 0.22) - 0.5) / 0.22 + (vec2(hash(beadCell + 2.3), hash(beadCell + 8.9)) - 0.5) * 2.0;
  float beadSize = (0.75 + 0.5 * hash(beadCell + 6.6)) * (0.4 + 0.6 * smoothstep(-0.24, -0.08, state));
  float beadIs = step(0.85, hash(beadCell + 4.1)) * body * wet * (1.0 - edge);
  float distance_ = length(beadAt);
  float rim = beadIs * smoothstep(beadSize - 0.4, beadSize, distance_) * (1.0 - smoothstep(beadSize, beadSize + 0.6, distance_)) * 0.18;
  color = over(vec4(vec3(0.059, 0.09, 0.118) * rim, rim), color);
  float glint = beadIs * (1.0 - smoothstep(beadSize * 0.3, beadSize * 0.7, length(beadAt + vec2(0.3, 0.3)))) * 0.32;
  color = over(vec4(vec3(0.9, 0.96, 1.0) * glint, glint), color);
  float flash = body * glare * 0.8;
  return over(vec4(vec3(0.92, 0.97, 1.0) * flash, flash), color);
}

// Cold vapour pouring off the iced car. A heavy skirt slumps out over the
// desk from under it, spreading as it pours, widest at the reactor and the
// wheel wells, rolling down the screen; the car stands on it. It is white
// where it is thick, by the car, and only its thin outer rim is shaded
// slate: slate right against the car read as a grey stain.
float fogAt(vec2 q) {
  return fbm(q + vec2(fbm3(q * 1.4 + uTime * 0.25), fbm3(q * 1.2 - 4.1 - uTime * 0.2)) * 1.2);
}

vec4 vapourSkirt(vec2 p) {
  if (uVapor <= 0.0) {
    return vec4(0.0);
  }
  float landed = max(0.0, uArrival.x - uFlashes.z);
  vec2 local = p - vec2(uCar.x, 0.0);
  vec2 outside = max(vec2(0.0), abs(local - uSize * 0.5) - uSize * 0.5 + 18.0);
  float beyond = length(outside) - 18.0;
  float u = local.x / uSize.x;
  float wells = exp(-pow((u - 0.21) / 0.08, 2.0)) + exp(-pow((u - 0.79) / 0.08, 2.0));
  float spread = mix(12.0, 55.0, 1.0 - exp(-landed * 1.1));
  float reach = spread * (1.0 + 0.6 * smoothstep(0.7, 1.0, u) + 0.35 * wells + 0.4 * step(uSize.y * 0.5, local.y));
  // Rolling outward from the car as it pours.
  vec2 away = normalize(local - uSize * 0.5 + vec2(0.001));
  // Rolling outward since it landed. Scaled by the page's clock, the
  // direction's small changes between pixels tore it into rings.
  // It stops rolling out after a few seconds: rolled on through a long thaw,
  // the direction's change between pixels drew rings.
  float rolled = 0.45 * (1.0 - exp(-landed / 1.2));
  vec2 q = p / 22.0 - away * rolled + vec2(landed * 0.05, -landed * 0.12);
  float fog = fogAt(q);
  float above = fogAt(q + vec2(0.0, 0.08));
  float edge = beyond + (fog - 0.5) * 26.0;
  float fall = 1.0 - smoothstep(reach * 0.45, reach, edge);
  // Round billows, not strands, with soft edges: a sharp threshold tore
  // them into scraps of paper.
  float density = smoothstep(0.3, 0.78, fog) * fall;
  float rim = smoothstep(reach - 14.0, reach, edge);
  // The cold shade the fog throws on the desk under it, which the white
  // billows stand out against.
  float cushion = (1.0 - smoothstep(0.0, reach * 1.1, beyond)) * 0.28 * uVapor;
  vec4 color = vec4(vec3(0.55, 0.62, 0.7) * cushion, cushion);
  float alpha = clamp(density * mix(0.9, 0.45, smoothstep(0.0, reach, edge)), 0.0, 0.9) * uVapor;
  // Nothing pours out past where the car came through.
  float behind = 1.0 - smoothstep(uClip.y - 10.0, uClip.y + 30.0, p.x);
  alpha *= behind;
  color *= behind;
  float lit = clamp(0.5 + (fog - above) * 8.0, 0.0, 1.0);
  vec3 tone = mix(vec3(0.88, 0.92, 0.97), vec3(1.0), lit);
  tone = mix(tone, vec3(0.66, 0.73, 0.8), rim * 0.7);
  return over(vec4(tone * alpha, alpha), color);
}

// Cold gas curling off the reactor's vents and out of the wheel arches,
// over the car.
vec4 vapourWisps(vec2 p) {
  if (uVapor <= 0.0) {
    return vec4(0.0);
  }
  float alpha = 0.0;
  float shade = 0.0;
  for (int i = 0; i < 4; i++) {
    vec2 origin;
    if (i == 0) origin = vec2(0.86, 0.3);
    else if (i == 1) origin = vec2(0.86, 0.62);
    else if (i == 2) origin = vec2(0.21, 0.95);
    else origin = vec2(0.79, 0.95);
    vec2 w = p - vec2(uCar.x, 0.0) - origin * uSize;
    float rise = i < 2 ? -w.y : w.y;
    vec2 wq = vec2(w.x * 0.08 + sin(rise * 0.06 + uTime * 1.3 + float(i)) * 0.5, rise * 0.06 - uTime * 1.2 + float(i) * 3.1);
    float wisp = fbm3(wq) * smoothstep(-4.0, 4.0, rise) * (1.0 - smoothstep(10.0, i < 2 ? 46.0 : 22.0, rise));
    // Billowing out over the dark reactor deck, where white reads best.
    wisp *= exp(-pow(w.x / ((i < 2 ? 16.0 : 8.0) + rise * 0.5), 2.0));
    float a = clamp((wisp - 0.22) * 2.4, 0.0, 1.0);
    alpha = max(alpha, a);
    shade = max(shade, wisp);
  }
  alpha *= 0.65 * uVapor * (1.0 - smoothstep(uClip.y - 6.0, uClip.y + 10.0, p.x));
  vec3 tone = mix(vec3(0.8, 0.86, 0.92), vec3(1.0), smoothstep(0.3, 0.6, shade));
  return vec4(tone * alpha, alpha);
}

// Steam pouring out of the returned car's rear vents, as the film's does:
// a stream of round billows from each vent, swelling and slowing as they
// roll back off it and up the screen, overlapping into one thick cloud,
// lit from the top left, with cauliflower edges. Noise along a plume read
// as strands of wool and a thin smudge.
vec4 ventSteam(vec2 p) {
  if (uSteam.x <= 0.0) {
    return vec4(0.0);
  }
  float field = 0.0;
  vec2 outward = vec2(0.0);
  const float PERIOD = 2.4;
  for (int i = 0; i < 2; i++) {
    float fi = float(i);
    vec2 source = vec2(uCar.x, 0.0) + vec2(0.95, i == 0 ? 0.3 : 0.56) * uSize;
    for (int k = 0; k < 10; k++) {
      float fk = float(k);
      float offset = fk * PERIOD / 10.0 + hash(vec2(fk, fi + 2.0)) * 0.12;
      // Born again every period while the vents pour.
      float age = mod(uSteam.y - offset, PERIOD) + (uSteam.y < offset ? -PERIOD : 0.0);
      if (age < 0.0 || uSteam.y - age < 0.0) {
        continue;
      }
      float angle = (i == 0 ? -0.75 : -0.35) + (hash(vec2(fk, fi)) - 0.5) * 0.7;
      vec2 dir = vec2(cos(angle), sin(angle));
      // Each puff throws its own distance and keeps drifting: all of them
      // stopping at one reach piled up into a smooth wall.
      float strength = 0.6 + 0.7 * hash(vec2(fk + 7.0, fi * 3.0));
      float travel = 150.0 * strength * (1.0 - exp(-age * 1.2)) + age * 22.0;
      float radius = (12.0 + 58.0 * (1.0 - exp(-age * 1.1))) * mix(0.75, 1.2, hash(vec2(fk, fi + 9.0)));
      vec2 centre = source + dir * travel + vec2(0.0, -age * 14.0);
      vec2 off = (p - centre) / radius;
      float r2 = dot(off, off);
      if (r2 >= 1.0) {
        continue;
      }
      float weight = (1.0 - r2) * (1.0 - r2) * (1.0 - smoothstep(PERIOD * 0.6, PERIOD, age));
      field += weight;
      outward += off * weight;
    }
  }
  if (field <= 0.0) {
    return vec4(0.0);
  }
  // Billows within billows: one scale of noise left smooth balls that
  // read as cotton wool.
  vec2 q = p / 20.0 + vec2(uTime * 0.12, -uTime * 0.2);
  float n = fbm3(q + vec2(fbm3(q * 1.5), fbm3(q * 1.5 + 3.1)) * 0.8);
  float fine = fbm3(p / 7.0 + vec2(-uTime * 0.3, -uTime * 0.45) + n * 1.5);
  n = mix(n, fine, 0.4);
  // The noise eats in from the rim rather than pushing past it: added to
  // the field, it stood the cloud's outer edge up as a hard wall.
  float density = smoothstep(0.16, 0.5, field * (0.45 + 1.1 * n));
  float facing = 0.55 + 0.45 * dot(normalize(outward + vec2(1e-4)), vec2(-0.6, -0.8)) * smoothstep(0.0, 0.6, length(outward) / field);
  vec3 tone = mix(vec3(0.7, 0.75, 0.83), vec3(0.99, 0.995, 1.0), clamp(facing + (n - 0.5) * 0.4, 0.0, 1.0));
  float alpha = density * 0.93 * uSteam.x;
  return vec4(tone * alpha, alpha);
}

// One frame of the steam sheet at `uv` (0-1 across its region), kept inside
// its own cell so linear filtering never reads the neighbouring frame.
vec4 steamCell(vec2 uv, float index) {
  vec2 grid = uSteamGrid.xy;
  vec2 cell = vec2(mod(index, grid.x), floor(index / grid.x));
  vec2 inset = 0.5 * grid / vec2(textureSize(uSteamSheet, 0));
  return textureLod(uSteamSheet, (cell + clamp(uv, inset, 1.0 - inset)) / grid, 0.0);
}

// The sheet at `p`, its frames blended in time (premultiplied).
vec4 steamTexel(vec2 p) {
  vec2 uv = (p - vec2(uCar.x, 0.0) - uSize * 0.5 - uSteamRegion.xy) / uSteamRegion.zw;
  if (uv.x < 0.0 || uv.y < 0.0 || uv.x > 1.0 || uv.y > 1.0) {
    return vec4(0.0);
  }
  float last = uSteamGrid.z - 1.0;
  float frame = clamp(uSteam.y * STEAM_FPS, 0.0, last);
  float first = floor(frame);
  return mix(steamCell(uv, first), steamCell(uv, min(first + 1.0, last)), frame - first);
}

// Where the light on the steam at `p` comes from: its direction across the
// desk (x right, y up the screen) and how far it leans from the suns'
// height towards overhead (1 at their height or lower, 0 straight above).
vec3 steamLightFrom(vec2 p) {
  if (uLamp.w < 0.5) {
    float azimuth = radians(STEAM_LIGHTS.x);
    return vec3(cos(azimuth), sin(azimuth), 1.0);
  }
  vec2 toward = (uLamp.xy - p) * vec2(1.0, -1.0);
  float across = length(toward);
  float lean = across / length(vec2(across, uLamp.z));
  return vec3(across > 0.0 ? toward / across : vec2(0.0), min(1.0, lean / cos(radians(STEAM_LIGHT_ELEVATION))));
}

// The share each sun's pass takes: one at its own azimuth and height,
// blending between neighbours, and evening out as the light rises overhead.
vec3 steamShares(vec2 p) {
  vec3 from = steamLightFrom(p);
  vec3 azimuths = radians(STEAM_LIGHTS);
  vec3 cosines = vec3(
    dot(from.xy, vec2(cos(azimuths.x), sin(azimuths.x))),
    dot(from.xy, vec2(cos(azimuths.y), sin(azimuths.y))),
    dot(from.xy, vec2(cos(azimuths.z), sin(azimuths.z)))
  );
  vec3 shares = max(vec3(0.0), 1.0 / 3.0 + (2.0 / 3.0) * from.z * cosines);
  return shares / max(1e-4, shares.x + shares.y + shares.z);
}

// The steam the landed car pours and the cold vapour rolling off it, from
// the simulation, lit from wherever the light is.
vec4 sheetSteam(vec2 p) {
  if (uSteam.x <= 0.0) {
    return vec4(0.0);
  }
  vec4 texel = steamTexel(p);
  if (texel.a <= 0.002) {
    return vec4(0.0);
  }
  // The passes are sRGB brightness; light adds in linear terms.
  vec3 passes = pow(texel.rgb / texel.a, vec3(2.2));
  float light = dot(passes, steamShares(p));
  // Rendered against a dim sky, its shaded side came out smoke grey; in the
  // room's daylight steam on a white desk stays near white, so only part of
  // the rendered shading is kept.
  float shaded = 1.0 - (1.0 - pow(light, 1.0 / 2.2)) * STEAM_SHADE_DEPTH;
  vec3 tone = vec3(shaded) * vec3(0.985, 0.99, 1.0);
  return vec4(tone * texel.a, texel.a) * uSteam.x;
}

// The steam's shadow on the desk: its coverage, cast away from the light
// by how high it stands and softened.
vec4 steamShadow(vec2 p) {
  if (uSteam.x <= 0.0) {
    return vec4(0.0);
  }
  vec2 away;
  if (uLamp.w > 0.5) {
    away = (p - uLamp.xy) * (STEAM_LIFT / uLamp.z);
  } else {
    float azimuth = radians(STEAM_LIGHTS.x);
    away = -vec2(cos(azimuth), -sin(azimuth)) * (STEAM_LIFT / tan(radians(STEAM_LIGHT_ELEVATION)));
  }
  // Kept close: a shadow thrown far from thin steam read as a dirty patch
  // of its own rather than the steam's.
  float reach = length(away);
  if (reach > 90.0) {
    away *= 90.0 / reach;
  }
  // Seen through the leaning camera, ground runs shorter up the screen and
  // what stands over it shows higher than where it stands.
  vec2 offset = away * vec2(1.0, TILT_TRIG.x) + vec2(0.0, STEAM_LIFT * TILT_TRIG.y);
  vec2 from = p - offset;
  // Thin steam lets most of the light through: a faint, wide shadow.
  float soft = 16.0;
  float cover = 0.2 * steamTexel(from).a
    + 0.1 * (steamTexel(from + vec2(soft, 0.0)).a + steamTexel(from - vec2(soft, 0.0)).a
      + steamTexel(from + vec2(0.0, soft)).a + steamTexel(from - vec2(0.0, soft)).a)
    + 0.1 * (steamTexel(from + vec2(soft, soft) * 0.7).a + steamTexel(from - vec2(soft, soft) * 0.7).a
      + steamTexel(from + vec2(soft, -soft) * 0.7).a + steamTexel(from - vec2(soft, -soft) * 0.7).a);
  float shade = cover * 0.13 * uSteam.x;
  return vec4(vec3(0.04, 0.05, 0.07) * shade, shade);
}

// One flash, `t` seconds old, `size` 0 to 1. Light on a white desk cannot
// be brighter than the desk, so it reads by colour and by covering what is
// under it: a white core inside a vivid cyan corona, with a short soft
// horizontal bloom. The film's flashes are just that: shock-wave rings and
// diffraction stars read as later CGI, and a long streak as a lens effect.
vec4 burst(vec2 d, float t, float size) {
  // Brief: a flash that lingers reads as a cloud.
  float span = 0.06 + 0.2 * size;
  if (t < 0.0 || t > span) {
    return vec4(0.0);
  }
  float life = smoothstep(0.0, 0.01, t) * (1.0 - smoothstep(0.02 + 0.04 * size, span, t));
  vec2 radii = vec2(165.0, 92.0) * size * (1.0 + 0.6 * t);
  float e = length(d / radii);
  // Ragged, not a drawn ellipse: the corona's reach wavers around it.
  float angle = atan(d.y, d.x);
  float ragged = 1.0 + 0.18 * (noise(vec2(angle * 2.5, t * 30.0 + size * 7.0)) - 0.5);
  float corona = exp(-pow(e / (1.25 * ragged), 2.0)) * life * 0.85;
  vec3 coronaColor = mix(vec3(0.44, 0.91, 1.0), vec3(0.0, 0.72, 1.0), exp(-e));
  vec4 color = vec4(coronaColor * corona, corona);
  float bloom = exp(-pow(d.y / (3.0 + 4.0 * size), 2.0)) * exp(-pow(d.x / (40.0 + 140.0 * size), 2.0)) * life * 0.8 * smoothstep(0.2, 0.35, size);
  color = over(vec4(vec3(0.75, 0.95, 1.0) * bloom, bloom), color);
  float core = (1.0 - smoothstep(0.55, 1.0, e / ragged)) * life;
  return over(vec4(vec3(core), core), color);
}

// Arriving: three flashes at the spot it comes through, each bigger.
vec4 flashes(vec2 p) {
  float t = uArrival.x;
  if (t < 0.0 || t > uFlashes.z + 0.4) {
    return vec4(0.0);
  }
  vec2 d = p - vec2(uArrival.y, uSize.y * 0.56);
  vec4 color = burst(d, t - uFlashes.x, 0.35);
  color = over(burst(d, t - uFlashes.y, 0.6), color);
  return over(burst(d, t - uFlashes.z, 1.0), color);
}

// How wide the light ahead is, local px, grown 0 to 1: it is about 2.7
// times as tall.
float plasmaGirth(float g) {
  return mix(11.0, 34.0, pow(clamp(g, 0.0, 1.0), 0.8));
}

// How fast the car moves, 0 standing to 1 at the slice: its streak's reach.
float carSpeed() {
  return clamp(uBlur.x / 24.0, 0.0, 1.0);
}

// The light the charge gathers ahead of the nose, after the film: high-energy
// plasma, not a flame: an overexposed white core with a crisp edge in a body
// of bright cells boiling fast, thin filaments writhing round it, sparks
// popping at its rim and a tight saturated halo; it is never still. Standing, it churns and bulges; as the car gathers speed it
// is pressed flat in front and drawn back into a wake that runs onto the
// bumper, so the light wraps the nose rather than floating apart from it.
// A soft violet haze with lobes licking back read as a gas burner. A round core
// read as a sticker, metaballs and spikes as a starburst, a gap before the
// bumper as a wall between the car and its light, and streamers sweeping
// back along the car's sides as whiskers.
// `d` is px from its middle, +x towards the car.
vec4 plasmaFront(vec2 d, float strength, float squeeze) {
  float t = uTime;
  float g = clamp(uOrb, 0.0, 1.25);
  float v = carSpeed();
  float surge = uImpact.z;
  float shown = smoothstep(0.0, 0.05, strength);
  // A tall oval, taller than the car once grown; squeezed, it narrows and
  // stretches up and down into the slice.
  float pulse = uImpact.w;
  float girth = plasmaGirth(g) * (1.0 + 0.12 * surge) * (0.94 + 0.06 * pulse);
  float radius = girth * (1.0 - 0.75 * squeeze);
  float tall = girth * mix(2.8, 2.6, v) * (1.0 + 0.45 * squeeze);
  // How far back the bumper is.
  float nose = uCar.x - uRift.x;
  float reach = max(tall * 2.5, nose + 60.0);
  if (length(d) > reach + 40.0) {
    return vec4(0.0);
  }
  vec2 q = d - uImpact.xy * 0.5;
  // A slow warp that streams back towards the car as it speeds up; kept
  // small, since a large one licked back like a flame.
  float flow = t * mix(1.6, 10.0, v);
  vec2 w = q / vec2(radius, tall * 0.45);
  vec2 warp = vec2(
    fbm3(w * vec2(0.9, 1.0) + vec2(-flow, 0.0)),
    fbm3(w * vec2(0.9, 1.0) + vec2(-flow + 3.1, 5.2))
  ) - 0.5;
  vec2 wq = q + warp * vec2(radius, tall * 0.45) * mix(0.45, 0.35, v);
  // Pressed a little flatter ahead, drawn out behind.
  float lead = radius * mix(0.95, 0.7, v);
  float wake = radius * mix(1.2, 2.0, v);
  vec2 s = vec2(wq.x / (wq.x < 0.0 ? lead : wake), wq.y / tall);
  // A tight outline that crackles rather than licking back: lobes that
  // flowed back with the motion read as a gas burner's flame.
  vec2 dir = s / max(length(s), 0.001);
  float lobes = fbm3(dir * 2.6 + vec2(t * 6.0, -t * 4.7));
  float r = length(s) * (1.0 + 0.18 * (0.5 - lobes));
  // The pulse stirs its glow; the heart stays white-hot through it.
  float flicker = pulse;
  float grown = smoothstep(0.02, 0.2, g);
  vec4 color = vec4(0.0);
  // The light it throws back onto the bumper: a soft band filling the gap
  // to the nose, fading a little past it.
  float bridge = exp(-pow(q.y / (tall * 0.55), 2.0)) * smoothstep(-radius * 0.3, radius * 0.6, q.x) * (1.0 - smoothstep(nose - 6.0, nose + 26.0, q.x)) * 0.45 * smoothstep(0.1, 0.5, g);
  color = over(vec4(vec3(0.15, 0.55, 1.0) * bridge, bridge), color);
  // A tight saturated halo: a wide violet haze read as a flame's fog.
  float halo = min(1.0, exp(-1.3 * r * r) * 0.62 * flicker);
  color = over(vec4(vec3(0.07, 0.36, 1.0) * halo, halo), color);
  // The plasma itself: a dense body of bright cells boiling fast in every
  // direction, never smooth.
  float cells = fbm3(s * vec2(3.2, 2.4) + vec2(t * 7.0, -t * 5.3));
  float body = min(1.0, exp(-2.6 * r * r) * clamp(0.55 + 0.75 * cells, 0.0, 1.0) * mix(1.0, flicker, 0.5));
  color = over(vec4(vec3(0.45, 0.86, 1.0) * body, body), color);
  // Filaments: thin white strands writhing round the core and out to its
  // rim, twisting as they go, as in a plasma ball.
  float turn = t * 2.6 + r * 2.4;
  vec2 swirl = mat2(cos(turn), -sin(turn), sin(turn), cos(turn)) * vec2(s.x, s.y * 0.6);
  float ridge = 1.0 - abs(2.0 * fbm3(swirl * 2.3 + vec2(0.0, t * 3.5)) - 1.0);
  float strands = pow(ridge, 12.0) * smoothstep(1.45, 0.75, r) * smoothstep(0.2, 0.5, r) * grown;
  color = over(vec4(vec3(0.85, 0.96, 1.0) * strands, strands), color);
  // Sparks popping at its rim, each a few frames.
  vec2 cell = floor(d / 6.0);
  float spark = step(0.982, hash(cell + floor(t * 24.0) * 1.37));
  vec2 inCell = fract(d / 6.0) - 0.5;
  float sparkle = spark * exp(-dot(inCell, inCell) * 18.0) * smoothstep(1.7, 0.9, r) * smoothstep(0.5, 0.8, r) * grown;
  color = over(vec4(vec3(sparkle), sparkle), color);
  // An overexposed white core with a crisp edge, churning.
  vec2 h = vec2(s.x + 0.1, s.y * 1.1);
  float churn = fbm3(s * 2.8 + vec2(t * 5.0, t * 3.1));
  float hot = length(h) + 0.3 * (churn - 0.5);
  float glowing = (1.0 - smoothstep(0.38, 0.8, hot)) * 0.9 * grown;
  color = over(vec4(vec3(0.7, 0.94, 1.0) * glowing, glowing), color);
  float heart = (1.0 - smoothstep(0.34, 0.5, hot)) * grown;
  color = over(vec4(vec3(0.98, 0.99, 1.0) * heart, heart), color);
  return color * shown * (1.0 - 0.65 * squeeze) * (1.0 - smoothstep(reach, reach + 40.0, length(d)));
}

// The time slice, `open` 0 to 1: a tear across the car's path, far taller
// than the car, that the light ahead of it is squeezed into: it starts as
// tall as the light and grows from inside it. A line drawn from nothing
// read as stuck on. A white-hot
// lens widest at the car's middle, its edge shivering, inside a cyan sheath
// and a cobalt halo, running on past its ends as fading hairlines; bright
// knots race along it. A slit as tall as the car, with a box for a glow,
// read as a cut-out.
vec4 timeSlice(vec2 d, float open) {
  float t = uTime;
  float rip = smoothstep(0.0, 1.0, open);
  float half_ = mix(plasmaGirth(uOrb) * 2.7, uSize.y * 1.25, rip);
  float x = d.x - tearLine(d.y);
  float yn = d.y / half_;
  float lens = sqrt(max(0.0, 1.0 - min(yn * yn, 1.0)));
  float past = max(abs(d.y) - half_, 0.0);
  float hair = exp(-past / 12.0) * (1.0 - smoothstep(0.0, 36.0, past));
  float knots = 0.65 + 0.55 * noise(vec2(d.y * 0.07 - t * 30.0 * sign(d.y), 3.0)) * noise(vec2(d.y * 0.2, t * 60.0));
  float shiver = 0.88 + 0.12 * noise(vec2(d.y * 0.1, t * 45.0));
  float width = (0.8 + 8.5 * rip * pow(lens, 0.8)) * shiver;
  vec4 color = vec4(0.0);
  // The light it pours out churns: plasma boiling off both faces of the
  // tear, streaming along it, never a smooth gradient.
  float boil = fbm3(vec2(x * 0.05 - sign(x) * t * 2.5, d.y * 0.028 - t * 3.0)) ;
  vec2 hq = vec2(x / (20.0 + 44.0 * rip * lens + 8.0), d.y / (half_ * 1.05 + 16.0));
  float halo = min(1.0, exp(-1.3 * dot(hq, hq)) * open * (0.45 + 0.6 * boil) * uImpact.w);
  vec3 haloTint = mix(vec3(0.08, 0.4, 1.0), vec3(0.45, 0.24, 1.0), smoothstep(0.3, 0.75, boil + 0.3 * abs(yn)));
  color = over(vec4(haloTint * halo, halo), color);
  float sheath = min(1.0, exp(-abs(x) / (3.5 + 11.0 * rip * lens)) * (lens + hair) * open * 0.85 * knots * (0.7 + 0.5 * boil) * uImpact.w);
  color = over(vec4(vec3(0.5, 0.9, 1.0) * sheath, sheath), color);
  float core = (1.0 - smoothstep(width * 0.45, width + 0.6, abs(x))) * max(lens, hair * 0.8) * min(1.0, open * 1.6) * min(1.0, knots + 0.2);
  return over(vec4(vec3(core), core), color);
}

// The light ahead of the departing car, which stops where it leaves from
// and rips open into the time slice, or the slice the returning car comes
// out of; ribbons of plasma whip back over the car from it, and it snaps
// shut in one flash. Drawn over everything, and faded out well inside the
// canvas, so no glow ends on its edge.
vec4 rift(vec2 p) {
  vec4 color = vec4(0.0);
  vec2 c = vec2(uRift.x, uSize.y * ORB_Y);
  vec2 d = p - c;
  float window = (1.0 - smoothstep(150.0, 195.0, abs(d.y))) * (1.0 - smoothstep(380.0, 460.0, abs(d.x)));
  if (window <= 0.0) {
    return vec4(0.0);
  }
  float flicker = 0.88 + 0.12 * noise(vec2(uTime * 40.0, 1.3));
  float open = uRift.y * flicker;
  float orb = uOrb;
  // The light is squeezed into the slice as it opens.
  float squeeze = smoothstep(0.0, 1.0, uRift.y);
  if (open > 0.0 || orb > 0.0) {
    // Ribbons over the car (behind the light it drives into, ahead of the
    // one it bursts out of): thin white cores in cyan or violet, spreading
    // apart and fading with distance, and writhing, with pulses running
    // along them into the light; never past the car's far end, where loose
    // ones read as strings.
    float side = uArrival.x >= 0.0 ? -1.0 : 1.0;
    float dx = d.x * side;
    float far = side > 0.0 ? uCar.x + uSize.x - uRift.x : uRift.x - uCar.x;
    if (open > 0.02 && uCar.w > 0.5 && dx > -2.0 && dx < far) {
      for (int k = 0; k < 5; k++) {
        float fk = float(k);
        float lane = fk - 2.0;
        float reach = 50.0 + 35.0 * hash(vec2(fk, 3.1));
        float spread = mix(0.6, 1.0, open);
        float y = (lane * 9.0 * open + lane * 18.0 * (1.0 - exp(-dx / 45.0))) * spread + (noise(vec2(dx * 0.045 + fk * 5.0, uTime * 14.0)) - 0.5) * 14.0 * smoothstep(0.0, 60.0, dx);
        float off = abs(d.y - y);
        float pulse = 0.65 + 0.35 * sin(dx * 0.16 + uTime * 46.0 + fk * 1.7);
        float fade = exp(-dx / reach) * smoothstep(-2.0, 4.0, dx) * (1.0 - smoothstep(far - 30.0, far, dx)) * open * pulse;
        float halo = exp(-pow(off / 3.2, 2.0)) * fade * 0.7;
        float core = exp(-pow(off / 0.8, 2.0)) * fade;
        vec3 tint = k == 1 || k == 4 ? vec3(0.55, 0.45, 1.0) : vec3(0.1, 0.72, 1.0);
        color = over(vec4(tint * halo, halo), color);
        color = over(vec4(vec3(core), core), color);
      }
    }
    // The light ahead fades as the slice rips open out of it.
    if (orb > 0.0) {
      color = over(plasmaFront(d, orb, squeeze), color);
    }
    if (open > 0.0) {
      color = over(timeSlice(d, open), color);
    }
  }
  // It snaps shut: the tear pinches in from its ends to the middle
  // and goes out in one small flash. A big round flash in its
  // place read as a lens flare pasted over it.
  if (uRift.z >= 0.0) {
    float closing = 1.0 - smoothstep(0.0, 0.11, uRift.z);
    if (closing > 0.0) {
      color = over(timeSlice(d, closing), color);
    }
    color = over(burst(d, uRift.z - 0.07, 0.16), color);
  }
  return color * window;
}

// The car as the shutter saw it while it moved: its photo along the
// stretch of desk it covered, weighted to where it is now, so a fast car
// keeps a sharp front and streaks behind instead of smearing evenly into a
// smudge. Taps are jittered per pixel to hide their steps.
vec4 smearedCar(vec2 p) {
  float reach = uBlur.x;
  vec2 local = p - vec2(uCar.x - tearPull(p), 0.0);
  if (local.y < -1.0 || local.y > uSize.y + 1.0 || local.x < min(0.0, reach) - 1.0 || local.x > uSize.x + max(0.0, reach) + 1.0) {
    return vec4(0.0);
  }
  float jitter = hash(p * 1.37);
  vec4 sum = vec4(0.0);
  float total = 0.0;
  for (int i = 0; i < 12; i++) {
    float share = (float(i) + jitter) / 12.0;
    float weight = exp(-3.0 * share);
    sum += carTexel((local - vec2(reach * share, 0.0)) / uSize, 0.0) * weight;
    total += weight;
  }
  return sum / total;
}

// The streaked car's shadow on the desk, taking over from the DOM car's
// as it gives way: its silhouette blurred from a coarse level, a little
// below it, smeared as it is.
float smearedShadow(vec2 p) {
  vec2 local = p - vec2(uCar.x, 3.0);
  float reach = uBlur.x;
  float sum = 0.0;
  for (int i = 0; i < 4; i++) {
    float s = reach * (float(i) + 0.5) / 4.0;
    sum += carTexel((local - vec2(s, 0.0)) / uSize, 4.0).a;
  }
  return sum / 4.0;
}

void main() {
  vec2 pixel = vec2(gl_FragCoord.x, uResolution.y - gl_FragCoord.y);
  vec2 p = pixel / uScale - uOrigin;
  vec4 color = vec4(0.0);
  vec2 newest = p - uTrailShift.xy;
  vec2 older = p - uTrailShift.zw;
  if (uTrails.y > 0.0) {
    color = over(trail(newest, uRows.x, 0.0, uTrails.x, uTrails.y), color);
  }
  if (uTrails.w > 0.0) {
    color = over(trail(older, uRows.x, 0.0, uTrails.z, uTrails.w), color);
  }
  if (uTrails.y > 0.0) {
    color = over(trail(newest, uRows.y, 3.7, uTrails.x, uTrails.y), color);
  }
  if (uTrails.w > 0.0) {
    color = over(trail(older, uRows.y, 3.7, uTrails.z, uTrails.w), color);
  }
  color = over(skid(p), color);
  bool simulated = uSteamGrid.w > 0.5;
  if (simulated) {
    color = over(steamShadow(p), color);
  } else {
    color = over(vapourSkirt(p), color);
  }
  // The car standing on the desk hides the trails and the vapour under it;
  // at speed the shader draws it, streaked.
  float visible = shown(p);
  if (uCar.w > 0.5) {
    float sharp = carTexel((p - vec2(uCar.x - tearPull(p), 0.0)) / uSize, 0.0).a * visible;
    vec4 smear = vec4(0.0);
    if (uBlur.y > 0.0) {
      float shadow = smearedShadow(p) * 0.28 * uBlur.y * visible;
      color = over(vec4(vec3(0.05, 0.05, 0.06) * shadow, shadow), color);
      smear = smearedCar(p) * uBlur.y * visible;
    }
    color *= 1.0 - max(sharp * (1.0 - uBlur.y), smear.a);
    color = over(smear, color);
    // Where it meets the slice it is consumed rather than cut off: it
    // burns white-hot along the tear, flushes cyan behind that, and is drawn
    // out in streaks of light into it. A glowing ruled edge read as a car
    // sliced by a box.
    if (uRift.w > 0.0) {
      float at = abs(p.x - uRift.x - tearLine(p.y - uSize.y * ORB_Y));
      float body = max(sharp, smear.a) * uRift.w;
      float flush = body * exp(-at / 34.0) * 0.5;
      color = over(vec4(vec3(0.3, 0.8, 1.0) * flush, flush), color);
      float streaks = smoothstep(0.45, 0.85, fbm3(vec2(at * 0.025 - uTime * 6.0, p.y * 0.5)));
      float drawn = body * streaks * exp(-at / 22.0) * 0.9;
      color = over(vec4(vec3(0.75, 0.95, 1.0) * drawn, drawn), color);
      float burn = body * exp(-at / 6.0);
      color = over(vec4(vec3(burn), burn), color);
    }
  }
  color = over(ice(p), color);
  color = over(vapourWisps(p), color);
  color = over(simulated ? sheetSteam(p) : ventSteam(p), color);
  // Once the car is through it stands crisp over the flash's glow: washed
  // over, it read as a milky puddle.
  vec4 flash = flashes(p);
  if (uCar.w > 0.5 && uArrival.x >= 0.0) {
    flash *= 1.0 - 0.9 * carTexel((p - vec2(uCar.x, 0.0)) / uSize, 0.0).a * visible;
  }
  color = over(flash, color);
  color = over(rift(p), color);
  outColor = color;
}
