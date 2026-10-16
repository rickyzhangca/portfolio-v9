import { useEffect, useRef } from "react";
import { subscribeLamp } from "./desk-lamp";
import { startLampShadows } from "./lamp-shadows";

/**
 * The room under the desk lamp: every caster's shadow points away from the
 * lamp, and the room dims around it so the DOM cards share the lit laptop's
 * light. A multiply blend leaves the pool under the lamp untouched and
 * darkens the rest, without repainting anything underneath.
 */
export const DeskLampRoom = () => {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => startLampShadows(), []);

  useEffect(() => {
    const element = ref.current;
    if (!element) {
      return;
    }
    // Fade in after mount so the room dims instead of snapping dark.
    const fade = requestAnimationFrame(() => {
      element.style.opacity = "1";
    });
    let previous = "";
    const unsubscribe = subscribeLamp((lamp) => {
      const x = `${lamp.x.toFixed(1)}px`;
      const y = `${lamp.y.toFixed(1)}px`;
      // The lamp eases forever toward the pointer; skip sub-pixel steps so a
      // resting lamp stops touching the DOM.
      if (`${x} ${y}` === previous) {
        return;
      }
      previous = `${x} ${y}`;
      element.style.setProperty("--lamp-x", x);
      element.style.setProperty("--lamp-y", y);
    });
    return () => {
      cancelAnimationFrame(fade);
      unsubscribe();
    };
  }, []);

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-40 opacity-0 mix-blend-multiply transition-opacity duration-700"
      ref={ref}
      style={{
        background:
          "radial-gradient(circle 900px at var(--lamp-x, 30vw) var(--lamp-y, 18vh), rgb(255 255 252) 0%, rgb(252 251 247) 35%, rgb(230 229 225) 75%, rgb(215 214 210) 100%)",
      }}
    />
  );
};
