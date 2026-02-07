// Event names constants
export const AnalyticsEvents = {
  EMAIL_COPY: "email_copy",
  EMAIL_OPEN: "email_open",
  PROJECT_LINK_CLICK: "project_link_click",
  SOCIAL_LINK_CLICK: "social_link_click",
  SOCIALS_TOGGLE: "socials_toggle",
  RESUME_VIEW: "resume_view",
  ABOUT_VIEW: "about_view",
  MODAL_CLOSE: "modal_close",
  STACK_EXPAND: "stack_expand",
  STACK_CLOSE: "stack_close",
  CANVAS_VIEW_RESET: "canvas_view_reset",
  CANVAS_POSITION_RESET: "canvas_position_reset",
  CANVAS_REARRANGEMENT: "canvas_rearrangement",
  MACBOOK_ZOOM: "macbook_zoom",
  KEYBOARD_ESCAPE: "keyboard_escape",
} as const;

// Extract event name value type
type AnalyticsEventName =
  (typeof AnalyticsEvents)[keyof typeof AnalyticsEvents];

// Type-safe properties for each event
export interface AnalyticsEventProperties {
  email_copy?: { success: boolean };
  email_open?: { method: "mailto" };
  project_link_click?: {
    company: string;
    project_name: string;
    link_type?: string;
  };
  social_link_click?: { platform: "linkedin" | "twitter" };
  socials_toggle?: { mode: "apple" | "linkedin" };
  resume_view?: Record<string, never>;
  about_view?: Record<string, never>;
  modal_close?: {
    modal_type: "resume" | "about";
    close_method: "button" | "outside_click" | "keyboard";
  };
  stack_expand?: { stack_type: string; item_count: number };
  stack_close?: {
    stack_type: string;
    close_method: "keyboard" | "outside_click";
  };
  canvas_view_reset?: { zoom_level: number };
  canvas_position_reset?: Record<string, never>;
  canvas_rearrangement?: { items_moved: number };
  macbook_zoom?: { direction: "in" | "out" };
  keyboard_escape?: { context: "modal" | "stack" | "macbook" };
}

// Safe tracking wrapper
export const track = (
  eventName: AnalyticsEventName,
  properties?: Record<string, unknown>
) => {
  if (typeof window === "undefined") {
    return;
  }

  const umami = (
    window as unknown as {
      umami?: { track: (e: string, p?: Record<string, unknown>) => void };
    }
  ).umami;

  if (umami) {
    umami.track(eventName, properties);
  }
};
