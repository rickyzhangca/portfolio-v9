import { describe, expect, it } from "vitest";
import { getStackFlightTransition } from "./animation";

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
    expect(back.y.stiffness).toBeGreaterThan(back.x.stiffness);
  });
});
