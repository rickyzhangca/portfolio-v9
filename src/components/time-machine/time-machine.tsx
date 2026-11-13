import { CaretLeftIcon, CaretRightIcon, XIcon } from "@phosphor-icons/react";
import {
  animate,
  cancelFrame,
  frame,
  type MotionValue,
  motionValue,
} from "framer-motion";
import {
  type FocusEvent,
  type MouseEvent,
  type PointerEvent,
  type RefObject,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { pauseLamp } from "@/components/lighting/desk-lamp";
import { springCss } from "@/components/toolbar/spring-css";
import { AnalyticsEvents, track } from "@/lib/analytics";
import {
  type Camera,
  clampScroll,
  formatVersionDate,
  getSquirclePath,
  getTimelineCamera,
  getTimelineGeometry,
  getWindowAt,
  getWindowCamera,
  getWindowRect,
  isWindowInView,
  LABEL_SPACE_PX,
  type Point,
  type Rect,
  type Size,
  type TimelineGeometry,
  toScreen,
  WINDOW_RADIUS_PX,
} from "@/lib/time-machine";
import { tw } from "@/lib/utils";
import {
  CURRENT_VERSION_LABEL,
  EARLIER_VERSIONS,
  type PortfolioVersion,
} from "./versions";

/**
 * - timeline: zoomed out, the present in the middle, the past to its right.
 * - open: zoomed in on an earlier version, inset by the padding.
 * - closing: zoomed in on the present until it fills the screen again.
 */
type Phase = "timeline" | "open" | "closing";

/**
 * Everything the camera animates. `crop` turns the present from the whole
 * screen (0) into a window like the others (1); `push` (0 to 1) shoves the
 * windows beside `pushFrom` further out while one is close, the way the
 * canvas's repulsion makes room around an opened card. `open` (0 to 1) is
 * how far a version has opened: the controls move into the room below it.
 */
interface CameraValues {
  crop: MotionValue<number>;
  open: MotionValue<number>;
  push: MotionValue<number>;
  scale: MotionValue<number>;
  x: MotionValue<number>;
  y: MotionValue<number>;
}

interface Pose extends Camera {
  crop: number;
  open: number;
  push: number;
}

const CAMERA_KEYS = ["crop", "open", "push", "scale", "x", "y"] as const;

/** One spring for every value, so the row moves as one camera. */
const CAMERA_SPRING = {
  damping: 30,
  mass: 1,
  stiffness: 230,
  type: "spring",
} as const;
const LINE_HEIGHT_PX = 16;
/**
 * The room is dark grey from the first frame the canvas shrinks away from,
 * then deepens into its vignette: fading in from transparent showed the
 * desk's near-white first, a jump from almost white to almost black.
 */
const ROOM_FADE_MS = 450;
const FADE_MS = 200;
/** A page has painted shortly after its load event; then it covers the shot. */
const FRAME_SETTLE_MS = 150;
/**
 * The camera's spring is critically damped and within 1% of an opened
 * window by then: its screenshot fades out once the window has landed.
 */
const FRAME_REVEAL_AFTER_OPEN_MS = 450;
/** Closing past this zoom, the canvas is close enough to hand back. */
const LANDING_SCALE = 0.99;

/**
 * A window one click opens rises under the pointer: it grows by this share
 * about its centre and lifts this many screen px, casting a deeper shadow.
 */
const LIFT_SCALE = 0.025;
const LIFT_PX = 6;
/** Pressed, a lifted window gives back down to this much of its lift. */
const PRESSED_LIFT = 0.4;
/** Quicker than the camera, so the window answers the pointer at once. */
const LIFT_SPRING = {
  damping: 32,
  mass: 1,
  stiffness: 500,
  type: "spring",
} as const;
/**
 * On the timeline every window sits under a faint dark veil; the lifted one
 * lights up as its veil clears and a rim of light catches its edge.
 */
const VEIL_OPACITY = 0.05;
/**
 * Windows lift only once the row has settled: sliding under a still
 * pointer, each one rose and fell as it passed. The row counts as moving
 * while the camera pans faster than this (screen px/s) or zooms, and for a
 * while after the last native scroll, whose jumps carry no velocity.
 */
const SETTLED_SPEED_PX = 40;
const SETTLED_ZOOM_SPEED = 0.05;
const SCROLL_SETTLE_MS = 120;

/**
 * Depth of field on the timeline: the window in the middle is in focus and
 * the row goes soft towards the screen's sides. Each side stacks blurred
 * backdrops, each reaching less far in from the edge than the one before
 * and blurring more, under a gradient mask, so the blur grows smoothly
 * outwards. `reach` is the share of the side, from the screen's edge, a
 * layer covers; its last `fade` share eases out. Backdrop filters are the
 * one blur that sees the live canvas and the cross-origin frames.
 */
const DEPTH_LAYERS = [
  { blur: 3, fade: 0.5, reach: 1 },
  { blur: 10, fade: 0.35, reach: 0.5 },
] as const;
/**
 * Above and below the row of windows and labels, the sides' reach: enough
 * for a lifted window, its shadow's core and the blur's own bleed. The rest
 * of the screen is bare room, and every backdrop px is redrawn each frame.
 */
const DEPTH_BAND_MARGIN_PX = 40;
/**
 * The sides blur only within this share of the timeline's zoom: redrawn
 * every frame of a zoom over the moving canvas, they cost a 5K screen about
 * a dozen late frames each way, and nobody reads the sides mid-flight.
 */
const DEPTH_ZOOM_RANGE = 0.02;
const RIM_OPACITY = 0.25;

/** Side of the step and close buttons, in screen px. */
const STEP_BUTTON_PX = 56;
/**
 * On the timeline, between a window's bottom edge and the row of its label
 * and the step buttons beside it.
 */
const TIMELINE_CONTROLS_GAP_PX = 18;
/**
 * The close button rests this far up behind the window's bottom edge while
 * no version is open, and slides out from under it as one opens.
 */
const CLOSE_TUCK_PX = STEP_BUTTON_PX + 8;

/**
 * The step and close buttons. A step that has run out shrinks away rather
 * than dimming, and every press gives under the finger.
 */
const STEP_BUTTON_CLASS =
  "pointer-events-auto flex size-14 cursor-pointer items-center justify-center rounded-full bg-white/15 text-white hover:bg-white/25 focus-visible:outline-2 focus-visible:outline-accent active:scale-90 disabled:pointer-events-none disabled:scale-50 disabled:opacity-0 data-[away]:pointer-events-none data-[away]:scale-50 data-[away]:opacity-0";
/** A little overshoot as a button comes back or is let go. */
const BUTTON_SPRING = springCss(620, 26);
const STEP_BUTTON_STYLE = {
  transition: `background-color 150ms ease, opacity 160ms ease, scale ${BUTTON_SPRING.duration}ms ${BUTTON_SPRING.easing}`,
} as const;

/** Newest first: the timeline runs from the present into the past. */
const TIMELINE = [...EARLIER_VERSIONS].reverse();
const WINDOW_COUNT = TIMELINE.length + 1;

let warmed = false;

/** Fetches the screenshots and opens connections to the earlier sites. */
export const warmTimeMachine = () => {
  if (warmed) {
    return;
  }
  warmed = true;
  for (const version of EARLIER_VERSIONS) {
    const image = new Image();
    image.src = version.screenshot;
    image.decode().catch(() => {
      // Only a warm-up; the window shows the image when it arrives.
    });
    const link = document.createElement("link");
    link.rel = "preconnect";
    link.href = new URL(version.url).origin;
    document.head.append(link);
  }
};

const useViewportSize = () => {
  const [size, setSize] = useState<Size>(() => ({
    height: window.innerHeight,
    width: window.innerWidth,
  }));
  useEffect(() => {
    const handleResize = () =>
      setSize({ height: window.innerHeight, width: window.innerWidth });
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);
  return size;
};

const prefersReducedMotion = () =>
  window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;

/** A sideways wheel's movement in px. */
const getSidewaysDelta = (event: WheelEvent) => {
  if (event.deltaMode === WheelEvent.DOM_DELTA_LINE) {
    return event.deltaX * LINE_HEIGHT_PX;
  }
  if (event.deltaMode === WheelEvent.DOM_DELTA_PAGE) {
    return event.deltaX * window.innerWidth;
  }
  return event.deltaX;
};

const getPose = (
  geometry: TimelineGeometry,
  phase: Phase,
  openIndex: number,
  scroll: number
): Pose => {
  if (phase === "timeline") {
    return {
      ...getTimelineCamera(geometry, scroll),
      crop: 1,
      open: 0,
      push: 0,
    };
  }
  if (phase === "open") {
    return {
      ...getWindowCamera(geometry, openIndex),
      crop: 1,
      open: 1,
      push: 1,
    };
  }
  return { ...getWindowCamera(geometry, 0), crop: 0, open: 0, push: 1 };
};

/**
 * Window `index`'s world rectangle, pushed away from `pushFrom`. `pushFrom`
 * springs between windows when an open version steps to its neighbour, so
 * the one it leaves eases aside while the next eases back into its place.
 */
const getPushedRect = (
  geometry: TimelineGeometry,
  index: number,
  pushFrom: number,
  push: number
): Rect => {
  const rect = getWindowRect(geometry, index);
  const side = Math.min(1, Math.max(-1, index - pushFrom));
  return {
    ...rect,
    x: rect.x + side * push * geometry.push,
  };
};

/** Whether a timeline scroll rests off every window by over a screen px. */
const isBetweenWindows = (geometry: TimelineGeometry, scroll: number) => {
  const offset = scroll - Math.round(scroll / geometry.step) * geometry.step;
  return Math.abs(offset) * geometry.timelineScale > 1;
};

const toTransform = (x: number, y: number, scale: number) =>
  `translate3d(${x}px, ${y}px, 0) scale(${scale})`;

interface TimeMachineProps {
  /**
   * The element that holds the canvas. The time machine transforms it into
   * the present's window and restores its style when unmounted.
   */
  canvasWindow: RefObject<HTMLElement | null>;
  /** Called once the canvas fills the screen again. */
  onClosed: () => void;
  /**
   * Called while closing, once the canvas is nearly full size: its toolbar
   * can fade back in while the camera settles.
   */
  onLanding: () => void;
}

/**
 * Mission Control for the portfolio's versions, as one camera over a row of
 * windows (`src/lib/time-machine.ts`). Opening zooms out from the live
 * canvas, which becomes the present's window, with the past sliding in from
 * the right; opening an earlier version flies the camera onto it; closing
 * flies back until the present fills the screen.
 *
 * Every value springs with the same spring, and each frame writes transforms
 * and squircle `clip-path`s straight to the elements: the corners grow with
 * the zoom, and nothing repaints the canvas. The canvas keeps its state: it
 * is locked and inert meanwhile, and the desk lamp pauses, because its
 * listeners measure in client px.
 */
export const TimeMachine = ({
  canvasWindow,
  onClosed,
  onLanding,
}: TimeMachineProps) => {
  const viewport = useViewportSize();
  const geometry = useMemo(
    () => getTimelineGeometry(viewport, WINDOW_COUNT),
    [viewport]
  );
  const [reducedMotion] = useState(prefersReducedMotion);
  const [deskColor] = useState(
    () => getComputedStyle(document.body).backgroundColor
  );
  const [phase, setPhase] = useState<Phase>("timeline");
  /** The open window, or the last one opened; the present is 0. */
  const [openIndex, setOpenIndex] = useState(0);
  /** The window nearest the middle of the timeline. */
  const [timelineIndex, setTimelineIndex] = useState(0);
  /**
   * The wheel has left the timeline between windows. The step buttons go
   * away until it rests on one again (a glide, a click, or the wheel
   * happening to stop there): a step is from one window to the next.
   */
  const [isAdrift, setAdrift] = useState(false);
  /** The window whose button has keyboard focus, for its label. */
  const [keyboardIndex, setKeyboardIndex] = useState<number | null>(null);
  const [mountedFrames, setMountedFrames] = useState<ReadonlySet<string>>(
    () => new Set()
  );
  const [readyFrames, setReadyFrames] = useState<ReadonlySet<string>>(
    () => new Set()
  );
  /**
   * Versions whose window has been opened and has landed. A load event can
   * come before an old site has painted anything. The page fades in over
   * its screenshot once its window has been
   * opened and the camera has settled on it, and stays live from then on.
   */
  const [openedFrames, setOpenedFrames] = useState<ReadonlySet<string>>(
    () => new Set()
  );
  // Closed: the camera rests on the present, which fills the screen.
  const [camera] = useState<CameraValues>(() => {
    const closed = getPose(geometry, "closing", 0, 0);
    return {
      crop: motionValue(closed.crop),
      open: motionValue(closed.open),
      push: motionValue(closed.push),
      scale: motionValue(closed.scale),
      x: motionValue(closed.x),
      y: motionValue(closed.y),
    };
  });
  /** The window the others are pushed away from. */
  const [pushFrom] = useState(() => motionValue(0));
  /** How far each window has risen under the pointer, 0 to 1. */
  const [lifts] = useState(() =>
    Array.from({ length: WINDOW_COUNT }, () => motionValue(0))
  );
  /** Unclamped: stretches past the ends while the wheel is still turning. */
  const scrollRef = useRef(0);
  const windowsRef = useRef<(HTMLDivElement | null)[]>([]);
  const labelsRef = useRef<(HTMLParagraphElement | null)[]>([]);
  const buttonsRef = useRef<(HTMLButtonElement | null)[]>([]);
  const veilsRef = useRef<(HTMLDivElement | null)[]>([]);
  const rimsRef = useRef<(SVGSVGElement | null)[]>([]);
  const shadowsRef = useRef<(HTMLDivElement | null)[]>([]);
  const depthLeftRef = useRef<HTMLDivElement>(null);
  const depthRightRef = useRef<HTMLDivElement>(null);
  /** Where the pointer is over the timeline, in client px. */
  const pointerRef = useRef<Point | null>(null);
  const pressedRef = useRef<boolean>(false);
  /** Each window's lift target, so the springs restart only on a change. */
  const liftTargetsRef = useRef<number[]>(new Array(WINDOW_COUNT).fill(0));
  /** When the user last scrolled the row natively. */
  const scrolledAtRef = useRef(Number.NEGATIVE_INFINITY);
  const liftTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined
  );
  const roomRef = useRef<HTMLDivElement>(null);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef<HTMLDivElement>(null);
  const newerRef = useRef<HTMLDivElement>(null);
  const olderRef = useRef<HTMLDivElement>(null);
  const newerButtonRef = useRef<HTMLButtonElement>(null);
  const olderButtonRef = useRef<HTMLButtonElement>(null);
  /** The scroll the camera is gliding to, in world px, until it lands. */
  const glideRef = useRef<number | null>(null);
  /** The scroller position the glide last wrote, to tell from the user's. */
  const writtenTopRef = useRef<number | null>(null);
  const frameTimersRef = useRef(new Set<ReturnType<typeof setTimeout>>());
  const onClosedRef = useRef(onClosed);
  const onLandingRef = useRef(onLanding);
  useEffect(() => {
    onClosedRef.current = onClosed;
    onLandingRef.current = onLanding;
  }, [onClosed, onLanding]);

  // The canvas becomes a window: a fixed desk colour behind it, its own
  // layer, above the backdrop. Restored as it was when the stage unmounts,
  // so this runs before the first camera write.
  useLayoutEffect(() => {
    const element = canvasWindow.current;
    if (!element) {
      return;
    }
    const previousStyle = element.getAttribute("style");
    Object.assign(element.style, {
      background: deskColor,
      transformOrigin: "0 0",
      willChange: "transform",
      zIndex: "1",
    } satisfies Partial<CSSStyleDeclaration>);
    pauseLamp(true);
    return () => {
      if (previousStyle === null) {
        element.removeAttribute("style");
      } else {
        element.setAttribute("style", previousStyle);
      }
      pauseLamp(false);
    };
  }, [canvasWindow, deskColor]);

  // Writes every element's place from the camera, once per frame.
  useLayoutEffect(() => {
    const canvas = canvasWindow.current;
    const write = () => {
      const scale = camera.scale.get();
      const crop = Math.min(1, Math.max(0, camera.crop.get()));
      const push = camera.push.get();
      const view: Camera = { scale, x: camera.x.get(), y: camera.y.get() };
      const from = pushFrom.get();
      const radius = WINDOW_RADIUS_PX / scale;
      const opened = Math.min(1, Math.max(0, camera.open.get()));
      // The veils, rims and lift shadows belong to the timeline alone.
      const timelineLight = crop * (1 - opened);
      // The depth of field is the timeline's too: it clears as a window
      // opens or the canvas comes back, and stops filtering once clear.
      // Each layer fades itself: an opacity below 1 on their parent would
      // make it their backdrop root, so they would blur nothing until the
      // fade ended (Safari showed the blur a second late).
      const zoomed = Math.abs(scale / geometry.timelineScale - 1);
      const depthLight =
        timelineLight * Math.max(0, 1 - zoomed / DEPTH_ZOOM_RANGE);
      for (const side of [depthLeftRef.current, depthRightRef.current]) {
        if (side) {
          for (const layer of side.children) {
            (layer as HTMLElement).style.opacity = String(depthLight);
          }
          side.style.visibility = depthLight > 1e-3 ? "" : "hidden";
        }
      }
      const motionShare = reducedMotion ? 0 : 1;

      /** Window `index`'s lift, as a growth about its centre and a rise. */
      const getLift = (index: number, origin: Point, size: Size) => {
        const lift = lifts[index]?.get() ?? 0;
        const grow = 1 + LIFT_SCALE * lift * motionShare;
        const rise = LIFT_PX * lift * motionShare;
        const centre = {
          x: origin.x + size.width / 2,
          y: origin.y + size.height / 2,
        };
        return {
          grow,
          light: Math.min(1, Math.max(0, lift)),
          place: (point: Point): Point => ({
            x: centre.x + (point.x - centre.x) * grow,
            y: centre.y + (point.y - centre.y) * grow - rise,
          }),
        };
      };

      // The present: the whole canvas, cropped to its window as it shrinks.
      const presentRect = getPushedRect(geometry, 0, from, push);
      const presentShift = presentRect.x - getWindowRect(geometry, 0).x;
      const presentLift = getLift(0, toScreen(viewport, view, presentRect), {
        height: presentRect.height * scale,
        width: presentRect.width * scale,
      });
      const canvasOrigin = presentLift.place(
        toScreen(viewport, view, { x: presentShift, y: 0 })
      );
      if (canvas) {
        canvas.style.transform = toTransform(
          canvasOrigin.x,
          canvasOrigin.y,
          scale * presentLift.grow
        );
        const inset = crop * geometry.padding;
        const bottomInset = crop * geometry.bottomPadding;
        canvas.style.clipPath =
          crop <= 0 && Math.abs(scale - 1) < 1e-4
            ? ""
            : `path("${getSquirclePath(
                {
                  height: viewport.height - inset - bottomInset,
                  width: viewport.width - inset * 2,
                  x: inset,
                  y: inset,
                },
                // Grows with the crop, so the corners round in as it shrinks.
                crop * radius
              )}")`;
      }

      const windowPath = getSquirclePath(
        { ...geometry.window, x: 0, y: 0 },
        radius
      );
      const windowClip = `path("${windowPath}")`;
      for (let index = 0; index < WINDOW_COUNT; index += 1) {
        const rect = getPushedRect(geometry, index, from, push);
        const origin = toScreen(viewport, view, rect);
        const width = rect.width * scale;
        const height = rect.height * scale;
        const { grow, light, place } =
          index === 0 ? presentLift : getLift(index, origin, { height, width });
        const lifted = place(origin);
        const element = windowsRef.current[index];
        if (element) {
          element.style.transform = toTransform(
            lifted.x,
            lifted.y,
            scale * grow
          );
          element.style.clipPath = windowClip;
        }
        const button = buttonsRef.current[index];
        if (index === 0 && button) {
          // The canvas is inert; this takes the present's clicks and holds
          // its veil and rim, in the same world units as the past windows.
          button.style.transform = toTransform(
            lifted.x,
            lifted.y,
            scale * grow
          );
          button.style.clipPath =
            timelineLight > 0
              ? `path("${getSquirclePath(
                  { ...geometry.window, x: 0, y: 0 },
                  crop * radius
                )}")`
              : "";
        }
        const veil = veilsRef.current[index];
        if (veil) {
          veil.style.opacity = String(
            VEIL_OPACITY * timelineLight * (1 - light)
          );
        }
        const rim = rimsRef.current[index];
        if (rim) {
          const rimOpacity = RIM_OPACITY * timelineLight * light;
          rim.style.opacity = String(rimOpacity);
          const path = rim.firstElementChild;
          if (rimOpacity > 1e-3 && path) {
            // Half the stroke falls outside the clip: a 1px line on screen.
            if (index === 0) {
              path.setAttribute(
                "d",
                getSquirclePath(
                  { ...geometry.window, x: 0, y: 0 },
                  crop * radius
                )
              );
              path.setAttribute("stroke-width", String(2 / (scale * grow)));
            } else {
              path.setAttribute("d", windowPath);
              path.setAttribute("stroke-width", String(2 / (scale * grow)));
            }
          }
        }
        const shadow = shadowsRef.current[index];
        if (shadow) {
          shadow.style.transform = toTransform(
            lifted.x,
            lifted.y,
            scale * grow
          );
          shadow.style.opacity = String(timelineLight * light * motionShare);
        }
        const label = labelsRef.current[index];
        if (label) {
          label.style.transform = toTransform(
            origin.x + width / 2,
            origin.y + height + TIMELINE_CONTROLS_GAP_PX,
            1
          );
          label.style.setProperty("--lift", String(light));
        }
      }

      // The controls hang from the bottom edge of the window in the middle
      // of the screen (the one centred on the timeline, the open one zoomed
      // in), so they move with the camera and nothing fades in from
      // nowhere. While the present still fills the screen that edge is the
      // screen's own, so they wait just below it and rise as it shrinks.
      const restingRect = getWindowRect(geometry, 0);
      const bottom = toScreen(viewport, view, {
        x: 0,
        y:
          restingRect.y +
          restingRect.height +
          (1 - crop) * geometry.bottomPadding,
      }).y;
      // Centred in the room below an open window.
      const roomGap = (geometry.bottomPadding - STEP_BUTTON_PX) / 2;
      // Level with the labels on the timeline, below the window's corners;
      // they spread to the screen's corners as it opens.
      const stepTop =
        bottom +
        TIMELINE_CONTROLS_GAP_PX +
        (roomGap - TIMELINE_CONTROLS_GAP_PX) * opened;
      const left =
        (viewport.width -
          (geometry.window.width + (1 - crop) * geometry.padding * 2) * scale) /
        2;
      if (newerRef.current) {
        newerRef.current.style.transform = toTransform(left, stepTop, 1);
      }
      if (olderRef.current) {
        olderRef.current.style.transform = toTransform(
          viewport.width - left - STEP_BUTTON_PX,
          stepTop,
          1
        );
      }
      // Close slides out from behind the window's bottom edge as a version
      // opens, and back under it as the version shrinks into the row.
      if (closeRef.current) {
        closeRef.current.style.transform = toTransform(
          (viewport.width - STEP_BUTTON_PX) / 2,
          bottom - CLOSE_TUCK_PX + (roomGap + CLOSE_TUCK_PX) * opened,
          1
        );
        // Out of sight as it sets off, in case a gap between windows is
        // passing over it.
        closeRef.current.style.opacity = String(Math.min(1, opened * 3));
      }
    };
    write();
    const schedule = () => frame.render(write);
    const unsubscribe = [
      ...CAMERA_KEYS.map((key) => camera[key].on("change", schedule)),
      ...lifts.map((lift) => lift.on("change", schedule)),
      pushFrom.on("change", schedule),
    ];
    return () => {
      for (const stop of unsubscribe) {
        stop();
      }
      cancelFrame(write);
    };
  }, [
    camera,
    canvasWindow,
    geometry,
    lifts,
    pushFrom,
    reducedMotion,
    viewport,
  ]);

  // The room deepens from flat dark grey into its vignette.
  useLayoutEffect(() => {
    roomRef.current?.animate([{ opacity: 0 }, { opacity: 1 }], {
      duration: reducedMotion ? 0 : ROOM_FADE_MS,
      easing: "ease-out",
    });
  }, [reducedMotion]);

  // Flies the camera to the phase's pose.
  useEffect(() => {
    // Takes over from a glide along the row.
    glideRef.current = null;
    // The timeline keeps the last window pushed from, as its push eases out.
    let pushTarget = pushFrom.get();
    if (phase === "open") {
      pushTarget = openIndex;
    } else if (phase === "closing") {
      pushTarget = 0;
    }
    // Nothing is pushed yet: the windows can take the new side at once.
    let pushFromAnimation: ReturnType<typeof animate> | undefined;
    if (reducedMotion || camera.push.get() < 1e-3) {
      pushFrom.jump(pushTarget);
    } else {
      pushFromAnimation = animate(pushFrom, pushTarget, CAMERA_SPRING);
    }
    const pose = getPose(
      geometry,
      phase,
      openIndex,
      clampScroll(scrollRef.current, geometry.maxScroll)
    );
    if (reducedMotion) {
      for (const key of CAMERA_KEYS) {
        camera[key].jump(pose[key]);
      }
      if (phase === "closing") {
        onLandingRef.current();
        onClosedRef.current();
      }
      return;
    }
    const animations = CAMERA_KEYS.map((key) =>
      animate(camera[key], pose[key], CAMERA_SPRING)
    );
    let stopLanding: (() => void) | undefined;
    if (phase === "closing") {
      // The spring's last few px take as long again as the flight: the
      // toolbar starts back as the canvas reaches the screen's edges.
      stopLanding = camera.scale.on("change", (scale) => {
        if (scale >= LANDING_SCALE) {
          stopLanding?.();
          onLandingRef.current();
        }
      });
      Promise.all(animations).then(() => onClosedRef.current());
    }
    return () => {
      stopLanding?.();
      pushFromAnimation?.stop();
      for (const animation of animations) {
        animation.stop();
      }
    };
  }, [camera, geometry, openIndex, phase, pushFrom, reducedMotion]);

  /**
   * Glides the row to `scroll` world px on the camera's spring, which keeps
   * the camera's speed: a second press while it is still moving carries on
   * from that speed instead of starting again from rest, as the browser's
   * smooth scroll did, so quick presses add up. The scroller is kept in
   * step, so a wheel can take over from wherever the glide is.
   */
  const glideTo = useCallback(
    (scroll: number) => {
      const scroller = scrollerRef.current;
      const target = clampScroll(scroll, geometry.maxScroll);
      setTimelineIndex(Math.round(target / geometry.step));
      // Gliding from one window to the next: the step buttons stay.
      setAdrift(false);
      if (reducedMotion) {
        scroller?.scrollTo({
          behavior: "instant",
          top: target * geometry.timelineScale,
        });
        return;
      }
      glideRef.current = target;
      // On the timeline the camera's x is the present's centre plus the
      // scroll.
      const origin = getTimelineCamera(geometry, 0).x;
      animate(camera.x, origin + target, {
        ...CAMERA_SPRING,
        onComplete: () => {
          if (glideRef.current === target) {
            glideRef.current = null;
          }
        },
        onUpdate: (x) => {
          // Past either end the camera overshoots a little; the scroller
          // stays within its range.
          scrollRef.current = x - origin;
          const top =
            clampScroll(scrollRef.current, geometry.maxScroll) *
            geometry.timelineScale;
          writtenTopRef.current = top;
          if (scroller) {
            scroller.scrollTop = top;
          }
        },
      });
    },
    [camera, geometry, reducedMotion]
  );
  /** Stops a glide where it is, for the wheel or a scroll to take over. */
  const stopGlide = useCallback(() => {
    if (glideRef.current !== null) {
      glideRef.current = null;
      camera.x.stop();
      setAdrift(isBetweenWindows(geometry, scrollRef.current));
    }
  }, [camera, geometry]);
  /** The window the timeline rests on, or is gliding to. */
  const getTimelineTarget = useCallback(
    () =>
      Math.round(
        (glideRef.current ??
          clampScroll(scrollRef.current, geometry.maxScroll)) / geometry.step
      ),
    [geometry]
  );

  // The row scrolls natively: a transparent scroller over the timeline
  // reports its scroll and the camera follows it one to one, so the browser
  // brings its own momentum, wheel smoothing, end bounce and clamping, which
  // hand-rolled wheel handling only imitated. It scrolls vertically, so
  // mouse wheels work as they are; sideways swipes are added to it.
  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller || phase !== "timeline") {
      return;
    }
    const handleScroll = () => {
      const top = scroller.scrollTop;
      // Written by a glide, which the camera is already making. WebKit
      // scrolls by whole px, so it reads back within a px.
      if (
        writtenTopRef.current !== null &&
        Math.abs(top - writtenTopRef.current) < 1
      ) {
        return;
      }
      writtenTopRef.current = null;
      const scroll = top / geometry.timelineScale;
      // Set by the stage itself (back from an open window): the camera is
      // already flying there.
      if (Math.abs(scroll - scrollRef.current) < 1e-3) {
        return;
      }
      glideRef.current = null;
      scrollRef.current = scroll;
      camera.x.jump(getTimelineCamera(geometry, scroll).x);
      scrolledAtRef.current = performance.now();
      setAdrift(isBetweenWindows(geometry, scroll));
      setTimelineIndex(
        Math.round(clampScroll(scroll, geometry.maxScroll) / geometry.step)
      );
    };
    const handleWheel = (event: WheelEvent) => {
      // The wheel takes over from a glide, where it has got to.
      stopGlide();
      if (Math.abs(event.deltaX) <= Math.abs(event.deltaY)) {
        return;
      }
      // Also keeps a sideways swipe from going back in history.
      event.preventDefault();
      scroller.scrollBy({
        behavior:
          event.deltaMode === WheelEvent.DOM_DELTA_PIXEL ? "instant" : "smooth",
        top: getSidewaysDelta(event),
      });
    };
    scroller.addEventListener("scroll", handleScroll, { passive: true });
    scroller.addEventListener("wheel", handleWheel, { passive: false });
    return () => {
      scroller.removeEventListener("scroll", handleScroll);
      scroller.removeEventListener("wheel", handleWheel);
    };
  }, [camera, geometry, phase, stopGlide]);

  // The scroller's range follows the geometry; it keeps its place in the row.
  useLayoutEffect(() => {
    const scroller = scrollerRef.current;
    if (scroller) {
      scroller.scrollTop =
        clampScroll(scrollRef.current, geometry.maxScroll) *
        geometry.timelineScale;
    }
  }, [geometry]);

  /** The window under a pointer on the scroller, which covers them all. */
  const getPointerWindow = useCallback(
    (clientX: number, clientY: number) =>
      getWindowAt(
        geometry,
        { scale: camera.scale.get(), x: camera.x.get(), y: camera.y.get() },
        { x: clientX, y: clientY },
        WINDOW_COUNT
      ),
    [camera, geometry]
  );

  useEffect(() => {
    const timers = frameTimersRef.current;
    return () => {
      for (const timer of timers) {
        clearTimeout(timer);
      }
    };
  }, []);

  // Focus follows the camera: the close button while a version is open,
  // the window it came from back on the timeline. Stepping between open
  // versions keeps focus on the arrow pressed, unless it has run out.
  const wasOpenRef = useRef<boolean>(false);
  useEffect(() => {
    if (phase === "open") {
      const active = document.activeElement;
      const keepsFocus =
        wasOpenRef.current &&
        active instanceof HTMLButtonElement &&
        !active.disabled;
      if (!keepsFocus) {
        closeButtonRef.current?.focus({ preventScroll: true });
      }
    } else if (phase === "timeline") {
      buttonsRef.current[openIndex]?.focus({ preventScroll: true });
    }
    wasOpenRef.current = phase === "open";
  }, [phase, openIndex]);

  const mountFrame = useCallback((id: string) => {
    setMountedFrames((value) =>
      value.has(id) ? value : new Set(value).add(id)
    );
  }, []);

  const handleFrameLoad = useCallback((id: string) => {
    const timer = setTimeout(() => {
      frameTimersRef.current.delete(timer);
      setReadyFrames((value) =>
        value.has(id) ? value : new Set(value).add(id)
      );
    }, FRAME_SETTLE_MS);
    frameTimersRef.current.add(timer);
  }, []);

  const openVersion = useCallback(
    (index: number, version: PortfolioVersion) => {
      track(AnalyticsEvents.TIME_MACHINE_VERSION_OPEN, {
        version: version.id,
      });
      mountFrame(version.id);
      const timer = setTimeout(() => {
        frameTimersRef.current.delete(timer);
        setOpenedFrames((value) =>
          value.has(version.id) ? value : new Set(value).add(version.id)
        );
      }, FRAME_REVEAL_AFTER_OPEN_MS);
      frameTimersRef.current.add(timer);
      setOpenIndex(index);
      setPhase("open");
    },
    [mountFrame]
  );

  const showTimeline = useCallback(() => {
    // Back out with the window it left in the middle; the scroller follows
    // without moving the camera, which flies there.
    const scroll = clampScroll(openIndex * geometry.step, geometry.maxScroll);
    scrollRef.current = scroll;
    glideRef.current = null;
    if (scrollerRef.current) {
      scrollerRef.current.scrollTop = scroll * geometry.timelineScale;
    }
    setTimelineIndex(openIndex);
    setAdrift(false);
    setPhase("timeline");
  }, [geometry, openIndex]);

  const close = useCallback(() => setPhase("closing"), []);

  /** The open version's neighbour: -1 is newer (left), 1 older (right). */
  const getSibling = useCallback(
    (direction: -1 | 1) => {
      const index = openIndex + direction;
      const version = TIMELINE[index - 1];
      return version ? { index, version } : null;
    },
    [openIndex]
  );
  /**
   * Open, flies straight to the neighbouring version, still open. On the
   * timeline, glides to the neighbour of the window in the middle there (or
   * of the one a glide is already headed for).
   */
  const showSibling = useCallback(
    (direction: -1 | 1) => {
      if (phase === "timeline") {
        const index = Math.min(
          WINDOW_COUNT - 1,
          Math.max(0, getTimelineTarget() + direction)
        );
        // A step button that runs out under focus hands it to the other.
        const pressed = direction < 0 ? newerButtonRef : olderButtonRef;
        const other = direction < 0 ? olderButtonRef : newerButtonRef;
        const isEnd = index === 0 || index === WINDOW_COUNT - 1;
        if (isEnd && document.activeElement === pressed.current) {
          other.current?.focus({ preventScroll: true });
        }
        glideTo(index * geometry.step);
        return;
      }
      const sibling = getSibling(direction);
      if (sibling) {
        openVersion(sibling.index, sibling.version);
      }
    },
    [geometry, getSibling, getTimelineTarget, glideTo, openVersion, phase]
  );
  const showNewer = useCallback(() => showSibling(-1), [showSibling]);
  const showOlder = useCallback(() => showSibling(1), [showSibling]);
  // The scroller takes the timeline's pointer: a click on a window the
  // screen's edge cuts slides it to the middle; on one wholly in view it
  // opens it (the present closes). Empty space steps back.
  const handleScrollerClick = useCallback(
    (event: MouseEvent<HTMLDivElement>) => {
      const index = getPointerWindow(event.clientX, event.clientY);
      if (index === null) {
        close();
        return;
      }
      const view = {
        scale: camera.scale.get(),
        x: camera.x.get(),
        y: camera.y.get(),
      };
      if (!isWindowInView(geometry, view, index)) {
        glideTo(index * geometry.step);
        return;
      }
      const version = TIMELINE[index - 1];
      if (version) {
        openVersion(index, version);
      } else {
        close();
      }
    },
    [camera, close, geometry, getPointerWindow, glideTo, openVersion]
  );
  const phaseRef = useRef(phase);
  const keyboardIndexRef = useRef(keyboardIndex);
  /**
   * Lifts the window one click would open: the one under the pointer when it
   * lies wholly on screen (a cut-off one only slides to the middle, so it
   * stays down), or the one with keyboard focus. Rechecked as the camera
   * moves, since the row slides under a still pointer.
   */
  const updateLifts = useCallback(() => {
    let hovered: number | null = null;
    const pointer = pointerRef.current;
    clearTimeout(liftTimerRef.current);
    const sinceScroll = performance.now() - scrolledAtRef.current;
    if (sinceScroll < SCROLL_SETTLE_MS) {
      // Native scrolls stop without a last change: check back once they
      // have.
      liftTimerRef.current = setTimeout(
        updateLifts,
        SCROLL_SETTLE_MS - sinceScroll + 1
      );
    }
    const isMoving =
      sinceScroll < SCROLL_SETTLE_MS ||
      Math.abs(camera.x.getVelocity()) * camera.scale.get() >
        SETTLED_SPEED_PX ||
      Math.abs(camera.scale.getVelocity()) > SETTLED_ZOOM_SPEED;
    if (phaseRef.current === "timeline" && pointer && !isMoving) {
      const index = getPointerWindow(pointer.x, pointer.y);
      const view = {
        scale: camera.scale.get(),
        x: camera.x.get(),
        y: camera.y.get(),
      };
      if (index !== null && isWindowInView(geometry, view, index)) {
        hovered = index;
      }
    }
    const focused =
      phaseRef.current === "timeline" ? keyboardIndexRef.current : null;
    lifts.forEach((lift, index) => {
      let target = 0;
      if (index === hovered) {
        target = pressedRef.current ? PRESSED_LIFT : 1;
      } else if (index === focused) {
        target = 1;
      }
      if (liftTargetsRef.current[index] === target) {
        return;
      }
      liftTargetsRef.current[index] = target;
      if (reducedMotion) {
        lift.jump(target);
      } else {
        animate(lift, target, LIFT_SPRING);
      }
    });
  }, [camera, geometry, getPointerWindow, lifts, reducedMotion]);
  useEffect(() => {
    phaseRef.current = phase;
    keyboardIndexRef.current = keyboardIndex;
    updateLifts();
  }, [keyboardIndex, phase, updateLifts]);
  useEffect(() => {
    // An animation reports completion just before it lets go of the
    // value; check once it has.
    const settle = () => queueMicrotask(updateLifts);
    const unsubscribe = [
      camera.x.on("change", updateLifts),
      camera.scale.on("change", updateLifts),
      camera.x.on("animationComplete", settle),
      camera.scale.on("animationComplete", settle),
    ];
    return () => {
      for (const stop of unsubscribe) {
        stop();
      }
      clearTimeout(liftTimerRef.current);
    };
  }, [camera, updateLifts]);

  const handleScrollerPointerMove = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      pointerRef.current = { x: event.clientX, y: event.clientY };
      updateLifts();
      const index = getPointerWindow(event.clientX, event.clientY);
      event.currentTarget.style.cursor = index === null ? "" : "pointer";
    },
    [getPointerWindow, updateLifts]
  );
  const handleScrollerPointerLeave = useCallback(() => {
    pointerRef.current = null;
    pressedRef.current = false;
    updateLifts();
  }, [updateLifts]);
  const handleScrollerPointerDown = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      pressedRef.current = true;
      pointerRef.current = { x: event.clientX, y: event.clientY };
      updateLifts();
    },
    [updateLifts]
  );
  const handleScrollerPointerUp = useCallback(() => {
    pressedRef.current = false;
    updateLifts();
  }, [updateLifts]);

  /** Keyboard focus slides its window to the middle and lights its label. */
  const handleWindowFocus = useCallback(
    (index: number, event: FocusEvent<HTMLButtonElement>) => {
      if (!event.currentTarget.matches(":focus-visible")) {
        return;
      }
      setKeyboardIndex(index);
      glideTo(index * geometry.step);
    },
    [geometry, glideTo]
  );
  const handleWindowBlur = useCallback(() => setKeyboardIndex(null), []);
  const handlePresentFocus = useCallback(
    (event: FocusEvent<HTMLButtonElement>) => handleWindowFocus(0, event),
    [handleWindowFocus]
  );

  const registerButton = useCallback(
    (index: number, element: HTMLButtonElement | null) => {
      buttonsRef.current[index] = element;
    },
    []
  );
  const registerPresentButton = useCallback(
    (element: HTMLButtonElement | null) => registerButton(0, element),
    [registerButton]
  );
  const registerWindow = useCallback(
    (index: number, element: HTMLDivElement | null) => {
      windowsRef.current[index] = element;
    },
    []
  );
  const registerLabel = useCallback(
    (index: number, element: HTMLParagraphElement | null) => {
      labelsRef.current[index] = element;
    },
    []
  );
  const registerVeil = useCallback(
    (index: number, element: HTMLDivElement | null) => {
      veilsRef.current[index] = element;
    },
    []
  );
  const registerRim = useCallback(
    (index: number, element: SVGSVGElement | null) => {
      rimsRef.current[index] = element;
    },
    []
  );
  const registerPresentVeil = useCallback(
    (element: HTMLDivElement | null) => registerVeil(0, element),
    [registerVeil]
  );
  const registerPresentRim = useCallback(
    (element: SVGSVGElement | null) => registerRim(0, element),
    [registerRim]
  );
  const registerShadow = useCallback(
    (index: number, element: HTMLDivElement | null) => {
      shadowsRef.current[index] = element;
    },
    []
  );

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented) {
        return;
      }
      if (event.key === "Escape" && phase === "open") {
        event.preventDefault();
        showTimeline();
      } else if (
        phase === "open" &&
        (event.key === "ArrowLeft" || event.key === "ArrowRight")
      ) {
        event.preventDefault();
        showSibling(event.key === "ArrowRight" ? 1 : -1);
      } else if (event.key === "Escape" && phase === "timeline") {
        event.preventDefault();
        close();
      } else if (
        phase === "timeline" &&
        (event.key === "ArrowLeft" || event.key === "ArrowRight")
      ) {
        event.preventDefault();
        const next = Math.min(
          WINDOW_COUNT - 1,
          Math.max(
            0,
            getTimelineTarget() + (event.key === "ArrowRight" ? 1 : -1)
          )
        );
        buttonsRef.current[next]?.focus({ preventScroll: true });
        glideTo(next * geometry.step);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    close,
    geometry,
    getTimelineTarget,
    glideTo,
    phase,
    showSibling,
    showTimeline,
  ]);

  // Open, a version steps only to other versions; the present closes.
  const hasNewer =
    phase === "open" ? Boolean(getSibling(-1)) : timelineIndex > 0;
  const hasOlder =
    phase === "open"
      ? Boolean(getSibling(1))
      : timelineIndex < WINDOW_COUNT - 1;
  const stepsAway = phase === "timeline" && isAdrift;

  return (
    <div aria-label="Time machine" aria-modal="true" role="dialog">
      {/* Behind every window. Clicking empty space steps back, as Mission
          Control does; the inert canvas lets clicks through. */}
      <div
        aria-hidden
        className="fixed inset-0 z-0 bg-[#323235]"
        data-time-machine-backdrop=""
        onClick={phase === "open" ? showTimeline : close}
      >
        <div
          className="absolute inset-0 bg-[radial-gradient(120%_90%_at_50%_35%,#3b3b3e_0%,#1c1c1e_70%)]"
          ref={roomRef}
        />
      </div>

      {/* Under every window, above the backdrop: the deeper shadow a window
          casts as it lifts. Sized like a window and scaled with it, so the
          stage only moves and fades it. */}
      {Array.from({ length: WINDOW_COUNT }, (_, index) => (
        <LiftShadow
          index={index}
          key={TIMELINE[index - 1]?.id ?? "now"}
          register={registerShadow}
          size={geometry.window}
          timelineScale={geometry.timelineScale}
        />
      ))}

      {/* Scrolls the timeline natively; sized to the row in screen px. */}
      <div
        aria-hidden
        className="fixed inset-0 z-[3] [scrollbar-width:none] overflow-x-hidden overflow-y-auto overscroll-contain [&::-webkit-scrollbar]:hidden"
        data-time-machine-scroller=""
        onClick={handleScrollerClick}
        onPointerCancel={handleScrollerPointerUp}
        onPointerDown={handleScrollerPointerDown}
        onPointerLeave={handleScrollerPointerLeave}
        onPointerMove={handleScrollerPointerMove}
        onPointerUp={handleScrollerPointerUp}
        ref={scrollerRef}
        style={{ pointerEvents: phase === "timeline" ? "auto" : "none" }}
      >
        <div
          style={{
            height:
              viewport.height + geometry.maxScroll * geometry.timelineScale,
          }}
        />
      </div>

      <button
        aria-label="Back to the current portfolio"
        className="fixed top-0 left-0 z-[2] origin-top-left cursor-pointer focus-visible:outline-none"
        data-time-machine-current=""
        inert={phase !== "timeline"}
        onBlur={handleWindowBlur}
        onClick={close}
        onFocus={handlePresentFocus}
        ref={registerPresentButton}
        style={{ height: geometry.window.height, width: geometry.window.width }}
        type="button"
      >
        <WindowLight
          registerRim={registerPresentRim}
          registerVeil={registerPresentVeil}
          viewBox={`0 0 ${geometry.window.width} ${geometry.window.height}`}
        />
      </button>

      {TIMELINE.map((version, position) => (
        <VersionWindow
          hasFrame={mountedFrames.has(version.id)}
          index={position + 1}
          isFrameShown={
            readyFrames.has(version.id) && openedFrames.has(version.id)
          }
          isOpen={phase === "open" && openIndex === position + 1}
          isSelectable={phase === "timeline"}
          key={version.id}
          onBlur={handleWindowBlur}
          onFocus={handleWindowFocus}
          onFrameLoad={handleFrameLoad}
          onOpen={openVersion}
          registerButton={registerButton}
          registerRim={registerRim}
          registerVeil={registerVeil}
          registerWindow={registerWindow}
          size={geometry.window}
          version={version}
        />
      ))}

      {/* Over the windows and their labels, under the step buttons, which
          stay in the sharp middle. */}
      <DepthOfField
        geometry={geometry}
        leftRef={depthLeftRef}
        rightRef={depthRightRef}
      />

      {/* Labels sit outside the scaled windows, so text stays crisp. */}
      {Array.from({ length: WINDOW_COUNT }, (_, index) => {
        const version = TIMELINE[index - 1];
        const label = version
          ? formatVersionDate(version.date)
          : CURRENT_VERSION_LABEL;
        return (
          <WindowLabel
            index={index}
            isHighlighted={keyboardIndex === index}
            isShown={phase === "timeline"}
            key={version?.id ?? "now"}
            register={registerLabel}
          >
            {label}
          </WindowLabel>
        );
      })}

      {/* Newer and older: on the timeline they slide the row a window;
          open, they fly to the neighbouring version. The stage places them
          every frame. */}
      <div
        className="pointer-events-none fixed top-0 left-0 z-[5]"
        inert={phase === "closing" || stepsAway}
        ref={newerRef}
      >
        <button
          aria-label="Newer version"
          className={STEP_BUTTON_CLASS}
          data-away={stepsAway ? "" : undefined}
          disabled={!hasNewer}
          onClick={showNewer}
          ref={newerButtonRef}
          style={STEP_BUTTON_STYLE}
          type="button"
        >
          <CaretLeftIcon size={20} weight="bold" />
        </button>
      </div>
      <div
        className="pointer-events-none fixed top-0 left-0 z-[5]"
        inert={phase === "closing" || stepsAway}
        ref={olderRef}
      >
        <button
          aria-label="Older version"
          className={STEP_BUTTON_CLASS}
          data-away={stepsAway ? "" : undefined}
          disabled={!hasOlder}
          onClick={showOlder}
          ref={olderButtonRef}
          style={STEP_BUTTON_STYLE}
          type="button"
        >
          <CaretRightIcon size={20} weight="bold" />
        </button>
      </div>

      {/* Back to the timeline, only while a version is open: centred in the
          room below it. It sits behind every window (above the backdrop
          alone), so it can slide out from under the opening one. */}
      <div
        className="pointer-events-none fixed top-0 left-0 z-0"
        inert={phase !== "open"}
        ref={closeRef}
      >
        <button
          aria-label="Back to all versions"
          className={STEP_BUTTON_CLASS}
          onClick={showTimeline}
          ref={closeButtonRef}
          style={STEP_BUTTON_STYLE}
          type="button"
        >
          <XIcon size={20} weight="bold" />
        </button>
      </div>
    </div>
  );
};

interface WindowLabelProps {
  children: string;
  index: number;
  /** Its window's button has keyboard focus. */
  isHighlighted: boolean;
  isShown: boolean;
  register: (index: number, element: HTMLParagraphElement | null) => void;
}

/** A window's date under it; the stage moves it with the window. */
const WindowLabel = ({
  children,
  index,
  isHighlighted,
  isShown,
  register,
}: WindowLabelProps) => {
  const handleRef = useCallback(
    (element: HTMLParagraphElement | null) => register(index, element),
    [index, register]
  );
  return (
    <p
      aria-hidden
      className="pointer-events-none fixed top-0 left-0 z-[5] flex -translate-x-1/2 items-center justify-center whitespace-nowrap"
      ref={handleRef}
      style={{
        height: STEP_BUTTON_PX,
        opacity: isShown ? 1 : 0,
        transition: `opacity ${FADE_MS}ms ease`,
      }}
    >
      <span
        className={tw(
          "rounded-full px-2.5 py-0.5 text-sm font-medium transition-colors",
          isHighlighted && "bg-white text-black"
        )}
        // Brightens as its window lifts (`--lift`, written by the stage).
        style={
          isHighlighted
            ? undefined
            : { color: "rgb(255 255 255 / calc(0.75 + 0.25 * var(--lift, 0)))" }
        }
      >
        {children}
      </span>
    </p>
  );
};

interface VersionWindowProps {
  hasFrame: boolean;
  /** Position on the timeline; the present is 0. */
  index: number;
  /** Its page has loaded and its window has been opened. */
  isFrameShown: boolean;
  /** Open in front: its live page takes input. */
  isOpen: boolean;
  /** Clickable as a timeline window. */
  isSelectable: boolean;
  onBlur: () => void;
  onFocus: (index: number, event: FocusEvent<HTMLButtonElement>) => void;
  onFrameLoad: (id: string) => void;
  onOpen: (index: number, version: PortfolioVersion) => void;
  registerButton: (index: number, element: HTMLButtonElement | null) => void;
  registerRim: (index: number, element: SVGSVGElement | null) => void;
  registerVeil: (index: number, element: HTMLDivElement | null) => void;
  registerWindow: (index: number, element: HTMLDivElement | null) => void;
  /** The window's world size; the camera scales it. */
  size: Size;
  version: PortfolioVersion;
}

/**
 * An earlier version: its screenshot until its window has been opened and
 * its live page has loaded, then the page itself, over the screenshot. On
 * the timeline a button covers the page, so it takes no input until the
 * window opens. The stage writes its transform and
 * clip every frame.
 */
const VersionWindow = ({
  hasFrame,
  index,
  isFrameShown,
  isOpen,
  isSelectable,
  onBlur,
  onFocus,
  onFrameLoad,
  onOpen,
  registerButton,
  registerRim,
  registerVeil,
  registerWindow,
  size,
  version,
}: VersionWindowProps) => {
  const { id } = version;
  const frameRef = useRef<HTMLIFrameElement>(null);
  const handleOpen = useCallback(
    () => onOpen(index, version),
    [index, onOpen, version]
  );
  const handleFocus = useCallback(
    (event: FocusEvent<HTMLButtonElement>) => {
      onFocus(index, event);
    },
    [index, onFocus]
  );
  const handleButton = useCallback(
    (element: HTMLButtonElement | null) => registerButton(index, element),
    [registerButton, index]
  );
  const handleWindow = useCallback(
    (element: HTMLDivElement | null) => registerWindow(index, element),
    [registerWindow, index]
  );
  const handleVeil = useCallback(
    (element: HTMLDivElement | null) => registerVeil(index, element),
    [registerVeil, index]
  );
  const handleRim = useCallback(
    (element: SVGSVGElement | null) => registerRim(index, element),
    [registerRim, index]
  );

  useEffect(() => {
    const element = frameRef.current;
    if (!(element && hasFrame)) {
      return;
    }
    const handleLoad = () => onFrameLoad(id);
    element.addEventListener("load", handleLoad);
    return () => element.removeEventListener("load", handleLoad);
  }, [hasFrame, id, onFrameLoad]);

  return (
    <div
      className="fixed top-0 left-0 z-[2] origin-top-left bg-white will-change-transform"
      data-time-machine-window={id}
      ref={handleWindow}
      style={{ height: size.height, width: size.width }}
    >
      {/* Always under the page. Every version paints an opaque page, but a
          cross-origin frame can go a while without presenting one (seen
          after stepping onto a window that had sat off screen): the frame
          has no background of its own, so the screenshot shows there
          instead of a white window. */}
      <img
        alt=""
        className="pointer-events-none absolute inset-0 size-full object-cover object-[0_0] select-none"
        decoding="async"
        draggable={false}
        height={size.height}
        src={version.screenshot}
        width={size.width}
      />
      {hasFrame ? (
        <iframe
          className="absolute inset-0 size-full border-0 bg-transparent"
          inert={!isOpen}
          ref={frameRef}
          referrerPolicy="strict-origin-when-cross-origin"
          // No top navigation: an old page cannot replace this one.
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox allow-downloads"
          src={version.url}
          style={{
            opacity: isFrameShown ? 1 : 0,
            transition: "opacity 200ms ease",
          }}
          title={version.title}
        />
      ) : null}
      <WindowLight
        registerRim={handleRim}
        registerVeil={handleVeil}
        viewBox={`0 0 ${size.width} ${size.height}`}
      />
      {isOpen ? null : (
        <button
          aria-label={`Open the portfolio from ${formatVersionDate(version.date)}`}
          className="absolute inset-0 cursor-pointer focus-visible:outline-none"
          inert={!isSelectable}
          onBlur={onBlur}
          onClick={handleOpen}
          onFocus={handleFocus}
          ref={handleButton}
          type="button"
        />
      )}
    </div>
  );
};

interface WindowLightProps {
  registerRim: (element: SVGSVGElement | null) => void;
  registerVeil: (element: HTMLDivElement | null) => void;
  /** The rim's units: the window's world px, or the present's screen px. */
  viewBox?: string;
}

/**
 * A window's veil and rim of light, inside its clip. The stage fades the
 * veil out and the rim in as the window lifts; the rim's path is the
 * window's own squircle, stroked twice as wide as it shows, since the clip
 * takes its outer half.
 */
const WindowLight = ({
  registerRim,
  registerVeil,
  viewBox,
}: WindowLightProps) => (
  <>
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 bg-black opacity-0"
      data-time-machine-veil=""
      ref={registerVeil}
    />
    <svg
      aria-hidden
      className="pointer-events-none absolute inset-0 size-full opacity-0"
      preserveAspectRatio="none"
      ref={registerRim}
      viewBox={viewBox}
    >
      <path fill="none" stroke="white" />
    </svg>
  </>
);

interface LiftShadowProps {
  index: number;
  register: (index: number, element: HTMLDivElement | null) => void;
  /** The window's world size. */
  size: Size;
  timelineScale: number;
}

/**
 * The shadow a lifted window casts, drawn once at the timeline's zoom: the
 * stage only moves and fades it, so nothing re-blurs while it lifts.
 */
const LiftShadow = ({
  index,
  register,
  size,
  timelineScale,
}: LiftShadowProps) => {
  const handleRef = useCallback(
    (element: HTMLDivElement | null) => register(index, element),
    [index, register]
  );
  const unit = 1 / timelineScale;
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed top-0 left-0 z-0 origin-top-left opacity-0 will-change-transform"
      ref={handleRef}
      style={{
        borderRadius: WINDOW_RADIUS_PX * unit,
        boxShadow: `0 ${20 * unit}px ${56 * unit}px ${-6 * unit}px rgb(0 0 0 / 0.55)`,
        height: size.height,
        width: size.width,
      }}
    />
  );
};

interface DepthOfFieldProps {
  geometry: TimelineGeometry;
  leftRef: RefObject<HTMLDivElement | null>;
  rightRef: RefObject<HTMLDivElement | null>;
}

/**
 * The timeline's soft sides, from the screen's edges to the middle window's,
 * over the band its windows and labels rest in; the stage fades them.
 */
const DepthOfField = ({ geometry, leftRef, rightRef }: DepthOfFieldProps) => {
  const { timelineScale, viewport } = geometry;
  const windowHeight = geometry.window.height * timelineScale;
  // getTimelineCamera centres the row, labels included, a little high.
  const windowTop = (viewport.height - LABEL_SPACE_PX - windowHeight) / 2;
  const top = windowTop - DEPTH_BAND_MARGIN_PX;
  const height = windowHeight + LABEL_SPACE_PX + 2 * DEPTH_BAND_MARGIN_PX;
  const width = (viewport.width - geometry.window.width * timelineScale) / 2;
  return (
    <>
      {(["left", "right"] as const).map((side) => (
        <div
          aria-hidden
          className="pointer-events-none fixed z-[6]"
          data-time-machine-depth={side}
          key={side}
          ref={side === "left" ? leftRef : rightRef}
          style={{ [side]: 0, height, top, visibility: "hidden", width }}
        >
          {DEPTH_LAYERS.map(({ blur, fade, reach }) => {
            // Opaque from the screen's edge, easing out towards the middle.
            const towards = side === "left" ? "to right" : "to left";
            const mask = `linear-gradient(${towards}, black ${(reach - fade) * 100}%, transparent ${reach * 100}%)`;
            // Each layer composites on its own: Chrome squashed the three
            // overlapping masked backdrops into one layer and drew none.
            return (
              <div
                className="absolute inset-0 will-change-transform"
                key={blur}
                style={{
                  backdropFilter: `blur(${blur}px)`,
                  maskImage: mask,
                  WebkitBackdropFilter: `blur(${blur}px)`,
                  WebkitMaskImage: mask,
                }}
              />
            );
          })}
        </div>
      ))}
    </>
  );
};
