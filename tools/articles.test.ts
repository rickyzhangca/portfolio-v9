// @vitest-environment node
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { discoverArticles, generateArticles } from "./articles.ts";

let directory: string;
beforeEach(() => {
  directory = mkdtempSync(path.join(tmpdir(), "portfolio-articles-"));
});
afterEach(() => rmSync(directory, { force: true, recursive: true }));

function article(
  slug: string,
  options: {
    published?: string;
    draft?: unknown;
    body?: string;
    chinese?: boolean;
  } = {}
) {
  const folder = path.join(directory, slug);
  mkdirSync(folder);
  writeFileSync(
    path.join(folder, "meta.json"),
    JSON.stringify({
      draft: options.draft,
      published: options.published ?? "2026-02-23",
      title: { en: "An essay", ...(options.chinese ? { cn: "一篇文章" } : {}) },
    })
  );
  writeFileSync(
    path.join(folder, "en.mdx"),
    options.body ?? "A paragraph.\n\n## Section\n\nAnother paragraph."
  );
  return folder;
}

const IMAGE_IMPORTS = `import { ArticleImage as Picture } from "@/components/articles/article-image";
import diagram from "./assets/diagram.svg";

`;
const IMAGE =
  '<Picture src={diagram} alt="A diagram" width={734} height={412} />';

function imageArticle(slug: string, body: string, chinese = false) {
  const folder = article(slug, {
    body: `${IMAGE_IMPORTS}${body}`,
    chinese,
  });
  mkdirSync(path.join(folder, "assets"));
  writeFileSync(
    path.join(folder, "assets/diagram.svg"),
    '<svg xmlns="http://www.w3.org/2000/svg" width="734" height="412" />'
  );
  if (chinese) {
    writeFileSync(path.join(folder, "cn.mdx"), `${IMAGE_IMPORTS}${body}`);
  }
  return folder;
}

describe("article content validation", () => {
  it("keeps draft titles and import paths out of browser manifests", () => {
    article("published-essay");
    article("secret-draft", { draft: true });
    const output = path.join(directory, ".generated");
    generateArticles(directory, output);
    expect(readFileSync(path.join(output, "loaders.ts"), "utf8")).not.toContain(
      "secret-draft"
    );
    expect(
      readFileSync(path.join(output, "catalogue.ts"), "utf8")
    ).not.toContain("secret-draft");
    expect(readFileSync(path.join(output, "loaders.ts"), "utf8")).toContain(
      "published-essay/en.mdx"
    );
    expect(
      readFileSync(path.join(output, "catalogue.ts"), "utf8")
    ).not.toContain("headings");
  });
  it("orders published articles deterministically and excludes drafts", () => {
    article("older", { published: "2025-01-01" });
    article("z-last");
    article("a-first");
    article("secret-draft", { draft: true });
    expect(discoverArticles(directory).map(({ slug }) => slug)).toEqual([
      "a-first",
      "z-last",
      "older",
    ]);
  });
  it("supports a single language without inventing translations", () => {
    article("one-language");
    expect(Object.keys(discoverArticles(directory)[0].translations)).toEqual([
      "en",
    ]);
  });
  it("rejects a declared translation without a body", () => {
    article("missing-language", { chinese: true });
    expect(() => discoverArticles(directory)).toThrow("missing cn.mdx");
  });
  it.each(["2026-02-30", "2026-2-01", "not-a-date"])(
    "rejects invalid published date %s",
    (published) => {
      article("bad-date", { published });
      expect(() => discoverArticles(directory)).toThrow("valid YYYY-MM-DD");
    }
  );
  it("rejects string draft flags", () => {
    article("bad-draft", { draft: "true" });
    expect(() => discoverArticles(directory)).toThrow(
      "draft must be a boolean"
    );
  });
  it("keeps previews bounded and duplicate Unicode headings addressable", () => {
    article("unicode", {
      body: `${"word ".repeat(1000)}\n\n## 验证与设计\n\nText\n\n## 验证与设计\n\nText`,
    });
    const translation = discoverArticles(directory)[0].translations.en;
    expect(translation?.preview.length).toBeLessThanOrEqual(16);
    expect(
      translation?.preview.reduce(
        (length, block) => length + Array.from(block.text).length,
        0
      )
    ).toBeLessThanOrEqual(4000);
    expect(translation?.headings.map(({ id }) => id)).toEqual([
      "验证与设计",
      "验证与设计-1",
    ]);
    expect(translation?.readingMinutes).toBeGreaterThan(1);
  });
  it("preserves inline formatting and stops before media instead of rearranging the article", () => {
    article("continuous-preview", {
      body: 'export const credit = "Private credit";\n\nFirst **paragraph** with `code`.\n\n## Next section\n\nSecond paragraph.\n\n<img src="/hidden.svg" />\n\nThird paragraph with {"hidden expression"}.',
    });
    const preview = discoverArticles(directory)[0].translations.en?.preview;
    expect(preview?.map(({ text }) => text)).toEqual([
      "First paragraph with code.",
      "Next section",
      "Second paragraph.",
    ]);
    expect(preview?.[1]).toMatchObject({ depth: 2, kind: "heading" });
    expect(preview?.[0]).toMatchObject({
      content: expect.arrayContaining([
        expect.objectContaining({ kind: "strong" }),
        expect.objectContaining({ kind: "code", text: "code" }),
      ]),
    });
    expect(new Set(preview?.map(({ key }) => key)).size).toBe(preview?.length);
  });
  it("preserves local static ArticleImage blocks and the following content in order", () => {
    const folder = imageArticle(
      "with-image",
      `Before **the image**.\n\n${IMAGE}\n\nAfter the image.`
    );
    const preview = discoverArticles(directory)[0].translations.en?.preview;
    expect(preview?.map((block) => block.kind)).toEqual([
      "paragraph",
      "image",
      "paragraph",
    ]);
    expect(preview?.[1]).toMatchObject({
      alt: "A diagram",
      height: 412,
      src: path.join(folder, "assets/diagram.svg"),
      width: 734,
    });
    expect(preview?.[2].text).toBe("After the image.");
  });
  it("retains static image strings, dimensions and styling without evaluating expressions", () => {
    imageArticle(
      "image-attributes",
      'Before.\n\n<Picture src={diagram} alt={"A diagram"} width="734" height={412} className="object-contain" title={"Caption"} />'
    );
    expect(
      discoverArticles(directory)[0].translations.en?.preview[1]
    ).toMatchObject({
      alt: "A diagram",
      className: "object-contain",
      height: 412,
      title: "Caption",
      width: 734,
    });
  });
  it.each([
    "<Picture src={getImage()} width={734} height={412} />",
    "<Picture src={diagram} width={getWidth()} height={412} />",
    "<Picture src={diagram} width={734} height={412} {...props} />",
    "<Picture src={diagram} width={734} height={412} onLoad={run} />",
    "<Picture src={diagram} width={734} height={412} alt={getAlt()} />",
    "<Picture src={diagram} width={734} />",
    "<Unknown src={diagram} width={734} height={412} />",
    "<Picture src={diagram} width={734} height={412}>Content</Picture>",
  ])(
    "stops at unsupported image markup rather than evaluating or skipping it: %s",
    (markup) => {
      imageArticle("unsupported-image", `Before.\n\n${markup}\n\nAfter.`);
      expect(
        discoverArticles(directory)[0].translations.en?.preview.map(
          (block) => block.text
        )
      ).toEqual(["Before."]);
    }
  );
  it.each(["0", "-1", "1e309", '"100%"'])(
    "reports invalid static image dimensions %s",
    (width) => {
      imageArticle(
        "invalid-image",
        `Before.\n\n<Picture src={diagram} width={${width}} height={412} />`
      );
      expect(() => discoverArticles(directory)).toThrow(
        "en.mdx: preview image dimensions must be positive numbers"
      );
    }
  );
  it("bounds image blocks and Unicode alt text with the existing preview budgets", () => {
    imageArticle("many-images", `Before.\n\n${`${IMAGE}\n\n`.repeat(40)}`);
    imageArticle(
      "unicode-image",
      `Before.\n\n<Picture src={diagram} alt="${"😀".repeat(5000)}" width={734} height={412} />\n\nAfter.`
    );
    const articles = discoverArticles(directory);
    expect(articles[0].translations.en?.preview).toHaveLength(16);
    const preview = articles[1].translations.en?.preview ?? [];
    expect(preview).toHaveLength(2);
    expect(
      preview.reduce((sum, block) => sum + Array.from(block.text).length, 0)
    ).toBe(4000);
  });
  it("deduplicates localized and nested image imports and emits URL references without inline assets or MDX", () => {
    imageArticle(
      "with-images",
      `Before \`{"src": "articlePreviewImage0"}\`.\n\n> ${IMAGE}\n\n- An item\n\n  ${IMAGE}\n`,
      true
    );
    const output = path.join(directory, ".generated");
    generateArticles(directory, output);
    const source = readFileSync(path.join(output, "catalogue.ts"), "utf8");
    expect(source.match(/import articlePreviewImage/g)).toHaveLength(1);
    expect(source).toContain('assets/diagram.svg?no-inline"');
    expect(source).toContain('"src": articlePreviewImage0');
    expect(source).toContain('\\"src\\": \\"articlePreviewImage0\\"');
    expect(source).not.toContain(`${directory}/with-images`);
    expect(source).not.toContain(".mdx");
    expect(source).not.toContain("data:image");
  });
  it("does not publish image imports from drafts", () => {
    imageArticle("published", `Before.\n\n${IMAGE}`);
    const draft = imageArticle("secret-draft", `Before.\n\n${IMAGE}`);
    const meta = JSON.parse(
      readFileSync(path.join(draft, "meta.json"), "utf8")
    );
    writeFileSync(
      path.join(draft, "meta.json"),
      JSON.stringify({ ...meta, draft: true })
    );
    const output = path.join(directory, ".generated");
    generateArticles(directory, output);
    expect(
      readFileSync(path.join(output, "catalogue.ts"), "utf8")
    ).not.toContain("secret-draft");
  });
  it("retains separators, lists, quotes and hard breaks without evaluating MDX", () => {
    article("formatted-prefix", {
      body: 'First *paragraph* with [a link](https://example.com).\n\n---\n\n- One **item**\n- Two items\n\n> A quote.\n\nBefore  \na break and {"private expression"} after.',
    });
    const preview = discoverArticles(directory)[0].translations.en?.preview;
    expect(preview?.map(({ kind }) => kind)).toEqual([
      "paragraph",
      "divider",
      "list",
      "quote",
      "paragraph",
    ]);
    expect(preview?.[2]).toMatchObject({
      items: [
        {
          children: [expect.objectContaining({ text: "One item" })],
          loose: false,
        },
        {
          children: [expect.objectContaining({ text: "Two items" })],
          loose: false,
        },
      ],
    });
    expect(preview?.at(-1)?.text).toBe("Before\na break and ");
    expect(JSON.stringify(preview)).not.toContain("private expression");
  });
  it("bounds many small blocks and never splits a Unicode character", () => {
    article("many-paragraphs", { body: "A paragraph.\n\n".repeat(40) });
    expect(
      discoverArticles(directory)[0].translations.en?.preview
    ).toHaveLength(16);
    article("unicode-preview", { body: "😀".repeat(5000) });
    expect(
      discoverArticles(directory)[1].translations.en?.preview[0].text
    ).toBe("😀".repeat(4000));
  });
  it("rejects body h1 so the reader remains the only page title", () => {
    article("two-titles", { body: "# Title\n\nA paragraph." });
    expect(() => discoverArticles(directory)).toThrow(
      "reader supplies the article h1"
    );
  });
  it("identifies missing local imports by file and asset", () => {
    article("missing-image", {
      body: 'import image from "./missing.svg";\n\nA paragraph.',
    });
    expect(() => discoverArticles(directory)).toThrow(
      "missing imported asset ./missing.svg"
    );
  });
});
