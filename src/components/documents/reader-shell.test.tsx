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
    expect(
      await screen.findByRole("dialog", { name: "An essay" })
    ).toBeTruthy();
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
