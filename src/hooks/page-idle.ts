/** Gives up waiting for idle time once this long has passed after load. */
const IDLE_TIMEOUT_MS = 2000;

let pageIdle: Promise<void> | null = null;

/**
 * Resolves after the window load event, once the browser is idle, so optional
 * chunks never compete with the images and scripts of the first view.
 */
export const whenPageIdle = () => {
  pageIdle ??= new Promise<void>((resolve) => {
    const scheduleIdle = () => {
      if ("requestIdleCallback" in window) {
        window.requestIdleCallback(() => resolve(), {
          timeout: IDLE_TIMEOUT_MS,
        });
      } else {
        setTimeout(resolve, 200);
      }
    };
    if (document.readyState === "complete") {
      scheduleIdle();
    } else {
      window.addEventListener("load", scheduleIdle, { once: true });
    }
  });
  return pageIdle;
};
