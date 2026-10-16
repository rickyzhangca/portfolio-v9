import { useReducedMotion } from "framer-motion";
import { Liquid } from "liquid-gooey";
import {
  type ComponentProps,
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";

import { tw } from "@/lib/utils";
import { GLASS_FILL, GLASS_SHADOW, GLASS_SHADOW_OPEN } from "./glass-tokens";
import { TIP_SPRING } from "./spring-css";
import { type ToolbarSide, toolbarGeometry } from "./toolbar-geometry";
import { useFluidHover } from "./use-fluid-hover";
import {
  useToolbarElevation,
  useToolbarMeasurements,
} from "./use-toolbar-measurements";

const TIP_ATTR = "data-toolbar-tip";
const TIP_VALUE_ATTR = "data-toolbar-value";
const TIP_SELECTOR = `[${TIP_ATTR}]`;
const TIP_OFFSET_PX = 8;
const TIP_DELAY_MS = 200;

interface ToolbarContextValue {
  closingValue: string | null;
  panelHost: HTMLDivElement | null;
  panelId: (value: string) => string;
  setActiveTriggerEl: (el: HTMLElement | null) => void;
  setListEl: (el: HTMLDivElement | null) => void;
  side: ToolbarSide;
  toggle: (value: string) => void;
  value: string | null;
}

const ToolbarContext = createContext<ToolbarContextValue | null>(null);

const useToolbar = () => {
  const context = useContext(ToolbarContext);
  if (!context) {
    throw new Error("Toolbar parts must be used within ToolbarRoot");
  }
  return context;
};

const isVertical = (side: ToolbarSide) => side === "left" || side === "right";

interface ToolbarRootProps {
  children?: ReactNode;
  className?: string;
  onValueChange: (value: string | null) => void;
  /** The side of the list that panels open on. */
  side: ToolbarSide;
  /** The open panel, or null. */
  value: string | null;
}

/**
 * A liquid toolbar: its groups share one goo surface and shadow, and a panel
 * morphs out of its trigger as a blob of the same liquid.
 */
export const ToolbarRoot = ({
  side,
  value,
  onValueChange,
  className,
  children,
}: ToolbarRootProps) => {
  const [lastValue, setLastValue] = useState(value);
  if (value !== null && value !== lastValue) {
    setLastValue(value);
  }

  const open = value !== null;
  const elevation = useToolbarElevation(open);
  const closingValue = elevation === "closing" ? lastValue : null;
  const wantBlob = open || elevation === "closing";

  const reduced = useReducedMotion() ?? false;
  const liquidRef = useRef<HTMLDivElement>(null);
  const [listEl, setListElState] = useState<HTMLDivElement | null>(null);
  const [activeTriggerEl, setActiveTriggerElState] =
    useState<HTMLElement | null>(null);
  const [panelHost, setPanelHost] = useState<HTMLDivElement | null>(null);

  const setListEl = useCallback((el: HTMLDivElement | null) => {
    setListElState((prev) => (prev === el ? prev : el));
  }, []);
  const setActiveTriggerEl = useCallback((el: HTMLElement | null) => {
    setActiveTriggerElState((prev) => (prev === el ? prev : el));
  }, []);

  const { trigger, panel, viewport, liquidKey, armed } = useToolbarMeasurements(
    {
      liquidRef,
      listEl,
      panelHost,
      showBlob: wantBlob,
      triggerEl: activeTriggerEl,
    }
  );

  const showBlob = wantBlob && trigger !== null;
  // A freshly mounted element has no previous style to transition from, so
  // the blob is committed collapsed on its trigger, that style is resolved,
  // and only then does it expand. Setting this flag during render (or before
  // the collapsed style is computed) made a cold open appear without motion.
  const blobRef = useRef<HTMLDivElement>(null);
  const [blobReady, setBlobReady] = useState(false);
  if (!showBlob && blobReady) {
    setBlobReady(false);
  }
  const panelMeasured = panel.w > 0 && panel.h > 0;
  useLayoutEffect(() => {
    if (!showBlob || blobReady || !panelMeasured) {
      return;
    }
    blobRef.current?.getBoundingClientRect();
    setBlobReady(true);
  }, [blobReady, panelMeasured, showBlob]);

  const expanded = reduced ? open : open && blobReady;
  const { spring, padLeft, padTop, padRight, padBottom, blobStyle, scrollY } =
    toolbarGeometry({
      armed: reduced || (armed && showBlob),
      open: expanded,
      panel,
      side,
      trigger,
      viewport,
    });

  const baseId = useId();
  const panelId = useCallback(
    (panelValue: string) => `${baseId}-${panelValue}`,
    [baseId]
  );
  const toggle = useCallback(
    (next: string) => onValueChange(next === value ? null : next),
    [onValueChange, value]
  );
  const context = useMemo<ToolbarContextValue>(
    () => ({
      closingValue,
      panelHost,
      panelId,
      setActiveTriggerEl,
      setListEl,
      side,
      toggle,
      value,
    }),
    [
      closingValue,
      panelHost,
      panelId,
      setActiveTriggerEl,
      setListEl,
      side,
      toggle,
      value,
    ]
  );

  // Escape closes the open panel from anywhere inside the toolbar.
  const rootRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const root = rootRef.current;
    if (!root || value === null) {
      return;
    }
    const handleKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key !== "Escape") {
        return;
      }
      event.stopPropagation();
      onValueChange(null);
      activeTriggerEl?.focus();
    };
    root.addEventListener("keydown", handleKeyDown);
    return () => root.removeEventListener("keydown", handleKeyDown);
  }, [activeTriggerEl, onValueChange, value]);

  const liquidStyle = useMemo(
    () => ({
      // Padding grows the goo canvas around the list; matching negative
      // margins keep the layout box at list size, so the bar does not move.
      boxSizing: "content-box" as const,
      marginBottom: -padBottom,
      marginLeft: -padLeft,
      marginRight: -padRight,
      marginTop: -padTop,
      paddingBottom: padBottom,
      paddingLeft: padLeft,
      paddingRight: padRight,
      paddingTop: padTop,
    }),
    [padBottom, padLeft, padRight, padTop]
  );

  return (
    <div
      className={tw(
        "relative isolate",
        elevation === "open" && "z-50",
        elevation === "closing" && "z-40",
        className
      )}
      data-slot="toolbar"
      ref={rootRef}
    >
      <ToolbarContext.Provider value={context}>
        <Liquid
          blur={4}
          className="pointer-events-none w-fit"
          contrast={40}
          fill={GLASS_FILL}
          filterPadding={48}
          key={liquidKey}
          ref={liquidRef}
          shadow={wantBlob ? GLASS_SHADOW_OPEN : GLASS_SHADOW}
          style={liquidStyle}
        >
          {children}
          {showBlob ? (
            <>
              <Liquid.Item observe>
                <div style={blobStyle} />
              </Liquid.Item>
              <div
                className="z-20 overflow-hidden"
                ref={blobRef}
                style={{ ...blobStyle, pointerEvents: open ? "auto" : "none" }}
              >
                <div
                  className={tw(
                    "absolute inset-0 overflow-x-hidden overscroll-contain",
                    scrollY ? "overflow-y-auto" : "overflow-y-hidden"
                  )}
                >
                  <div
                    className="w-max"
                    ref={setPanelHost}
                    style={{
                      opacity: open ? 1 : 0,
                      transition: reduced
                        ? "none"
                        : `opacity ${spring.duration}ms ${spring.easing}`,
                    }}
                  />
                </div>
              </div>
            </>
          ) : null}
        </Liquid>
      </ToolbarContext.Provider>
    </div>
  );
};

interface TipItem {
  label: string;
  value: string | null;
}

/** First hover waits `TIP_DELAY_MS`; moving to the next item updates at once. */
const useDelayedIndex = (activeIndex: number | null) => {
  const [armed, setArmed] = useState(false);
  if (activeIndex === null && armed) {
    setArmed(false);
  }
  useEffect(() => {
    if (activeIndex === null || armed) {
      return;
    }
    const timeout = setTimeout(() => setArmed(true), TIP_DELAY_MS);
    return () => clearTimeout(timeout);
  }, [activeIndex, armed]);
  return activeIndex !== null && armed ? activeIndex : null;
};

const tipTransform = (
  rect: { left: number; top: number; width: number; height: number },
  side: ToolbarSide
) => {
  switch (side) {
    case "right":
      return `translate(${rect.left + rect.width + TIP_OFFSET_PX}px, ${rect.top + rect.height / 2}px) translate(0%, -50%)`;
    case "left":
      return `translate(${rect.left - TIP_OFFSET_PX}px, ${rect.top + rect.height / 2}px) translate(-100%, -50%)`;
    case "bottom":
      return `translate(${rect.left + rect.width / 2}px, ${rect.top + rect.height + TIP_OFFSET_PX}px) translate(-50%, 0%)`;
    case "top":
      return `translate(${rect.left + rect.width / 2}px, ${rect.top - TIP_OFFSET_PX}px) translate(-50%, -100%)`;
    default:
      throw new Error("Unhandled toolbar side");
  }
};

/**
 * The buttons of a toolbar, with one tooltip that glides between them on the
 * panel side. Items opt in with a `data-toolbar-tip` label.
 */
export const ToolbarList = ({
  className,
  children,
  "aria-label": ariaLabel,
}: {
  "aria-label": string;
  children: ReactNode;
  className?: string;
}) => {
  const { side, setListEl, value, closingValue } = useToolbar();
  const listRef = useRef<HTMLDivElement | null>(null);
  const hover = useFluidHover(listRef, isVertical(side) ? "y" : "x");
  const { registerItem } = hover;
  const registeredRef = useRef<HTMLElement[]>([]);
  const [tips, setTips] = useState<TipItem[]>([]);
  const reduced = useReducedMotion() ?? false;

  const setRef = useCallback(
    (el: HTMLDivElement | null) => {
      listRef.current = el;
      setListEl(el);
    },
    [setListEl]
  );

  useLayoutEffect(() => {
    const list = listRef.current;
    if (!list) {
      return;
    }
    const sync = () => {
      const nodes = [...list.querySelectorAll<HTMLElement>(TIP_SELECTOR)];
      const prev = registeredRef.current;
      if (
        prev.length === nodes.length &&
        prev.every((el, index) => el === nodes[index])
      ) {
        return;
      }
      for (const index of prev.keys()) {
        registerItem(index, null);
      }
      for (const [index, el] of nodes.entries()) {
        registerItem(index, el);
      }
      registeredRef.current = nodes;
      setTips(
        nodes.map((el) => ({
          label: el.getAttribute(TIP_ATTR) ?? "",
          value: el.getAttribute(TIP_VALUE_ATTR),
        }))
      );
    };
    sync();
    const observer = new MutationObserver(sync);
    observer.observe(list, {
      attributeFilter: [TIP_ATTR, TIP_VALUE_ATTR],
      attributes: true,
      childList: true,
      subtree: true,
    });
    return () => observer.disconnect();
  }, [registerItem]);

  const tipIndex = useDelayedIndex(hover.activeIndex);
  const tip = tipIndex === null ? undefined : tips[tipIndex];
  const rect =
    tipIndex !== null && hover.isMeasured
      ? hover.itemRects[tipIndex]
      : undefined;
  // Tips open on the panel side, so they would sit on top of the blob while it
  // is open or still morphing back into its trigger.
  const hideForPanel = value !== null || closingValue !== null;

  return (
    // biome-ignore lint/a11y/noNoninteractiveElementInteractions: pointer tracking only moves the tooltip; the buttons handle input
    <div
      aria-label={ariaLabel}
      aria-orientation={isVertical(side) ? "vertical" : "horizontal"}
      className={tw(
        "pointer-events-auto relative z-50 flex w-fit items-stretch gap-3",
        isVertical(side) ? "flex-col" : "flex-row",
        className
      )}
      data-slot="toolbar-list"
      onMouseLeave={hover.onMouseLeave}
      onMouseMove={hover.onMouseMove}
      ref={setRef}
      role="toolbar"
    >
      {children}
      {rect && tip?.label && !hideForPanel ? (
        <div
          aria-hidden
          className="pointer-events-none absolute top-0 left-0 z-50 pointer-coarse:hidden whitespace-nowrap rounded-md bg-foreground1 px-2 py-1 text-[12px] text-background1 leading-none opacity-100 starting:opacity-0"
          data-slot="toolbar-tip"
          style={{
            transform: tipTransform(rect, side),
            transition: reduced
              ? "opacity 80ms linear"
              : `transform ${TIP_SPRING.duration}ms ${TIP_SPRING.easing}, opacity 80ms linear`,
          }}
        >
          {tip.label}
        </div>
      ) : null}
    </div>
  );
};

/** A pill of buttons; separate groups merge into one liquid where they meet. */
export const ToolbarGroup = ({
  className,
  children,
  ...props
}: ComponentProps<"div">) => {
  const { side } = useToolbar();
  return (
    <Liquid.Item className="pointer-events-auto inline-flex" observe>
      {/* biome-ignore lint/a11y/useSemanticElements: a fieldset cannot lay out as a flex pill in every browser */}
      <div
        className={tw(
          "relative isolate inline-flex w-fit items-stretch overflow-hidden rounded-full border border-white",
          isVertical(side) && "flex-col",
          className
        )}
        data-orientation={isVertical(side) ? "vertical" : "horizontal"}
        data-slot="toolbar-group"
        role="group"
        {...props}
      >
        {children}
      </div>
    </Liquid.Item>
  );
};

export const ToolbarSeparator = () => (
  <div
    aria-hidden
    className={tw(
      "relative my-1.5 w-px self-stretch bg-black/10 transition-opacity",
      "in-data-[orientation=vertical]:mx-1.5 in-data-[orientation=vertical]:my-0 in-data-[orientation=vertical]:h-px in-data-[orientation=vertical]:w-auto",
      // Hide beside a hovered, pressed or active button, whose pill covers it.
      "[[data-slot=toolbar-button]:hover+&]:opacity-0 [[data-slot=toolbar-button][data-active]+&]:opacity-0",
      "has-[+[data-slot=toolbar-button]:hover]:opacity-0 has-[+[data-slot=toolbar-button][data-active]]:opacity-0"
    )}
    data-slot="toolbar-separator"
  />
);

const buttonClassName = tw(
  "relative z-0 inline-flex pointer-coarse:size-11 size-10 shrink-0 items-center justify-center rounded-none text-foreground1 outline-none",
  "transition-[background-color,border-radius] duration-150",
  "hover:z-1 hover:rounded-full hover:not-active:bg-black/5",
  "active:z-1 active:rounded-full active:bg-black/8",
  "data-active:z-1 data-active:rounded-full data-active:bg-black/8",
  "focus-visible:z-1 focus-visible:rounded-full focus-visible:ring-2 focus-visible:ring-black/20 focus-visible:ring-inset",
  "disabled:pointer-events-none disabled:opacity-50",
  "[&_svg]:pointer-events-none [&_svg]:shrink-0"
);

interface ToolbarButtonProps
  extends Omit<ComponentProps<"button">, "aria-label" | "type"> {
  /** Highlights the button, e.g. a toggle that is on. */
  active?: boolean;
  /** Accessible name and tooltip. */
  label: string;
}

export const ToolbarButton = ({
  active,
  label,
  className,
  ...props
}: ToolbarButtonProps) => (
  <button
    aria-label={label}
    className={tw(buttonClassName, className)}
    data-active={active ? "" : undefined}
    data-slot="toolbar-button"
    {...{ [TIP_ATTR]: label }}
    type="button"
    {...props}
  />
);

interface ToolbarLinkProps extends Omit<ComponentProps<"a">, "aria-label"> {
  href: string;
  label: string;
}

export const ToolbarLink = ({
  href,
  label,
  className,
  ...props
}: ToolbarLinkProps) => (
  <a
    aria-label={label}
    className={tw(buttonClassName, className)}
    data-slot="toolbar-button"
    href={href}
    {...{ [TIP_ATTR]: label }}
    {...props}
  />
);

interface ToolbarTriggerProps
  extends Omit<ToolbarButtonProps, "active" | "onClick"> {
  /** The panel this button opens. */
  value: string;
}

/** Opens and closes the panel with the same `value`. */
export const ToolbarTrigger = ({ value, ...props }: ToolbarTriggerProps) => {
  const { value: selected, toggle, setActiveTriggerEl, panelId } = useToolbar();
  const ref = useRef<HTMLButtonElement>(null);
  const isOpen = selected === value;
  useLayoutEffect(() => {
    if (isOpen) {
      setActiveTriggerEl(ref.current);
    }
  }, [isOpen, setActiveTriggerEl]);
  const handleClick = useCallback(() => toggle(value), [toggle, value]);
  return (
    <ToolbarButton
      active={isOpen}
      aria-controls={isOpen ? panelId(value) : undefined}
      aria-expanded={isOpen}
      onClick={handleClick}
      ref={ref}
      {...{ [TIP_VALUE_ATTR]: value }}
      {...props}
    />
  );
};

interface ToolbarPanelProps {
  children: ReactNode;
  className?: string;
  label: string;
  value: string;
}

/** Content of the blob that opens from the trigger with the same `value`. */
export const ToolbarPanel = ({
  value,
  label,
  className,
  children,
}: ToolbarPanelProps) => {
  const { panelHost, closingValue, value: selected, panelId } = useToolbar();
  const active = selected === value || closingValue === value;
  if (!(panelHost && active)) {
    return null;
  }
  return createPortal(
    <section
      aria-label={label}
      className={tw("block w-max min-w-44 text-foreground1 text-sm", className)}
      data-slot="toolbar-panel"
      id={panelId(value)}
    >
      {children}
    </section>,
    panelHost
  );
};
