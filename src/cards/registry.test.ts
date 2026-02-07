import { describe, expect, it } from "vitest";
import {
  CARD_REGISTRY,
  getCardKinds,
  getInteractionPolicy,
  isCardKind,
} from "./registry";
import { RenderCard } from "./render-card";

describe("Card Registry Contract", () => {
  it("has consistent card kinds between CARD_REGISTRY and isCardKind", () => {
    // Get all registered kinds using the exported function
    const registeredKinds = getCardKinds();

    // Each registered kind should pass isCardKind
    for (const kind of registeredKinds) {
      expect(isCardKind(kind)).toBe(true);
    }

    // Non-registered kinds should fail isCardKind
    expect(isCardKind("invalid")).toBe(false);
    expect(isCardKind("unknown")).toBe(false);
  });

  it("has valid interaction policies for all card kinds", () => {
    const registeredKinds = getCardKinds();

    for (const kind of registeredKinds) {
      const policy = getInteractionPolicy(kind);

      // Policy should have required fields
      expect(policy).toHaveProperty("activate");
      expect(policy).toHaveProperty("drag");

      // Activate should be one of valid values
      expect(["none", "open-modal", "toggle-focus"]).toContain(policy.activate);

      // Drag should be one of valid values
      expect(["full", "handle", "none"]).toContain(policy.drag);
    }
  });

  it("has consistent activation types for card categories", () => {
    // Resume and About should open modal
    expect(getInteractionPolicy("resume").activate).toBe("open-modal");
    expect(getInteractionPolicy("about").activate).toBe("open-modal");

    // Macbook should toggle focus
    expect(getInteractionPolicy("macbook").activate).toBe("toggle-focus");
    expect(getInteractionPolicy("macbook").focusScale).toBe(2);

    // Others should have no activation
    expect(getInteractionPolicy("cover").activate).toBe("none");
    expect(getInteractionPolicy("project").activate).toBe("none");
    expect(getInteractionPolicy("email").activate).toBe("none");
    expect(getInteractionPolicy("socials").activate).toBe("none");
    expect(getInteractionPolicy("stickynote").activate).toBe("none");
    expect(getInteractionPolicy("profilepic").activate).toBe("none");
    expect(getInteractionPolicy("funproject").activate).toBe("none");
    expect(getInteractionPolicy("swagcover").activate).toBe("none");
  });

  it("has full drag policy for all draggable cards", () => {
    const fullDragKinds = [
      "cover",
      "project",
      "resume",
      "about",
      "email",
      "socials",
      "stickynote",
      "profilepic",
      "macbook",
      "funproject",
      "swagcover",
    ] as const;

    for (const kind of fullDragKinds) {
      const policy = getInteractionPolicy(kind);
      expect(policy.drag).toBe("full");
    }
  });
});

describe("Card Renderer Contract", () => {
  it("RenderCard is exported as a memoized component", () => {
    // RenderCard should be the memoized component
    expect(RenderCard).toBeDefined();
    expect(typeof RenderCard).toBe("object");
  });

  it("all card kinds have entries in CARD_REGISTRY", () => {
    const expectedKinds = [
      "cover",
      "project",
      "resume",
      "about",
      "email",
      "socials",
      "stickynote",
      "profilepic",
      "macbook",
      "funproject",
      "swagcover",
    ];

    for (const kind of expectedKinds) {
      expect(CARD_REGISTRY).toHaveProperty(kind);
    }
  });
});
