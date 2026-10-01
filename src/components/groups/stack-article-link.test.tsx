import {
  cleanup,
  createEvent,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ArticleCardInstance } from "@/cards/registry";
import { StackArticleLink } from "./stack-article-link";

afterEach(cleanup);
const card: ArticleCardInstance = {
  content: { slug: "ephemeral-design" },
  id: "article-ephemeral-design",
  kind: "article",
  size: { height: 360, width: 240 },
};

function setup(expanded = true) {
  const activate = vi.fn();
  render(
    <StackArticleLink card={card} isExpanded={expanded} onActivate={activate}>
      Preview
    </StackArticleLink>
  );
  return { activate, link: screen.getByRole("link") };
}

describe("article card navigation", () => {
  it("provides a real URL and passes the nested card and focus target", () => {
    const { activate, link } = setup();
    expect(link.getAttribute("href")).toBe("/writing/en/ephemeral-design");
    fireEvent.click(link);
    expect(activate).toHaveBeenCalledWith(card.id, link);
  });
  it.each(["metaKey", "ctrlKey", "shiftKey", "altKey"])(
    "leaves %s navigation to the browser",
    (modifier) => {
      const { activate, link } = setup();
      const event = createEvent.click(link, { [modifier]: true });
      fireEvent(link, event);
      expect(event.defaultPrevented).toBe(false);
      expect(activate).not.toHaveBeenCalled();
    }
  );
  it("does not navigate after dragging, then accepts the next click", () => {
    const { activate, link } = setup();
    fireEvent.pointerDown(link, { clientX: 10, clientY: 10 });
    fireEvent.pointerUp(link, { clientX: 30, clientY: 10 });
    fireEvent.click(link);
    expect(activate).not.toHaveBeenCalled();
    fireEvent.pointerDown(link, { clientX: 10, clientY: 10 });
    fireEvent.pointerUp(link, { clientX: 11, clientY: 10 });
    fireEvent.click(link);
    expect(activate).toHaveBeenCalledOnce();
  });
  it("removes collapsed previews from keyboard navigation", () => {
    const { activate, link } = setup(false);
    expect(link.tabIndex).toBe(-1);
    fireEvent.click(link);
    expect(activate).not.toHaveBeenCalled();
  });
  it("cancels navigation when the gesture is cancelled", () => {
    const { activate, link } = setup();
    fireEvent.pointerDown(link);
    fireEvent.pointerCancel(link);
    fireEvent.click(link);
    expect(activate).not.toHaveBeenCalled();
  });
});
