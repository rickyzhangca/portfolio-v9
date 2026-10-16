import type { CSSProperties } from "react";
import { CLOSE_SPRING, OPEN_SPRING } from "./spring-css";

/** The side of the list a panel opens on. */
export type ToolbarSide = "top" | "bottom" | "left" | "right";

export interface ToolbarRect {
  height: number;
  left: number;
  top: number;
  width: number;
}

export interface ToolbarSize {
  h: number;
  w: number;
}

/** List position and the visible viewport, in screen pixels. */
export interface ToolbarViewport {
  listH: number;
  listLeft: number;
  listTop: number;
  listW: number;
  viewH: number;
  viewW: number;
}

const TRIGGER_PX = 40;
const PANEL_GAP_PX = 10;
const OPEN_RADIUS_PX = 24;
const PANEL_SLACK_PX = 16;
/** Keep the blob this far inside the screen. */
export const VIEWPORT_PAD_PX = 16;
/**
 * Fixed goo canvas, large enough for every panel, so panel resizes never
 * remount Liquid (that would drop the blob's CSS transition).
 */
const PAD_RESERVE_W = 320;
const PAD_RESERVE_H = 680;
const EASE_RADIUS = "cubic-bezier(0.22, 1, 0.36, 1)";

export interface ToolbarGeometryInput {
  armed: boolean;
  open: boolean;
  panel: ToolbarSize;
  side: ToolbarSide;
  trigger: ToolbarRect | null;
  viewport: ToolbarViewport | null;
}

/** Panel top-left in list space: beside the active trigger, centered on it. */
const panelOrigin = (
  side: ToolbarSide,
  trigger: ToolbarRect,
  panel: ToolbarSize
) => {
  const cx = trigger.left + (trigger.width - panel.w) / 2;
  const cy = trigger.top + (trigger.height - panel.h) / 2;
  switch (side) {
    case "top":
      return { left: cx, top: trigger.top - PANEL_GAP_PX - panel.h };
    case "bottom":
      return { left: cx, top: trigger.top + trigger.height + PANEL_GAP_PX };
    case "left":
      return { left: trigger.left - PANEL_GAP_PX - panel.w, top: cy };
    case "right":
      return { left: trigger.left + trigger.width + PANEL_GAP_PX, top: cy };
    default:
      throw new Error("Unhandled toolbar side");
  }
};

/** Shift and cap a list-space box so it stays on-screen with `VIEWPORT_PAD_PX`. */
export const clampPanelToViewport = (
  origin: { left: number; top: number },
  panel: ToolbarSize,
  vp: ToolbarViewport
): { left: number; top: number; w: number; h: number } => {
  const minX = VIEWPORT_PAD_PX - vp.listLeft;
  const minY = VIEWPORT_PAD_PX - vp.listTop;
  const maxX = vp.viewW - VIEWPORT_PAD_PX - vp.listLeft;
  const maxY = vp.viewH - VIEWPORT_PAD_PX - vp.listTop;
  const w = Math.min(panel.w, Math.max(0, maxX - minX));
  const h = Math.min(panel.h, Math.max(0, maxY - minY));
  return {
    h,
    left: Math.min(Math.max(origin.left, minX), maxX - w),
    top: Math.min(Math.max(origin.top, minY), maxY - h),
    w,
  };
};

const sidePads = (
  side: ToolbarSide,
  reach: { left: number; top: number; right: number; bottom: number }
) => {
  const slack = PANEL_SLACK_PX;
  const alongW = PANEL_GAP_PX + PAD_RESERVE_W + slack;
  const alongH = PANEL_GAP_PX + PAD_RESERVE_H + slack;
  const halfW = PAD_RESERVE_W / 2 + slack;
  const halfH = PAD_RESERVE_H / 2 + slack;
  switch (side) {
    case "right":
      return {
        padBottom: Math.max(halfH, reach.bottom),
        padLeft: Math.max(slack, reach.left),
        padRight: Math.max(alongW, reach.right),
        padTop: Math.max(halfH, reach.top),
      };
    case "left":
      return {
        padBottom: Math.max(halfH, reach.bottom),
        padLeft: Math.max(alongW, reach.left),
        padRight: Math.max(slack, reach.right),
        padTop: Math.max(halfH, reach.top),
      };
    case "bottom":
      return {
        padBottom: Math.max(alongH, reach.bottom),
        padLeft: Math.max(halfW, reach.left),
        padRight: Math.max(halfW, reach.right),
        padTop: Math.max(slack, reach.top),
      };
    case "top":
      return {
        padBottom: Math.max(slack, reach.bottom),
        padLeft: Math.max(halfW, reach.left),
        padRight: Math.max(halfW, reach.right),
        padTop: Math.max(alongH, reach.top),
      };
    default:
      throw new Error("Unhandled toolbar side");
  }
};

/**
 * Liquid padding that covers a centered panel beside any trigger on `side`,
 * plus room for a panel the viewport clamp shifts. Independent of the active
 * panel, so content changes cannot re-baseline the cluster. Always reserved
 * (even closed): liquid-gooey's SVG filter is born at its first size and does
 * not follow later padding growth.
 *
 * The reach toward each screen edge is capped at the reserve, because a panel
 * never extends further than that from the list; an uncapped reach would
 * stretch the filter across the whole viewport.
 */
export const canvasPads = (side: ToolbarSide, vp: ToolbarViewport | null) => {
  const slack = PANEL_SLACK_PX;
  if (!vp) {
    return sidePads(side, { bottom: 0, left: 0, right: 0, top: 0 });
  }
  const reach = (distance: number, extent: number) =>
    Math.min(Math.max(0, distance), extent) + slack;
  return sidePads(side, {
    bottom: reach(
      vp.viewH - VIEWPORT_PAD_PX - vp.listTop - vp.listH,
      PAD_RESERVE_H
    ),
    left: reach(vp.listLeft - VIEWPORT_PAD_PX, PAD_RESERVE_W),
    right: reach(
      vp.viewW - VIEWPORT_PAD_PX - vp.listLeft - vp.listW,
      PAD_RESERVE_W
    ),
    top: reach(vp.listTop - VIEWPORT_PAD_PX, PAD_RESERVE_H),
  });
};

/** Liquid padding plus the panel blob that morphs out of the active trigger. */
export const toolbarGeometry = (input: ToolbarGeometryInput) => {
  const { open, side, armed, trigger, panel, viewport } = input;
  const spring = open ? OPEN_SPRING : CLOSE_SPRING;
  const tw = trigger?.width || TRIGGER_PX;
  const th = trigger?.height || TRIGGER_PX;
  const tLeft = trigger?.left ?? 0;
  const tTop = trigger?.top ?? 0;
  const pw = panel.w > 0 ? panel.w : tw;
  const ph = panel.h > 0 ? panel.h : th;
  const origin = panelOrigin(
    side,
    { height: th, left: tLeft, top: tTop, width: tw },
    { h: ph, w: pw }
  );
  const placed =
    viewport && viewport.viewW > 0 && viewport.viewH > 0
      ? clampPanelToViewport(origin, { h: ph, w: pw }, viewport)
      : { h: ph, left: origin.left, top: origin.top, w: pw };
  const { padLeft, padTop, padRight, padBottom } = canvasPads(side, viewport);

  const blobStyle: CSSProperties = {
    borderRadius: open ? OPEN_RADIUS_PX : Math.min(tw, th) / 2,
    height: open ? placed.h : th,
    left: (open ? placed.left : tLeft) + padLeft,
    position: "absolute",
    top: (open ? placed.top : tTop) + padTop,
    transition: armed
      ? [
          `left ${spring.duration}ms ${spring.easing}`,
          `top ${spring.duration}ms ${spring.easing}`,
          `width ${spring.duration}ms ${spring.easing}`,
          `height ${spring.duration}ms ${spring.easing}`,
          `border-radius ${spring.duration}ms ${EASE_RADIUS}`,
        ].join(", ")
      : "none",
    width: open ? placed.w : tw,
  };

  return {
    blobStyle,
    padBottom,
    padLeft,
    padRight,
    padTop,
    scrollY: open && placed.h < ph,
    spring,
  };
};
