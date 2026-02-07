import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AnalyticsEvents, track } from "./analytics";

describe("track", () => {
  let umamiTrackMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    umamiTrackMock = vi.fn();

    // Mock window.umami
    Object.defineProperty(globalThis, "window", {
      value: {
        umami: {
          track: umamiTrackMock,
        },
      },
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("calls umami.track when window.umami exists", () => {
    track(AnalyticsEvents.EMAIL_COPY, { success: true });

    expect(umamiTrackMock).toHaveBeenCalledTimes(1);
    expect(umamiTrackMock).toHaveBeenCalledWith(AnalyticsEvents.EMAIL_COPY, {
      success: true,
    });
  });

  it("calls umami.track without properties when none provided", () => {
    track(AnalyticsEvents.RESUME_VIEW);

    expect(umamiTrackMock).toHaveBeenCalledTimes(1);
    expect(umamiTrackMock).toHaveBeenCalledWith(
      AnalyticsEvents.RESUME_VIEW,
      undefined
    );
  });

  it("does not throw when window.umami is undefined", () => {
    Object.defineProperty(globalThis, "window", {
      value: {},
      writable: true,
      configurable: true,
    });

    expect(() => {
      track(AnalyticsEvents.EMAIL_COPY, { success: true });
    }).not.toThrow();

    expect(umamiTrackMock).not.toHaveBeenCalled();
  });

  it("returns early when window is undefined (SSR context)", () => {
    Object.defineProperty(globalThis, "window", {
      value: undefined,
      writable: true,
      configurable: true,
    });

    expect(() => {
      track(AnalyticsEvents.EMAIL_COPY, { success: true });
    }).not.toThrow();

    expect(umamiTrackMock).not.toHaveBeenCalled();
  });

  it("passes complex properties to umami.track", () => {
    const properties = {
      company: "Test Corp",
      project_name: "Test Project",
      link_type: "github",
    };

    track(AnalyticsEvents.PROJECT_LINK_CLICK, properties);

    expect(umamiTrackMock).toHaveBeenCalledWith(
      AnalyticsEvents.PROJECT_LINK_CLICK,
      properties
    );
  });

  it("handles all defined analytics events", () => {
    const events = Object.values(AnalyticsEvents);

    for (const event of events) {
      track(event as (typeof AnalyticsEvents)[keyof typeof AnalyticsEvents]);
    }

    expect(umamiTrackMock).toHaveBeenCalledTimes(events.length);
    for (const event of events) {
      expect(umamiTrackMock).toHaveBeenCalledWith(event, undefined);
    }
  });
});

describe("AnalyticsEvents", () => {
  it("contains all expected event names", () => {
    expect(AnalyticsEvents.EMAIL_COPY).toBe("email_copy");
    expect(AnalyticsEvents.EMAIL_OPEN).toBe("email_open");
    expect(AnalyticsEvents.PROJECT_LINK_CLICK).toBe("project_link_click");
    expect(AnalyticsEvents.SOCIAL_LINK_CLICK).toBe("social_link_click");
    expect(AnalyticsEvents.SOCIALS_TOGGLE).toBe("socials_toggle");
    expect(AnalyticsEvents.RESUME_VIEW).toBe("resume_view");
    expect(AnalyticsEvents.ABOUT_VIEW).toBe("about_view");
    expect(AnalyticsEvents.MODAL_CLOSE).toBe("modal_close");
    expect(AnalyticsEvents.STACK_EXPAND).toBe("stack_expand");
    expect(AnalyticsEvents.STACK_CLOSE).toBe("stack_close");
    expect(AnalyticsEvents.CANVAS_VIEW_RESET).toBe("canvas_view_reset");
    expect(AnalyticsEvents.CANVAS_POSITION_RESET).toBe("canvas_position_reset");
    expect(AnalyticsEvents.CANVAS_REARRANGEMENT).toBe("canvas_rearrangement");
    expect(AnalyticsEvents.MACBOOK_ZOOM).toBe("macbook_zoom");
    expect(AnalyticsEvents.KEYBOARD_ESCAPE).toBe("keyboard_escape");
  });
});
