import { describe, expect, it } from "vitest";
import {
  getSpringCrossingTime,
  getStackCaptionDelay,
  getStackFlightTransition,
} from "./animation";

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

  it("crosses the folder's right edge before dropping into a lower row", () => {
    const out = getStackFlightTransition(0, 1, "out", {
      coverWidth: 240,
      from: { x: 20, y: 70 },
      to: { x: 620, y: 850 },
    });
    const clear = getSpringCrossingTime(out.x, (240 - 20) / 600);
    expect(out.y.delay - out.x.delay).toBeCloseTo(clear, 3);
    expect(out.y.delay - out.x.delay).toBeGreaterThan(0.04);
  });

  it("rises to the folder's pocket before crossing the cover's right edge on close", () => {
    const col0 = getStackFlightTransition(3, 14, "in", {
      coverWidth: 240,
      from: { x: 258, y: 420 },
      to: { x: 32, y: 72 },
    });
    const col2 = getStackFlightTransition(5, 14, "in", {
      coverWidth: 240,
      from: { x: 994, y: 420 },
      to: { x: 32, y: 72 },
    });

    // Col 0 sits right next to the cover wall, so x waits longer for y to rise
    // than col 2, which uses its long horizontal travel while rising.
    expect(col0.x.delay - col0.y.delay).toBeGreaterThan(0.1);
    expect(col0.x.delay - col0.y.delay).toBeGreaterThan(
      col2.x.delay - col2.y.delay
    );
  });

  it("does not wait for a row it is already on or rising slightly into", () => {
    const sameRow = getStackFlightTransition(0, 1, "out", {
      coverWidth: 240,
      from: { x: 20, y: 70 },
      to: { x: 254, y: 80 },
    });
    const row0FromSlot2 = getStackFlightTransition(1, 3, "out", {
      coverWidth: 240,
      from: { x: 32, y: 72 },
      to: { x: 626, y: 12 },
    });

    expect(sameRow.y.delay).toBe(sameRow.x.delay);
    expect(row0FromSlot2.y.delay).toBe(row0FromSlot2.x.delay);
  });

  it("scales smoothly in motion on open and in lockstep with return on close", () => {
    const firstCard = {
      coverWidth: 240,
      from: { x: 24, y: 24 },
      to: { x: 258, y: 3 },
    };
    const out = getStackFlightTransition(0, 4, "out", firstCard);
    const back = getStackFlightTransition(0, 4, "in", {
      ...firstCard,
      from: firstCard.to,
      to: firstCard.from,
    });

    // Opening scale uses a spring right behind x instead of stalling until x settles.
    expect(out.scale.type).toBe("spring");
    expect(out.scale.delay - out.x.delay).toBeLessThanOrEqual(0.03);

    // Closing row-0 cards start sliding and shrinking together (no stationary shrink pause).
    expect(back.scale.type).toBe("spring");
    expect(back.x.delay).toBe(back.y.delay);
    expect(back.scale.delay).toBe(back.x.delay);
  });

  it("delays project captions until each card clears the cover's right edge", () => {
    const col0Caption = getStackCaptionDelay(9, 14, {
      coverWidth: 240,
      from: { x: 32, y: 72 },
      to: { x: 258, y: 1280 },
    });
    const col0Flight = getStackFlightTransition(9, 14, "out", {
      coverWidth: 240,
      from: { x: 32, y: 72 },
      to: { x: 258, y: 1280 },
    });

    expect(col0Caption).toBeGreaterThanOrEqual(col0Flight.y.delay);
    expect(col0Caption).toBeGreaterThan(col0Flight.x.delay + 0.1);
  });

  it("delays closing fade longer for farther cards so they fade behind the cover", () => {
    const nearBack = getStackFlightTransition(2, 6, "in", {
      coverWidth: 240,
      from: { x: 258, y: 3 },
      to: { x: 32, y: 72 },
    });
    const farBack = getStackFlightTransition(2, 6, "in", {
      coverWidth: 240,
      from: { x: 994, y: 27 },
      to: { x: 32, y: 72 },
    });

    expect(farBack.opacity.delay).toBeGreaterThan(nearBack.opacity.delay);
  });
});
