/**
 * The time machine is its own chunk. The canvas controls start loading it
 * (and its screenshots) while the pointer heads for the button, so the
 * windows are ready when it is clicked.
 */
export const loadTimeMachine = () => import("./time-machine");

export const warmTimeMachine = () => {
  loadTimeMachine()
    .then((module) => module.warmTimeMachine())
    .catch(() => {
      // The click loads it again; if that fails too, nothing opens.
    });
};
