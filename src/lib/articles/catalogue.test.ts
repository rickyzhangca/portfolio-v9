import { describe, expect, it, vi } from "vitest";
import { getArticleDate, getArticlePath, isArticleLocale } from "./catalogue";

vi.mock("@/content/generated/catalogue", () => ({
  articles: [
    {
      published: "2026-02-23",
      slug: "chinese-only",
      translations: { cn: { title: "中文文章" } },
    },
  ],
}));
describe("article URLs", () => {
  it("opens the available language when an article only has Chinese", () => {
    expect(getArticlePath("chinese-only")).toBe("/writing/cn/chinese-only");
    expect(getArticlePath("chinese-only", "en")).toBe(
      "/writing/en/chinese-only"
    );
  });
  it("rejects unsupported languages and formats dates independently of timezone", () => {
    expect(isArticleLocale("en")).toBe(true);
    expect(isArticleLocale("cn")).toBe(true);
    expect(isArticleLocale("zh")).toBe(false);
    expect(isArticleLocale(null)).toBe(false);
    expect(getArticleDate("2026-02-23", "cn")).toBe("2026年2月23日");
  });
});
