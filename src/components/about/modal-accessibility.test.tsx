import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useCallback, useState } from "react";
import { createPortal } from "react-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { resumeData } from "@/cards/resume/resume-data";
import { AboutModal } from "@/components/about/about-modal";
import { ReaderShell } from "@/components/documents/reader-shell";
import { ResumeModal } from "@/components/resume/resume-modal";
import { useModalAccessibility } from "@/components/use-modal-accessibility";

const ModalPair = () => {
  const [isAboutOpen, setIsAboutOpen] = useState(true);
  const [isResumeOpen, setIsResumeOpen] = useState(true);
  const closeAbout = useCallback(() => setIsAboutOpen(false), []);
  const closeResume = useCallback(() => setIsResumeOpen(false), []);

  return (
    <ReaderShell isOpen={isAboutOpen} onClose={closeAbout} title="About Ricky">
      <ResumeModal
        data={resumeData}
        isOpen={isResumeOpen}
        onClose={closeResume}
      />
    </ReaderShell>
  );
};

const renderOpenModal = (name: "About" | "Resume", onClose: () => void) => {
  if (name === "About") {
    return <AboutModal isOpen onClose={onClose} />;
  }

  return <ResumeModal data={resumeData} isOpen onClose={onClose} />;
};
const dialogName = (name: "About" | "Resume") =>
  name === "About" ? "About Ricky" : "Ricky Zhang’s resume";

const PortalDialog = () => {
  const dialogRef = useModalAccessibility();
  const portalRoot = document.getElementById("modal-portal-root");

  if (!portalRoot) {
    return null;
  }

  return createPortal(
    <div aria-label="Portal dialog" ref={dialogRef} role="dialog" tabIndex={-1}>
      Dialog content
    </div>,
    portalRoot
  );
};

describe("modal accessibility", () => {
  beforeEach(() => {
    const rect = new DOMRect(0, 0, 240, 360);
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue(
      rect
    );
    vi.spyOn(HTMLElement.prototype, "getClientRects").mockImplementation(
      () => ({
        0: rect,
        item: () => rect,
        length: 1,
        [Symbol.iterator]: () => [rect][Symbol.iterator](),
      })
    );
  });

  afterEach(() => vi.restoreAllMocks());

  it.each(["About", "Resume"] as const)(
    "names and initially focuses the %s dialog, then restores focus",
    async (name) => {
      const opener = document.createElement("div");
      opener.setAttribute("role", "button");
      opener.tabIndex = 0;
      opener.textContent = "Open dialog";
      document.body.append(opener);
      opener.focus();

      const onClose = vi.fn();
      const view = render(
        <>
          <button data-testid="background" type="button">
            Background
          </button>
          {renderOpenModal(name, onClose)}
        </>
      );

      const dialog = await screen.findByRole("dialog", {
        name: dialogName(name),
      });
      const viewport = dialog.querySelector("[data-reader-viewport]");
      const background = screen.getByTestId("background");
      await waitFor(() => expect(document.activeElement).toBe(viewport));
      expect(screen.queryByRole("button", { name: "Background" })).toBeNull();
      if (name === "Resume") {
        expect(
          screen.getByText("Senior Design Engineer, Core UX")
        ).toBeTruthy();
        expect(screen.getByText("Design")).toBeTruthy();
        expect(screen.getByText("Dev tools")).toBeTruthy();
      }

      view.rerender(
        <>
          <button data-testid="background" type="button">
            Background
          </button>
          {name === "About" ? (
            <AboutModal isOpen={false} onClose={onClose} />
          ) : (
            <ResumeModal data={resumeData} isOpen={false} onClose={onClose} />
          )}
        </>
      );
      expect(dialog.isConnected).toBe(true);
      expect(dialog.hasAttribute("inert")).toBe(true);
      expect(screen.getByRole("button", { name: "Background" })).toBe(
        background
      );

      await waitFor(
        () => {
          expect(document.activeElement).toBe(opener);
          expect(screen.getByRole("button", { name: "Background" })).toBe(
            background
          );
        },
        { timeout: 3000 }
      );
      opener.remove();
    }
  );

  it.each(["About", "Resume"] as const)(
    "closes the open %s modal from its toolbar and backdrop only",
    (name) => {
      const onClose = vi.fn();
      render(renderOpenModal(name, onClose));

      const dialog = screen.getByRole("dialog", {
        name: dialogName(name),
      });
      const closeButton = screen.getByRole("button", {
        name: "Close reader",
      });
      fireEvent.click(closeButton);
      expect(onClose).toHaveBeenCalledTimes(1);

      onClose.mockClear();
      const sheet = dialog.querySelector("article");
      if (!sheet) {
        throw new TypeError("Expected the modal sheet");
      }
      fireEvent.click(sheet);
      expect(onClose).not.toHaveBeenCalled();

      const backdrop = dialog.querySelector("[data-reader-viewport]");
      if (!backdrop) {
        throw new TypeError("Expected the modal backdrop");
      }
      vi.spyOn(backdrop, "clientWidth", "get").mockReturnValue(1000);
      fireEvent.click(backdrop, { clientX: 10 });
      expect(onClose).toHaveBeenCalledTimes(1);
    }
  );

  it("contains Tab focus and lets Escape close only the topmost dialog", async () => {
    render(<ModalPair />);

    const resumeDialog = screen.getByRole("dialog", {
      name: dialogName("Resume"),
    });
    await waitFor(() =>
      expect(document.activeElement).toBe(
        resumeDialog.querySelector("[data-reader-viewport]")
      )
    );
    const focusableElements = resumeDialog.querySelectorAll<HTMLElement>(
      "a[href], button:not([disabled])"
    );
    const [firstElement] = focusableElements;
    const lastElement = focusableElements.item(focusableElements.length - 1);

    expect(focusableElements.length).toBeGreaterThan(1);
    const beforeGuard = resumeDialog.previousElementSibling;
    const afterGuard = resumeDialog.nextElementSibling;
    if (!(beforeGuard && afterGuard)) {
      throw new Error("Expected dialog focus guards");
    }
    lastElement?.focus();
    fireEvent.focus(afterGuard);
    await waitFor(() => expect(document.activeElement).toBe(firstElement));

    firstElement?.focus();
    fireEvent.focus(beforeGuard);
    await waitFor(() => expect(document.activeElement).toBe(lastElement));

    fireEvent.keyDown(document, { key: "Escape" });
    await waitFor(
      () => {
        expect(
          screen.queryByRole("dialog", { name: dialogName("Resume") })
        ).toBeNull();
      },
      { timeout: 3000 }
    );
    expect(
      screen.getByRole("dialog", { name: dialogName("About") })
    ).toBeTruthy();

    fireEvent.keyDown(document, { key: "Escape" });
    await waitFor(
      () => {
        expect(
          screen.queryByRole("dialog", { name: dialogName("About") })
        ).toBeNull();
      },
      { timeout: 3000 }
    );
  });

  it("inerts app and portal siblings and restores their prior state", () => {
    const appRoot = document.createElement("div");
    const portalRoot = document.createElement("div");
    const otherPortalRoot = document.createElement("div");
    portalRoot.id = "modal-portal-root";
    appRoot.setAttribute("inert", "");
    document.body.append(appRoot, portalRoot, otherPortalRoot);

    const view = render(<PortalDialog />, { container: appRoot });

    expect(appRoot.hasAttribute("inert")).toBe(true);
    expect(otherPortalRoot.hasAttribute("inert")).toBe(true);
    expect(portalRoot.hasAttribute("inert")).toBe(false);

    view.unmount();
    expect(appRoot.hasAttribute("inert")).toBe(true);
    expect(otherPortalRoot.hasAttribute("inert")).toBe(false);

    appRoot.remove();
    portalRoot.remove();
    otherPortalRoot.remove();
  });
});
