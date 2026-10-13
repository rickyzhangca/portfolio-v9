import { afterEach, describe, expect, it, vi } from "vitest";

const loadModule = async () => {
  vi.resetModules();
  return await import("./page-idle");
};

// happy-dom has no requestIdleCallback; run idle work immediately.
const stubIdleCallback = () => {
  const idle = vi.fn((callback: IdleRequestCallback) => {
    callback({ didTimeout: false, timeRemaining: () => 50 });
    return 1;
  });
  vi.stubGlobal("requestIdleCallback", idle);
  return idle;
};

describe("whenPageIdle", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("waits for the load event before asking for idle time", async () => {
    vi.spyOn(document, "readyState", "get").mockReturnValue("loading");
    const idle = stubIdleCallback();
    const { whenPageIdle } = await loadModule();
    const resolved = vi.fn();
    whenPageIdle().then(resolved);

    await Promise.resolve();
    expect(idle).not.toHaveBeenCalled();
    expect(resolved).not.toHaveBeenCalled();

    window.dispatchEvent(new Event("load"));
    await whenPageIdle();
    expect(idle).toHaveBeenCalledTimes(1);
    expect(resolved).toHaveBeenCalledTimes(1);
  });

  it("shares one wait between callers once the page has loaded", async () => {
    vi.spyOn(document, "readyState", "get").mockReturnValue("complete");
    const idle = stubIdleCallback();
    const { whenPageIdle } = await loadModule();

    await Promise.all([whenPageIdle(), whenPageIdle()]);
    expect(whenPageIdle()).toBe(whenPageIdle());
    expect(idle).toHaveBeenCalledTimes(1);
  });
});
