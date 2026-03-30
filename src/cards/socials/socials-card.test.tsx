import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SocialsCard } from "./socials-card";

describe("SocialsCard", () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("renders a GitHub key and opens the GitHub URL when clicked", () => {
    vi.useFakeTimers();
    const openSpy = vi
      .spyOn(window, "open")
      .mockImplementation(() => null as unknown as Window);

    render(
      <SocialsCard
        content={{
          githubUrl: "https://github.com/rickyzhangca",
          linkedinUrl: "https://www.linkedin.com/in/ricky-zhang/",
          twitterUrl: "https://x.com/rickyrickyriri",
        }}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "GitHub" }));
    vi.advanceTimersByTime(400);

    expect(openSpy).toHaveBeenCalledWith(
      "https://github.com/rickyzhangca",
      "_blank"
    );
  });
});
