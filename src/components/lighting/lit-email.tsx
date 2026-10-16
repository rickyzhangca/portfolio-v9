import { useEffect, useRef } from "react";
import screenFontUrl from "@/assets/fonts/matrix-sans/MatrixSansRaster-Regular.woff2?url";
import { runLitSurface } from "./lit-surface";

/** Mark the DOM email card's button and screen, which the lit card measures. */
const EMAIL_BUTTON_ATTRIBUTE = "data-email-button";
const EMAIL_SCREEN_ATTRIBUTE = "data-email-screen";

interface LitEmailProps {
  onReady: () => void;
}

/** Room around the card for its shadow, in local px. */
const SHADOW_MARGIN = 72;
/** The pill's thickness, in local px. */
const PILL_HEIGHT = 4;
/**
 * The button's height above the pill, as a key's: at rest, a little lower
 * under the pointer, and nearly flush when pressed.
 */
const BUTTON_REST = 5;
const BUTTON_HOVER = 4;
const BUTTON_PRESSED = 1;
/** How far the screen is set into the pill, in local px. */
const SCREEN_DEPTH = 1.5;
/** How quickly the screen brightens under the pointer, per second. */
const GLOW_RATE = 18;
/**
 * The screen's face: Matrix Sans Raster (OFL, alongside the file), 5×7 dot
 * matrix capitals drawn as the lines a CRT's beam traces. Self-hosted and
 * loaded with the lamp, so the first view never fetches it.
 */
const SCREEN_FONT_FAMILY = "Matrix Sans Raster";
let isScreenFontAdded = false;

const loadScreenFont = () => {
  if (isScreenFontAdded) {
    return;
  }
  isScreenFontAdded = true;
  const face = new FontFace(SCREEN_FONT_FAMILY, `url(${screenFontUrl})`, {
    display: "swap",
  });
  document.fonts.add(face);
  face.load().catch((error: unknown) => {
    console.warn("Screen font unavailable", error);
  });
};
/** A tap shows its press at least this long, in ms. */
const MIN_PRESS_MS = 120;
/** How quickly the button follows, per second, as the keyboard's keys. */
const BUTTON_RATE = 40;

const ease = (value: number, target: number, rate: number, elapsed: number) =>
  value + (target - value) * (1 - Math.exp(-elapsed * rate));

// The button's box in the card, ignoring transforms.
const offsetIn = (element: HTMLElement, root: HTMLElement) => {
  let x = 0;
  let y = 0;
  let current: HTMLElement | null = element;
  while (current && current !== root) {
    x += current.offsetLeft;
    y += current.offsetTop;
    current = current.offsetParent as HTMLElement | null;
  }
  return [x, y, element.offsetWidth, element.offsetHeight] as const;
};

/**
 * Draws the email card's body with WebGPU in the keyboard's oblique view: a
 * white pill with a small glass screen set into it and a round button of
 * frosted orange aluminium that presses in like a key, both catching the
 * lamp and casting shadows. It sits under
 * the DOM card, whose address, copy animation and icon stay on top; the
 * icon rides down with the button as it is pressed.
 */
export const LitEmail = ({ onReady }: LitEmailProps) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const onReadyRef = useRef(onReady);

  useEffect(() => {
    onReadyRef.current = onReady;
  }, [onReady]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const element = canvas?.parentElement;
    const button = element?.querySelector<HTMLElement>(
      `[${EMAIL_BUTTON_ATTRIBUTE}]`
    );
    const screen = element?.querySelector<HTMLElement>(
      `[${EMAIL_SCREEN_ATTRIBUTE}]`
    );
    const icon = button?.querySelector<SVGElement>("svg");
    if (!(canvas && element && button && screen && icon)) {
      return;
    }
    const box = offsetIn(button, element);
    const screenBox = offsetIn(screen, element);
    const address = screen.previousElementSibling;
    loadScreenFont();

    let isHovered = false;
    let pressedAt: number | null = null;
    let releasedAt = 0;
    const release = () => {
      if (pressedAt !== null) {
        releasedAt = Math.max(performance.now(), pressedAt + MIN_PRESS_MS);
        pressedAt = null;
      }
    };
    const handlers = {
      // Keyboard activation has no pointer press; show a short one.
      click: () => {
        if (pressedAt === null && performance.now() > releasedAt) {
          releasedAt = performance.now() + MIN_PRESS_MS;
        }
      },
      pointercancel: release,
      pointerdown: () => {
        pressedAt = performance.now();
      },
      pointerenter: () => {
        isHovered = true;
      },
      pointerleave: () => {
        isHovered = false;
        release();
      },
      pointerup: release,
    };
    for (const [type, handler] of Object.entries(handlers)) {
      button.addEventListener(type, handler);
    }

    let isScreenHovered = false;
    const handleScreenEnter = () => {
      isScreenHovered = true;
    };
    const handleScreenLeave = () => {
      isScreenHovered = false;
    };
    address?.addEventListener("pointerenter", handleScreenEnter);
    address?.addEventListener("pointerleave", handleScreenLeave);

    let height = BUTTON_REST;
    let glow = 0;
    let iconOffset = "";

    const stop = runLitSurface({
      attach: async (signal) => {
        const { attachEmail } = await import("./email-renderer");
        return attachEmail(canvas, signal);
      },
      draw: (
        surface,
        { height: cardHeight, intensity, light, pixelScale, width }
      ) =>
        surface.render({
          button: box,
          buttonHeight: height,
          buttonRest: BUTTON_REST,
          screen: screenBox,
          screenGlow: glow,
          screenDepth: SCREEN_DEPTH,
          height: cardHeight,
          intensity,
          light,
          margin: SHADOW_MARGIN,
          pillHeight: PILL_HEIGHT,
          pixelHeight: Math.round(
            (cardHeight + SHADOW_MARGIN * 2) * pixelScale
          ),
          pixelWidth: Math.round((width + SHADOW_MARGIN * 2) * pixelScale),
          width,
        }),
      element,
      label: "Email lighting",
      onReady: () => onReadyRef.current(),
      overhang: SHADOW_MARGIN,
      step: (elapsed) => {
        const pressed = pressedAt !== null || performance.now() < releasedAt;
        let target = BUTTON_REST;
        if (pressed) {
          target = BUTTON_PRESSED;
        } else if (isHovered) {
          target = BUTTON_HOVER;
        }
        height = ease(height, target, BUTTON_RATE, elapsed);
        glow = ease(glow, isScreenHovered ? 1 : 0, GLOW_RATE, elapsed);
        // The DOM icon sits on the button's face, which the shader centres,
        // face and side together, on the DOM button and sinks as it presses.
        const offset = `0 ${(BUTTON_REST / 2 - height).toFixed(2)}px`;
        if (offset !== iconOffset) {
          iconOffset = offset;
          icon.style.translate = offset;
        }
        return [height, glow];
      },
    });

    return () => {
      stop();
      icon.style.translate = "";
      address?.removeEventListener("pointerenter", handleScreenEnter);
      address?.removeEventListener("pointerleave", handleScreenLeave);
      for (const [type, handler] of Object.entries(handlers)) {
        button.removeEventListener(type, handler);
      }
    };
  }, []);

  return (
    <canvas
      className="pointer-events-none absolute"
      ref={canvasRef}
      style={{
        height: `calc(100% + ${SHADOW_MARGIN * 2}px)`,
        left: -SHADOW_MARGIN,
        top: -SHADOW_MARGIN,
        width: `calc(100% + ${SHADOW_MARGIN * 2}px)`,
      }}
    />
  );
};
