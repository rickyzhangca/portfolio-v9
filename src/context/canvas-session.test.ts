import { describe, expect, it } from "vitest";
import { getArticleSource } from "./canvas-session";

describe("article return source", () => {
  it("accepts only a complete document identity from history state", () => {
    expect(
      getArticleSource({
        articleSource: { cardId: "article", itemId: "writing" },
      })
    ).toEqual({ cardId: "article", itemId: "writing" });
    for (const value of [
      null,
      "state",
      {},
      { articleSource: null },
      { articleSource: {} },
      { articleSource: { cardId: "a", itemId: 3 } },
      { articleSource: { itemId: "w" } },
    ]) {
      expect(getArticleSource(value)).toBeNull();
    }
  });
});
