import { useAtom } from "jotai";
import {
  type ComponentType,
  type FocusEvent,
  type MouseEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { TimecarCardContent } from "@/cards/registry";
import { createCarGlow } from "@/components/lighting/car-glow";
import { LitCar } from "@/components/lighting/lit-car";
import { warmTimeMachine } from "@/components/time-machine/load-time-machine";
import { deskLampAtom } from "@/context/atoms";
import { useCanvasSession } from "@/context/canvas-session";
import { AnalyticsEvents, track } from "@/lib/analytics";
import { tw } from "@/lib/utils";
import type { FluxCharge as FluxChargeComponent, Trip } from "./flux-charge";

const WIDTH = 248;
const HEIGHT = 117;
/** Without a time machine to open, the car comes back on its own. */
const RETURN_WITHOUT_TIME_MACHINE_MS = 1200;

type FluxChargeType = ComponentType<Parameters<typeof FluxChargeComponent>[0]>;

let fluxCharge: Promise<FluxChargeType> | undefined;
// The effect stays out of the first load; the first hover or focus loads it.
const loadFluxCharge = () => {
  fluxCharge ??= import("./flux-charge").then((module) => module.FluxCharge);
  return fluxCharge;
};

interface TimecarCardProps {
  content: TimecarCardContent;
}

/**
 * A toy time machine, seen from above and a little from its side. Resting
 * the pointer on it (or focusing it) charges it up; clicking it sends it off
 * in a flash on burning tyres and opens the time machine, as the canvas
 * controls' clock does, and it comes back when that closes. A drag only
 * moves it. Under the desk lamp it is relit with WebGPU.
 */
export const TimecarCard = ({ content }: TimecarCardProps) => {
  const { openTimeMachine, timeMachineOpen } = useCanvasSession();
  const [isLampOn, setLampOn] = useAtom(deskLampAtom);
  const [isLitReady, setLitReady] = useState(false);
  const [isCharging, setCharging] = useState(false);
  const [trip, setTrip] = useState<Trip>("parked");
  const [FluxCharge, setFluxCharge] = useState<FluxChargeType | null>(null);
  const bodyRef = useRef<HTMLDivElement | null>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const wasOpenRef = useRef<boolean>(false);
  // Set when the window, not the car, lost focus: switching back to the tab
  // focuses the car again, wherever the pointer is.
  const windowBlurredRef = useRef<boolean>(false);
  // The lights the effect throws on the lamp-lit car.
  const [glow] = useState(createCarGlow);
  // The DOM image gives way once WebGPU has drawn its first frame.
  const isDomHidden = isLampOn && isLitReady;
  const handleLitFail = useCallback(() => setLampOn(false), [setLampOn]);
  const handleLitReady = useCallback(() => setLitReady(true), []);
  const maps = useMemo(
    () => ({
      normal: content.normalMap,
      photo: content.image,
      surface: content.surfaceMap,
    }),
    [content.image, content.normalMap, content.surfaceMap]
  );

  useEffect(() => {
    if (!isLampOn) {
      setLitReady(false);
    }
  }, [isLampOn]);

  // The car comes back as the time machine lands on the desk again.
  useEffect(() => {
    if (timeMachineOpen) {
      wasOpenRef.current = true;
      return;
    }
    if (wasOpenRef.current) {
      wasOpenRef.current = false;
      setTrip((current) => (current === "away" ? "returning" : current));
    }
  }, [timeMachineOpen]);

  // Nothing opened (no session): bring the car back anyway.
  useEffect(() => {
    if (trip !== "away" || openTimeMachine) {
      return;
    }
    const timer = window.setTimeout(
      () => setTrip("returning"),
      RETURN_WITHOUT_TIME_MACHINE_MS
    );
    return () => window.clearTimeout(timer);
  }, [openTimeMachine, trip]);

  const warm = useCallback(() => {
    warmTimeMachine();
    loadFluxCharge()
      .then((component) => setFluxCharge(() => component))
      .catch(() => {
        // Without the effect, a click opens the time machine directly.
      });
  }, []);

  const open = useCallback(() => {
    const button = buttonRef.current;
    if (button) {
      openTimeMachine?.(button);
    }
  }, [openTimeMachine]);

  const handleClick = useCallback(
    (_event: MouseEvent<HTMLButtonElement>) => {
      if (trip === "departing" || trip === "away") {
        return;
      }
      track(AnalyticsEvents.TIME_MACHINE_OPEN);
      // The canvas goes inert behind the time machine, so no leave follows.
      setCharging(false);
      const reducedMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)"
      ).matches;
      if (FluxCharge && !reducedMotion) {
        setTrip("departing");
      } else {
        open();
      }
    },
    [FluxCharge, open, trip]
  );
  const handleDeparted = useCallback(() => {
    setTrip("away");
    open();
  }, [open]);
  const handleReturned = useCallback(() => setTrip("parked"), []);
  const startCharging = useCallback(() => {
    warm();
    // Focus comes back to the car as it returns; it should not charge again.
    if (trip === "parked") {
      setCharging(true);
    }
  }, [trip, warm]);
  const stopCharging = useCallback(() => setCharging(false), []);
  const handleFocus = useCallback(
    (event: FocusEvent<HTMLButtonElement>) => {
      const isWindowReturn = windowBlurredRef.current;
      windowBlurredRef.current = false;
      // Only keyboard focus charges it: a click focuses it too, and focus
      // restored by the browser or the time machine is not a visit.
      if (!isWindowReturn && event.currentTarget.matches(":focus-visible")) {
        startCharging();
      } else {
        warm();
      }
    },
    [startCharging, warm]
  );
  const handleBlur = useCallback((event: FocusEvent<HTMLButtonElement>) => {
    // The car keeps focus while the window is in the background.
    windowBlurredRef.current = document.activeElement === event.currentTarget;
    setCharging(false);
  }, []);

  return (
    <button
      aria-label="Time travel to earlier portfolios"
      className="relative block cursor-pointer rounded-[18px] focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-4"
      onBlur={handleBlur}
      onClick={handleClick}
      onFocus={handleFocus}
      onPointerEnter={startCharging}
      onPointerLeave={stopCharging}
      ref={buttonRef}
      style={{ height: HEIGHT, width: WIDTH }}
      type="button"
    >
      <div className="relative h-full w-full" ref={bodyRef}>
        <img
          alt=""
          className={tw(
            "pointer-events-none h-full w-full select-none",
            isDomHidden && "opacity-0"
          )}
          decoding="async"
          draggable={false}
          height={HEIGHT}
          sizes={`${WIDTH}px`}
          src={content.image}
          srcSet={`${content.image2x} ${WIDTH * 2}w, ${content.image} ${WIDTH * 3}w`}
          width={WIDTH}
        />
        {isLampOn ? (
          <LitCar
            glow={glow}
            maps={maps}
            onFail={handleLitFail}
            onReady={handleLitReady}
          />
        ) : null}
      </div>
      {FluxCharge ? (
        <FluxCharge
          bodyRef={bodyRef}
          charging={isCharging}
          glow={glow}
          height={HEIGHT}
          image={content.image}
          lampOn={isLampOn}
          onDeparted={handleDeparted}
          onReturned={handleReturned}
          trip={trip}
          width={WIDTH}
        />
      ) : null}
    </button>
  );
};
