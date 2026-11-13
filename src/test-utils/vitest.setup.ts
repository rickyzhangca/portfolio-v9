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

// happy-dom's `Element.animate` accepts keyframes but never plays them. Motion
// 14.2+ hands independent transforms and opacity to it, so frames would never
// reach the inline styles tests read. Without it, Motion animates on the main
// thread, as it does for properties it cannot accelerate.
if (typeof Element !== "undefined") {
  Reflect.deleteProperty(Element.prototype, "animate");
}
