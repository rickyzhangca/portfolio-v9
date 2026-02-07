import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import {
  createMockFunStack,
  renderWithProviders,
} from "@/test-utils/test-helpers";
import { FunProjectGroup } from "./fun-project-group";

const baseProps = {
  scale: 1,
  dragDisabled: false,
  repulsionOffset: { x: 0, y: 0 },
  onBringToFront: vi.fn(),
  onToggleExpanded: vi.fn(),
  onPositionUpdate: vi.fn(),
  onDragStart: vi.fn(),
  onDragEnd: vi.fn(),
  onCardHeightMeasured: vi.fn(),
};

describe("FunProjectGroup", () => {
  it("does not mount detail cards while collapsed", () => {
    const item = createMockFunStack("fun-1", 0, 0);

    renderWithProviders(
      <FunProjectGroup {...baseProps} isExpanded={false} item={item} />
    );

    expect(screen.queryByText("Test Project")).toBeNull();
  });

  it("mounts detail cards when expanded", () => {
    const item = createMockFunStack("fun-1", 0, 0);

    renderWithProviders(
      <FunProjectGroup {...baseProps} isExpanded={true} item={item} />
    );

    expect(screen.getByText("Test Project")).not.toBeNull();
  });
});
