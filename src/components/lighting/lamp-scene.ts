import { subscribeLamp, wakeLamp } from "./desk-lamp";
import {
  LAMP_CONTACT_ATTRIBUTE,
  LAMP_DEPTH_ATTRIBUTE,
  LAMP_SHADOW_ATTRIBUTE,
} from "./lamp-shadows";

// Lamp filters, sheens and sprite canvases must not wake their own loop.
const GEOMETRY_PROPERTIES = [
  "transform",
  "translate",
  "rotate",
  "scale",
  "width",
  "height",
  "left",
  "top",
  "display",
  "visibility",
  "opacity",
] as const;

const geometryStyle = (element: HTMLElement | SVGElement) =>
  GEOMETRY_PROPERTIES.map((property) => element.style[property]).join(";");

/** Wake for React/Motion changes, media layout, and compositor animations. */
export const watchLampScene = (root: HTMLElement) => {
  const styles = new WeakMap<Element, string>();
  const resize = new ResizeObserver(wakeLamp);
  const remember = (element: Element) => {
    if (
      !(element instanceof HTMLElement || element instanceof SVGElement) ||
      element instanceof HTMLCanvasElement
    ) {
      return;
    }
    styles.set(element, geometryStyle(element));
    if (element.hasAttribute(LAMP_SHADOW_ATTRIBUTE)) {
      resize.observe(element);
    }
  };
  remember(root);
  for (const element of root.querySelectorAll("*")) {
    remember(element);
  }
  resize.observe(root);
  const changes = new MutationObserver((records) => {
    let changed = false;
    for (const record of records) {
      const element = record.target;
      if (element instanceof HTMLCanvasElement) {
        continue;
      }
      if (
        record.attributeName === "style" &&
        (element instanceof HTMLElement || element instanceof SVGElement)
      ) {
        const next = geometryStyle(element);
        changed ||= styles.get(element) !== next;
        styles.set(element, next);
      } else {
        changed = true;
      }
      if (
        record.attributeName === LAMP_SHADOW_ATTRIBUTE &&
        element instanceof Element
      ) {
        if (element.hasAttribute(LAMP_SHADOW_ATTRIBUTE)) {
          resize.observe(element);
        } else {
          resize.unobserve(element);
        }
      }
      for (const node of record.addedNodes) {
        if (node instanceof Element) {
          remember(node);
          for (const child of node.querySelectorAll("*")) {
            remember(child);
          }
        }
      }
      for (const node of record.removedNodes) {
        if (node instanceof Element) {
          resize.unobserve(node);
          for (const child of node.querySelectorAll(
            `[${LAMP_SHADOW_ATTRIBUTE}]`
          )) {
            resize.unobserve(child);
          }
        }
      }
    }
    if (changed) {
      wakeLamp();
    }
  });
  changes.observe(root, {
    attributeFilter: [
      "style",
      "class",
      LAMP_SHADOW_ATTRIBUTE,
      LAMP_CONTACT_ATTRIBUTE,
      LAMP_DEPTH_ATTRIBUTE,
    ],
    attributes: true,
    characterData: true,
    childList: true,
    subtree: true,
  });
  root.addEventListener("load", wakeLamp, true);
  root.addEventListener("animationstart", wakeLamp, true);
  root.addEventListener("transitionrun", wakeLamp, true);
  const stop = subscribeLamp(() => {
    if (
      root
        .getAnimations({ subtree: true })
        .some(
          (animation) => animation.playState === "running" || animation.pending
        )
    ) {
      wakeLamp();
    }
  });
  return () => {
    stop();
    changes.disconnect();
    resize.disconnect();
    root.removeEventListener("load", wakeLamp, true);
    root.removeEventListener("animationstart", wakeLamp, true);
    root.removeEventListener("transitionrun", wakeLamp, true);
  };
};
