import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { useCallback, useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ReaderShell } from "./reader-shell";

afterEach(cleanup);

function ClosingReader({ onExited }: { onExited: () => void }) {
  const [open, setOpen] = useState(true);
  const close = useCallback(() => setOpen(false), []);
  return (
    <ReaderShell
      isOpen={open}
      onClose={close}
      onExitComplete={onExited}
      title="Closing essay"
    >
      <p>Reader content survives until the exit completes.</p>
    </ReaderShell>
  );
}

describe("reader shell", () => {
  it("gives article content its own proportional projection plane", async () => {
    render(
      <ReaderShell
        clipDuringLayout
        contentLayoutId="document:writing:essay:content"
        isOpen
        layoutId="document:writing:essay"
        onClose={vi.fn()}
        paperAspectRatio={2 / 3}
        title="An essay"
      >
        <article>Long article body</article>
      </ReaderShell>
    );
    const dialog = await screen.findByRole("dialog", { name: "An essay" });
    const backdrop = dialog.querySelector("[data-reader-backdrop]");
    const surface = dialog.querySelector<HTMLElement>("[data-paper-surface]");
    const content = dialog.querySelector<HTMLElement>("[data-paper-content]");
    expect(backdrop?.classList.contains("bg-white")).toBe(true);
    expect(dialog.classList.contains("bg-white")).toBe(false);
    expect(surface?.style.aspectRatio).toBe(`${2 / 3} / 1`);
    expect(content?.style.aspectRatio).toBe(`${2 / 3} / 1`);
    expect(content?.contains(screen.getByText("Long article body"))).toBe(true);
    expect(surface?.parentElement).toBe(content?.parentElement);
  });

  it("releases pointer interception and modal isolation as soon as exit starts", async () => {
    render(
      <>
        <button type="button">Next essay</button>
        <ClosingReader onExited={vi.fn()} />
      </>
    );
    const dialog = await screen.findByRole("dialog", {
      name: "Closing essay",
    });
    expect(screen.queryByRole("button", { name: "Next essay" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Close reader" }));
    expect(dialog.isConnected).toBe(true);
    expect(dialog.style.pointerEvents).toBe("none");
    expect(dialog.hasAttribute("inert")).toBe(true);
    expect(screen.getByRole("button", { name: "Next essay" })).toBeTruthy();
    expect(dialog.closest("[data-no-collapse]")).not.toBeNull();
  });
  it("retains the dialog through exit and cleans up when the animation finishes", async () => {
    const onExited = vi.fn();
    render(<ClosingReader onExited={onExited} />);
    await screen.findByRole("dialog", { name: "Closing essay" });
    fireEvent.click(screen.getByRole("button", { name: "Close reader" }));
    expect(screen.getByRole("dialog", { name: "Closing essay" })).toBeTruthy();
    expect(onExited).not.toHaveBeenCalled();
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(onExited).toHaveBeenCalledTimes(1);
  });
  it("labels the dialog and reports the close button action", async () => {
    const close = vi.fn();
    render(
      <ReaderShell isOpen onClose={close} title="An essay">
        <p>Article body</p>
      </ReaderShell>
    );
    const dialog = await screen.findByRole("dialog", { name: "An essay" });
    expect(dialog.classList.contains("bg-white")).toBe(true);
    expect(dialog.querySelector("[data-reader-backdrop]")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Close reader" }));
    expect(close).toHaveBeenCalledWith("button");
  });
  it("reports Escape without letting the background canvas handle it", async () => {
    const close = vi.fn();
    const background = vi.fn();
    window.addEventListener("keydown", background);
    render(
      <ReaderShell isOpen onClose={close} title="An essay">
        <p>Article body</p>
      </ReaderShell>
    );
    await screen.findByRole("dialog");
    fireEvent.keyDown(document.activeElement ?? document.body, {
      key: "Escape",
    });
    await waitFor(() => expect(close).toHaveBeenCalledWith("keyboard"));
    expect(background).not.toHaveBeenCalled();
    window.removeEventListener("keydown", background);
  });
});
