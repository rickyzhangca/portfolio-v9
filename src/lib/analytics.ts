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
  STREETMAP_TOGGLE: "streetmap_toggle",
  KEYBOARD_ESCAPE: "keyboard_escape",
  TIME_MACHINE_OPEN: "time_machine_open",
  TIME_MACHINE_VERSION_OPEN: "time_machine_version_open",
} as const;

// Extract event name value type
type AnalyticsEventName =
  (typeof AnalyticsEvents)[keyof typeof AnalyticsEvents];

// Type-safe properties for each event
interface AnalyticsEventProperties {
  email_copy: { success: boolean };
  email_open: { method: "mailto" };
  project_link_click: {
    company: string;
    project_name: string;
    link_type?: string;
  };
  social_link_click: { platform: "linkedin" | "twitter" };
  socials_toggle: { mode: "apple" | "linkedin" };
  resume_view: Record<string, never>;
  about_view: Record<string, never>;
  modal_close: {
    modal_type: "resume" | "about";
    close_method: "button" | "outside_click" | "keyboard";
  };
  stack_expand: { stack_type: string; item_count: number };
  stack_close: {
    stack_type: string | null;
    close_method: "close_button" | "keyboard" | "outside_click";
  };
  canvas_view_reset: { zoom_level: number };
  canvas_position_reset: Record<string, never>;
  canvas_rearrangement: { items_moved: number };
  macbook_zoom: { direction: "in" | "out" };
  streetmap_toggle: { direction: "open" | "close" };
  keyboard_escape: {
    context: "modal" | "stack" | "macbook" | "streetmap";
  };
  time_machine_open: Record<string, never>;
  time_machine_version_open: { version: string };
}

// Safe tracking wrapper
export const track = <E extends AnalyticsEventName>(
  eventName: E,
  properties?: AnalyticsEventProperties[E]
) => {
  if (typeof window === "undefined") {
    return;
  }

  const { umami } = window as unknown as {
    umami?: { track: (e: string, p?: Record<string, unknown>) => void };
  };

  if (umami) {
    umami.track(eventName, properties);
  }
};
