import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { createStore, Provider } from "jotai";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { FunProjectCardContent } from "@/cards/types";
import { LAMP_LIFT } from "@/components/lighting/lamp-shadows";
import { deskLampAtom } from "@/context/atoms";
import { FunProjectCard } from "./fun-project-card";

interface LitKeycapsProps {
  lifts: ReadonlyMap<number, { y: number }>;
  loadCaps: () => Promise<unknown>;
  items: readonly { title: string }[];
  onReady: () => void;
}

const litKeycaps = vi.hoisted(() => ({
  props: null as LitKeycapsProps | null,
}));

// WebGPU is not available here; the stand-in reports its props instead.
vi.mock("@/components/lighting/lit-keycaps", () => ({
  LitKeycaps: (props: LitKeycapsProps) => {
    litKeycaps.props = props;
    return <canvas data-testid="lit-keycaps" />;
  },
}));

const content: FunProjectCardContent = {
  items: [
    {
      description: "First",
      icon: "first.webp",
      status: "Active",
      title: "First project",
    },
    {
      description: "Second",
      icon: "second.webp",
      status: "Archived",
      title: "Second project",
    },
  ],
};

const PX_VALUE = /px$/;

const keycapContent: FunProjectCardContent = {
  ...content,
  loadKeycaps: () =>
    Promise.resolve(
      Object.fromEntries(
        content.items.map((item) => [
          item.title,
          { body: ["#f2f2f2", "#f2f2f2"], glyph: `${item.title}.webp` },
        ])
      )
    ),
};

const renderCard = (isLampOn: boolean, cardContent = content) => {
  const store = createStore();
  store.set(deskLampAtom, isLampOn);
  return render(
    <Provider store={store}>
      <FunProjectCard content={cardContent} />
    </Provider>
  );
};

// The icon's tile: the element that casts the lamp's shadow.
const getTile = (title: string) =>
  screen.getByAltText(title).parentElement?.parentElement as HTMLElement;

describe("FunProjectCard", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    litKeycaps.props = null;
  });

  it("keeps the fixed icon shadows and no lamp layers without the lamp", () => {
    const { container } = renderCard(false);

    expect(container.querySelector("[data-lamp-shadow]")).toBeNull();
    expect(container.querySelector("[data-lamp-sheen]")).toBeNull();
    expect(
      screen.getByAltText("First project").parentElement?.style.filter
    ).toContain("drop-shadow");
  });

  it("casts one lamp shadow per icon instead of the fixed one", () => {
    const { container } = renderCard(true);

    for (const title of ["First project", "Second project"]) {
      expect(getTile(title).getAttribute("data-lamp-shadow")).toBe(
        String(LAMP_LIFT.keycap)
      );
      expect(screen.getByAltText(title).parentElement?.style.filter).toBe("");
    }
    expect(container.querySelectorAll("[data-lamp-sheen]")).toHaveLength(2);
  });

  it("lifts icons where they are now, after the camera has moved them", async () => {
    const { container } = renderCard(true);
    // Mounted at the origin, then panned away, as the canvas camera does.
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue(
      new DOMRect(400, 400, 60, 60)
    );

    fireEvent.pointerMove(container.firstElementChild as HTMLElement, {
      clientX: 430,
      clientY: 430,
    });

    await waitFor(() => {
      expect(
        Number(getTile("First project").getAttribute("data-lamp-shadow"))
      ).toBeGreaterThan(LAMP_LIFT.keycap);
    });
  });

  it("points each icon's glint at the lamp", async () => {
    const { container } = renderCard(true);
    const sheen = container.querySelector<HTMLElement>("[data-lamp-sheen]");

    await waitFor(() => {
      expect(sheen?.style.getPropertyValue("--sheen-x")).toMatch(PX_VALUE);
    });
    expect(sheen?.style.getPropertyValue("--sheen-y")).toMatch(PX_VALUE);
    expect(Number(sheen?.style.getPropertyValue("--sheen"))).toBeGreaterThan(0);
  });

  it("keeps the pictures when the icons have no keycaps", async () => {
    renderCard(true);

    // The last icon has had time to pop onto the card.
    await new Promise((resolve) => setTimeout(resolve, 1500));
    expect(screen.queryByTestId("lit-keycaps")).toBeNull();
  });

  it("hands the icons to the lit keycaps once they have landed and drawn", async () => {
    const { container } = renderCard(true, keycapContent);

    await screen.findByTestId("lit-keycaps", undefined, { timeout: 3000 });
    expect(litKeycaps.props?.items).toBe(keycapContent.items);
    expect(litKeycaps.props?.loadCaps).toBe(keycapContent.loadKeycaps);
    // Until the caps are drawn, the pictures and their shadows stay.
    expect(container.querySelectorAll("[data-lamp-shadow]")).toHaveLength(2);

    act(() => {
      litKeycaps.props?.onReady();
    });

    expect(container.querySelector("[data-lamp-shadow]")).toBeNull();
    expect(container.querySelector("[data-lamp-sheen]")).toBeNull();
    expect(screen.getByAltText("First project").className).toContain(
      "opacity-0"
    );
  });

  it("passes each icon's lift to the lit keycaps", async () => {
    const { container } = renderCard(true, keycapContent);
    await screen.findByTestId("lit-keycaps", undefined, { timeout: 3000 });

    fireEvent.pointerMove(container.firstElementChild as HTMLElement, {
      clientX: 0,
      clientY: 0,
    });

    await waitFor(() => {
      expect(litKeycaps.props?.lifts.get(0)?.y).toBeLessThan(0);
    });
  });
});
