const animationPrototype = globalThis.Animation?.prototype;

if (animationPrototype) {
  const originalCancel = animationPrototype.cancel;

  animationPrototype.cancel = function cancel(this: Animation) {
    const { finished } = this;
    originalCancel.call(this);
    // happy-dom rejects `finished` with AbortError when an animation is
    // canceled. Motion does not handle that rejection, and Vitest fails the run.
    finished.catch(() => undefined);
  };
}
