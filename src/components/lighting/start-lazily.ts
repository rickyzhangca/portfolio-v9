/**
 * Starts an effect whose code loads with the lamp, outside the first view's
 * scripts. Returns the cleanup, which also cancels a start still loading.
 */
export const startLazily = <Module>(
  load: () => Promise<Module>,
  start: (module: Module) => () => void,
  label: string
) => {
  let stop: (() => void) | null = null;
  let cancelled = false;
  load()
    .then((module) => {
      if (!cancelled) {
        stop = start(module);
      }
    })
    .catch((error: unknown) => console.warn(`${label} unavailable`, error));
  return () => {
    cancelled = true;
    stop?.();
  };
};
