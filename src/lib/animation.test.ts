import { describe, expect, it } from "vitest";
import { getSpringCrossingTime, getStackFlightTransition } from "./animation";

describe("getStackFlightTransition", () => {
  it("sends the top card out first and brings it back last", () => {
    const out = [0, 1, 2].map((index) =>
      getStackFlightTransition(index, 3, "out")
    );
    const back = [0, 1, 2].map((index) =>
      getStackFlightTransition(index, 3, "in")
    );

    expect(out[0].x.delay).toBeLessThan(out[1].x.delay);
    expect(out[1].x.delay).toBeLessThan(out[2].x.delay);
    expect(back[2].y.delay).toBeLessThan(back[1].y.delay);
    expect(back[1].y.delay).toBeLessThan(back[0].y.delay);
  });

  it("caps the stagger for large folders", () => {
    const last = getStackFlightTransition(13, 14, "out");
    const first = getStackFlightTransition(0, 14, "out");

    expect(last.x.delay - first.x.delay).toBeLessThanOrEqual(0.2 + 1e-9);
  });

  it("fades returning cards only as they arrive", () => {
    const back = getStackFlightTransition(5, 6, "in");

    expect(back.opacity.delay).toBeGreaterThan(back.y.delay);
  });

  it("leads with the sideways move out and the rise back in", () => {
    const out = getStackFlightTransition(0, 1, "out");
    const back = getStackFlightTransition(0, 1, "in");

    expect(out.x.delay).toBeLessThan(out.y.delay);
    expect(out.x.stiffness).toBeGreaterThan(out.y.stiffness);
    expect(back.y.delay).toBeLessThan(back.x.delay);
  });

  it("crosses the folder's wall sideways before a card changes rows", () => {
    const out = getStackFlightTransition(0, 1, "out", {
      coverWidth: 240,
      from: { x: 20, y: 70 },
      to: { x: 620, y: 850 },
    });
    // The drop waits until the sideways spring has carried the card past the
    // cover, so the two moves never overlap on a diagonal.
    const clear = getSpringCrossingTime(out.x, (240 + 12 - 20) / 600);
    expect(out.y.delay - out.x.delay).toBeCloseTo(clear, 3);
    expect(out.y.delay - out.x.delay).toBeGreaterThan(0.04);
  });

  it("rises to the folder's row before sliding back in", () => {
    const back = getStackFlightTransition(0, 1, "in", {
      coverWidth: 240,
      from: { x: 620, y: 850 },
      to: { x: 20, y: 70 },
    });

    expect(back.x.delay - back.y.delay).toBeGreaterThan(0.04);
  });

  it("does not wait for a row it is already on", () => {
    const out = getStackFlightTransition(0, 1, "out", {
      coverWidth: 240,
      from: { x: 20, y: 70 },
      to: { x: 254, y: 80 },
    });

    expect(out.y.delay).toBe(out.x.delay);
  });

  it("grows a card only after it has left the folder, and shrinks it first going back", () => {
    const path = {
      coverWidth: 240,
      from: { x: 20, y: 70 },
      to: { x: 620, y: 850 },
    };
    const out = getStackFlightTransition(0, 1, "out", path);
    const back = getStackFlightTransition(0, 1, "in", {
      ...path,
      from: path.to,
      to: path.from,
    });

    expect(out.scale.delay).toBeGreaterThan(out.x.delay);
    expect(out.scale.delay).toBeCloseTo(out.y.delay, 6);
    expect(back.scale.delay + back.scale.duration).toBeLessThanOrEqual(
      back.x.delay + 1e-9
    );
  });
});
