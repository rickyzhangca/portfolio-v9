import { describe, expect, it } from "vitest";
import {
  ARRIVAL,
  CAR_LIGHT,
  CAR_LIGHT_COUNT,
  CAR_LIGHT_TILES,
  CHARGE_ORB,
  CHARGE_SECONDS,
  DEPARTURE,
  DISCHARGE_SECONDS,
  DRIVE_END_MS,
  findEdgePoints,
  getArcRate,
  getBumperLevel,
  getMotePoint,
  getMoteRate,
  getArrivalLift,
  getArrivalOffset,
  getChargeOrb,
  getCutBlend,
  getDriveDistance,
  getDriveOffset,
  getDriveTime,
  getFirePass,
  getFlameBlue,
  getFlameIntensity,
  getFrost,
  getLaunchLift,
  getLightBlend,
  getOrb,
  getReach,
  getScorch,
  getSliceTimes,
  getSmoke,
  getSteam,
  type LightShare,
  RETURN_MS,
  STEAM_MS,
  STEAM_SHEET,
  getTrailsOutMs,
  getVelocity,
  isCoilColor,
  MOTES,
  makeArc,
  pickArcEnds,
  stepCharge,
} from "./flux-charge";

const sequence = (values: number[]) => {
  let index = 0;
  return () => {
    const value = values[index % values.length] ?? 0;
    index += 1;
    return value;
  };
};

describe("flux charge", () => {
  it("fills over the charge time and empties faster", () => {
    expect(stepCharge(0, true, CHARGE_SECONDS / 2)).toBeCloseTo(0.5);
    expect(stepCharge(0.9, true, 1)).toBe(1);
    expect(stepCharge(1, false, DISCHARGE_SECONDS / 2)).toBeCloseTo(0.5);
    expect(stepCharge(0.1, false, 1)).toBe(0);
  });

  it("starts arcing only once a little charged, then builds", () => {
    expect(getArcRate(0)).toBe(0);
    expect(getArcRate(0.05)).toBe(0);
    expect(getArcRate(0.5)).toBeLessThan(getArcRate(1));
    expect(getArcRate(1)).toBe(60);
  });

  it("sheds motes only once the ball ahead has formed", () => {
    expect(getMoteRate(0, false)).toBe(0);
    expect(getMoteRate(0.2, false)).toBeLessThan(getMoteRate(0.4, false));
    expect(getMoteRate(0.4, false)).toBe(MOTES.charge);
    expect(getMoteRate(0.5, true)).toBe(MOTES.drive);
  });

  it("flies motes from a conduit into the ball, bowing out and speeding up", () => {
    const from = { x: 200, y: 20 };
    const to = { x: -40, y: 60 };
    expect(getMotePoint(from, to, -12, 0)).toEqual(from);
    const end = getMotePoint(from, to, -12, 1);
    expect(end.x).toBeCloseTo(to.x);
    expect(end.y).toBeCloseTo(to.y);
    // Bowed out past the body's top edge early in the flight.
    expect(getMotePoint(from, to, -12, 0.4).y).toBeLessThan(from.y);
    // Covers more ground in its second half than its first.
    const half = getMotePoint(from, to, -12, 0.5);
    expect(from.x - half.x).toBeLessThan(half.x - end.x);
  });

  it("lights the bumper early in the charge and fully as it drives", () => {
    expect(getBumperLevel(0, false)).toBe(0);
    expect(getBumperLevel(0.4, false)).toBeGreaterThan(0.3);
    expect(getBumperLevel(1, false)).toBe(1);
    expect(getBumperLevel(0, true)).toBe(1);
  });

  it("reaches from the nose to the whole car as it charges", () => {
    expect(getReach(0)).toBeCloseTo(0.22);
    expect(getReach(0.5)).toBeCloseTo(0.72);
    expect(getReach(1)).toBe(1);
  });

  it("tells the cyan conduits from the steel and the paint", () => {
    expect(isCoilColor(120, 170, 190, 255)).toBe(true);
    expect(isCoilColor(160, 160, 165, 255)).toBe(false);
    expect(isCoilColor(200, 40, 40, 255)).toBe(false);
    expect(isCoilColor(120, 170, 190, 100)).toBe(false);
  });

  it("finds the outline of an opaque block, not its inside", () => {
    // A 6x6 image with an opaque 4x4 block at (1, 1).
    const alpha = Array.from({ length: 36 }, (_, index) => {
      const x = index % 6;
      const y = Math.floor(index / 6);
      return x >= 1 && x <= 4 && y >= 1 && y <= 4 ? 255 : 0;
    });
    const points = findEdgePoints(alpha, 6, 6, 1);
    expect(points).toHaveLength(12);
    expect(points).not.toContainEqual({ x: 2, y: 2 });
    expect(points).toContainEqual({ x: 1, y: 1 });
  });

  it("picks arc ends within the length range, or none", () => {
    const edges = [
      { x: 0, y: 0 },
      { x: 30, y: 0 },
      { x: 500, y: 0 },
    ];
    const ends = pickArcEnds(edges, sequence([0, 0.5]), 10, 60);
    expect(ends).toEqual([
      { x: 0, y: 0 },
      { x: 30, y: 0 },
    ]);
    expect(pickArcEnds(edges, sequence([0, 0.9]), 10, 60)).toBeUndefined();
    expect(pickArcEnds([{ x: 0, y: 0 }], Math.random, 0, 10)).toBeUndefined();
  });

  it("bends a bolt between its ends and keeps them fixed", () => {
    const from = { x: 0, y: 0 };
    const to = { x: 64, y: 0 };
    const straight = makeArc(from, to, () => 0.5, 0.28, 3);
    expect(straight).toHaveLength(9);
    for (const point of straight) {
      expect(point.y).toBeCloseTo(0);
    }
    const bent = makeArc(from, to, () => 1, 0.28, 3);
    expect(bent[0]).toEqual(from);
    expect(bent.at(-1)).toEqual(to);
    // The first bend moves the middle sideways by roughness × length.
    expect(bent[4]?.y).toBeCloseTo(64 * 0.28);
  });

  it("races off faster and faster until it has covered the distance", () => {
    const { driveFromMs, driveMs, drivePower } = DEPARTURE;
    expect(getDriveOffset(0, 1000)).toBeCloseTo(0);
    expect(getDriveOffset(driveFromMs, 1000)).toBeCloseTo(0);
    expect(getDriveOffset(driveFromMs + driveMs / 2, 1000)).toBeCloseTo(
      -1000 * 0.5 ** drivePower
    );
    expect(getDriveOffset(DRIVE_END_MS, 1000)).toBe(-1000);
    expect(getDriveOffset(1e5, 1000)).toBe(-1000);
  });

  it("reaches each spot when the drive does", () => {
    const distance = 400;
    expect(getDriveTime(0, distance)).toBe(DEPARTURE.driveFromMs);
    expect(getDriveTime(distance, distance)).toBe(DRIVE_END_MS);
    const at = getDriveTime(250, distance);
    expect(getDriveOffset(at, distance)).toBeCloseTo(-250);
  });

  it("opens the slice before the nose arrives and shuts it behind the tail", () => {
    const width = 248;
    const rear = 196;
    const { goneAt, igniteAt, noseAt, opensAt } = getSliceTimes(width, rear);
    expect(opensAt).toBeLessThan(noseAt);
    expect(noseAt).toBeLessThan(igniteAt);
    expect(igniteAt).toBeLessThan(goneAt);
    const distance = getDriveDistance(width);
    expect(getDriveOffset(noseAt, distance)).toBeCloseTo(-DEPARTURE.slicePx);
    // The rear tyres are on the slice as the fire erupts.
    expect(getDriveOffset(igniteAt, distance) + rear).toBeCloseTo(
      -DEPARTURE.slicePx
    );
    // The tail is through as it shuts.
    expect(getDriveOffset(goneAt, distance) + width).toBeCloseTo(
      -DEPARTURE.slicePx
    );
  });

  it("races the fire on ahead of the slice at its speed", () => {
    expect(getFirePass(0, 600)).toBe(600);
    expect(getFirePass(DEPARTURE.fireSpeed, 600)).toBe(1600);
    expect(getFirePass(-20, 600)).toBe(600);
    expect(getTrailsOutMs(1800)).toBeGreaterThan(getTrailsOutMs(0) + 999);
  });

  it("squats on launch, then settles a little", () => {
    const { driveFromMs, launchLiftPx } = DEPARTURE;
    expect(getLaunchLift(0)).toBe(0);
    expect(getLaunchLift(driveFromMs + 110)).toBeCloseTo(launchLiftPx);
    expect(getLaunchLift(DRIVE_END_MS)).toBeLessThan(launchLiftPx);
    expect(getLaunchLift(DRIVE_END_MS)).toBeGreaterThan(
      launchLiftPx / 2 - 0.01
    );
  });

  it("dives braking in, then springs back and settles", () => {
    const { appearMs, diveLiftPx, reboundMs, slideMs } = ARRIVAL;
    expect(getArrivalLift(appearMs - 1)).toBe(0);
    expect(getArrivalLift(appearMs + slideMs / 2)).toBeCloseTo(-diveLiftPx);
    expect(
      getArrivalLift(appearMs + slideMs + reboundMs * 0.5)
    ).toBeGreaterThan(0);
    expect(getArrivalLift(appearMs + slideMs + reboundMs)).toBeCloseTo(0);
  });

  it("ignites a passed spot, lets it die down, then fades smoke and scorch", () => {
    const { flameFadeMs, flameHoldMs, igniteMs, scorchFadeMs, smokeFadeMs } =
      DEPARTURE;
    const out = flameHoldMs + flameFadeMs;
    expect(getFlameIntensity(-1)).toBe(0);
    expect(getFlameIntensity(igniteMs / 2)).toBeCloseTo(0.5);
    expect(getFlameIntensity(flameHoldMs)).toBe(1);
    expect(getFlameIntensity(flameHoldMs + flameFadeMs / 2)).toBeCloseTo(0.5);
    expect(getFlameIntensity(out)).toBe(0);
    expect(getSmoke(-1)).toBe(0);
    expect(getSmoke(out)).toBe(1);
    expect(getSmoke(out + smokeFadeMs / 2)).toBeCloseTo(0.5);
    expect(getSmoke(out + smokeFadeMs)).toBe(0);
    expect(getScorch(-1)).toBe(0);
    expect(getScorch(out)).toBe(1);
    expect(getScorch(out + scorchFadeMs / 2)).toBeCloseTo(0.5);
    expect(getScorch(1e6)).toBe(0);
  });

  it("brakes the arriving car to a stop on its spot, then rocks back", () => {
    const { appearMs, reboundMs, reboundPx, slideMs, slidePx } = ARRIVAL;
    expect(getArrivalOffset(0)).toBe(slidePx);
    expect(getArrivalOffset(appearMs)).toBe(slidePx);
    expect(getArrivalOffset(appearMs + slideMs / 2)).toBeCloseTo(slidePx / 4);
    expect(getArrivalOffset(appearMs + slideMs)).toBeCloseTo(0);
    // Past its spot on its springs, never by more than the rebound.
    const rocked = getArrivalOffset(appearMs + slideMs + reboundMs / 3);
    expect(rocked).toBeLessThan(0);
    expect(rocked).toBeGreaterThan(-reboundPx);
    expect(getArrivalOffset(appearMs + slideMs + reboundMs)).toBeCloseTo(0);
  });

  it("measures how fast the car moves", () => {
    const travel = 1000;
    const { driveFromMs, driveMs, drivePower } = DEPARTURE;
    const drive = (at: number) => getDriveOffset(at, travel);
    expect(getVelocity(drive, 0)).toBe(0);
    // Fastest as it leaves the screen: distance over time, times the power.
    expect(getVelocity(drive, driveFromMs + driveMs - 1)).toBeCloseTo(
      (-travel * drivePower) / driveMs,
      1
    );
    expect(getVelocity(getArrivalOffset, ARRIVAL.appearMs + 1)).toBeLessThan(0);
  });

  it("lands iced over, then melts", () => {
    const { appearMs, thawFromMs, thawMs } = ARRIVAL;
    expect(getFrost(appearMs - 1)).toBe(0);
    expect(getFrost(appearMs)).toBe(1);
    expect(getFrost(thawFromMs)).toBe(1);
    expect(getFrost(thawFromMs + thawMs / 2)).toBeCloseTo(0.5);
    expect(getFrost(thawFromMs + thawMs)).toBe(0);
  });

  it("gathers a ball of light ahead of the nose that stops on the slice", () => {
    const width = 248;
    const rear = 196;
    const { opensAt } = getSliceTimes(width, rear);
    const distance = getDriveDistance(width);
    expect(getOrb(0, width, rear).size).toBe(0);
    const early = getOrb(DEPARTURE.driveFromMs + 100, width, rear);
    const later = getOrb(opensAt - 100, width, rear);
    expect(later.size).toBeGreaterThan(early.size);
    // Ahead of the nose, by its lead once grown.
    const nose = getDriveOffset(opensAt - 100, distance);
    expect(later.x).toBeCloseTo(nose - DEPARTURE.orbLeadPx);
    expect(getOrb(opensAt, width, rear)).toEqual({
      size: 1,
      x: expect.closeTo(-DEPARTURE.slicePx) as number,
    });
    expect(getOrb(DRIVE_END_MS, width, rear).x).toBe(-DEPARTURE.slicePx);
  });

  it("gathers a ball of light ahead of the parked nose as it charges", () => {
    expect(getChargeOrb(CHARGE_ORB.from)).toEqual({ lead: 0, size: 0 });
    const half = getChargeOrb(0.7);
    expect(half.size).toBeGreaterThan(0);
    expect(half.size).toBeLessThan(CHARGE_ORB.size);
    expect(getChargeOrb(1)).toEqual({
      lead: DEPARTURE.orbLeadPx * CHARGE_ORB.lead,
      size: CHARGE_ORB.size,
    });
  });

  it("carries the charged ball of light on as the car sets off", () => {
    const width = 248;
    const rear = 190;
    const charged = getChargeOrb(1);
    // No jump as it sets off: it starts where the charge left it.
    expect(getOrb(0, width, rear, charged)).toEqual({
      size: charged.size,
      x: -charged.lead,
    });
    const start = getOrb(DEPARTURE.driveFromMs, width, rear, charged);
    expect(start.size).toBe(charged.size);
    expect(start.x).toBeCloseTo(-charged.lead);
    const { opensAt } = getSliceTimes(width, rear);
    expect(getOrb(opensAt, width, rear, charged).size).toBe(1);
  });

  it("turns the flames blue as they die down", () => {
    const { flameFadeMs, flameHoldMs } = DEPARTURE;
    expect(getFlameBlue(flameHoldMs)).toBe(0);
    expect(getFlameBlue(flameHoldMs + flameFadeMs * 0.225)).toBeCloseTo(0.5);
    expect(getFlameBlue(flameHoldMs + flameFadeMs * 0.45)).toBe(1);
  });

  it("plays the steam from as the car stops, easing out at its end", () => {
    const { steamFromMs } = ARRIVAL;
    expect(getSteam(steamFromMs - 1)).toBe(0);
    expect(getSteam(steamFromMs + 1000)).toBe(1);
    expect(
      getSteam(steamFromMs + STEAM_MS - STEAM_SHEET.fadeMs / 2)
    ).toBeCloseTo(0.5);
    expect(getSteam(steamFromMs + STEAM_MS)).toBe(0);
    expect(steamFromMs + STEAM_MS).toBeLessThanOrEqual(RETURN_MS);
  });
});

describe("car light maps", () => {
  it("blends the two maps either side of a light and holds the ends", () => {
    expect(getLightBlend([0, 1, 2], -1)).toEqual([[0, 1]]);
    expect(getLightBlend([0, 1, 2], 3)).toEqual([[2, 1]]);
    const [[low, lowWeight], [high, highWeight]] = getLightBlend(
      [0, 1, 2],
      1.25
    ) as [LightShare, LightShare];
    expect([low, high]).toEqual([1, 2]);
    expect(lowWeight).toBeCloseTo(0.75);
    expect(highWeight).toBeCloseTo(0.25);
  });

  it("only uses slice maps cut where the screen already hides the car", () => {
    const stops = CAR_LIGHT.sliceAt;
    for (const cut of [0, 0.1, 0.21, 0.5, 0.95]) {
      for (const [index] of getCutBlend(stops, cut, true)) {
        expect(stops[index]).toBeLessThanOrEqual(cut);
      }
    }
    expect(getCutBlend(stops, 0.5, true)).toEqual([[2, 1]]);
  });

  it("only uses exit maps cut where the car has not come out yet", () => {
    const stops = CAR_LIGHT.exitAt;
    for (const cut of [0.05, 0.3, 0.79, 1]) {
      for (const [index] of getCutBlend(stops, cut, false)) {
        expect(stops[index]).toBeGreaterThanOrEqual(cut);
      }
    }
    expect(getCutBlend(stops, 1.2, false)).toEqual([]);
  });

  it("lays the tiles out in the bake's order", () => {
    expect(CAR_LIGHT_TILES.slice).toBe(4);
    expect(CAR_LIGHT_TILES.exit).toBe(9);
    expect(CAR_LIGHT_COUNT).toBe(16);
  });
});
