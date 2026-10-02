import { existsSync, mkdirSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createProcessor } from "@mdx-js/mdx";
import GithubSlugger from "github-slugger";
import type { PhrasingContent, RootContent } from "mdast";
import remarkGfm from "remark-gfm";
import type {
  ArticleLocale,
  ArticleMetadata,
  ArticlePreviewBlock,
  ArticlePreviewInline,
  ArticleTranslation,
} from "../src/types/article.ts";
import {
  collectPreviewImageAssets,
  getPreviewImage,
  getPreviewImageScope,
  type PreviewImageScope,
} from "./article-preview-images.ts";
import { writeChanged } from "./files.ts";

export const PROJECT_ROOT = fileURLToPath(new URL("../", import.meta.url));
export const ARTICLE_DIRECTORY = path.join(
  PROJECT_ROOT,
  "src/content/articles"
);
export const GENERATED_DIRECTORY = path.join(
  PROJECT_ROOT,
  "src/content/generated"
);
const LOCALES: readonly ArticleLocale[] = ["en", "cn"];
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const IMPORT_PATTERN = /\bimport\s+\w+\s+from\s+["'](\.\.?\/[^"']+)["']/g;
const PREVIEW_CHARACTER_LIMIT = 4000;
const PREVIEW_BLOCK_LIMIT = 16;
const PREVIEW_NODE_LIMIT = 256;
const processor = createProcessor({ remarkPlugins: [remarkGfm] });

interface ValidatedTranslation extends ArticleTranslation {
  headings: { id: string; title: string; depth: number }[];
}

interface ValidatedArticle extends ArticleMetadata {
  translations: Partial<Record<ArticleLocale, ValidatedTranslation>>;
}

function record(value: unknown, file: string): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error(`${file}: expected an object`);
  }
  return value as Record<string, unknown>;
}

function text(node: RootContent): string {
  if (
    "value" in node &&
    typeof node.value === "string" &&
    node.type !== "mdxjsEsm"
  ) {
    return node.value;
  }
  if ("children" in node) {
    return node.children.map((child) => text(child as RootContent)).join("");
  }
  return "";
}

function localizedField(
  meta: Record<string, unknown>,
  field: string,
  locale: ArticleLocale,
  file: string
): string {
  const localized = record(meta[field], `${file}: ${field}`);
  const value = localized[locale];
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`${file}: ${field}.${locale} must be a non-empty string`);
  }
  return value.trim();
}

interface PreviewBudget {
  blocks: number;
  characters: number;
  nodes: number;
  stopped: boolean;
}

function takePreviewText(value: string, budget: PreviewBudget) {
  const characters = Array.from(value);
  const result = characters.slice(0, budget.characters).join("");
  budget.characters -= Math.min(characters.length, budget.characters);
  return result;
}

function previewInlineText(nodes: ArticlePreviewInline[]): string {
  return nodes
    .map((node) => {
      if ("text" in node) {
        return node.text;
      }
      return "children" in node ? previewInlineText(node.children) : "\n";
    })
    .join("");
}

function previewInlines(
  nodes: PhrasingContent[],
  budget: PreviewBudget,
  depth = 0
): ArticlePreviewInline[] {
  const result: ArticlePreviewInline[] = [];
  for (const node of nodes) {
    if (budget.stopped || budget.characters === 0 || budget.nodes === 0) {
      break;
    }
    budget.nodes -= 1;
    const key = node.position?.start.offset ?? result.length;
    if (node.type === "text" || node.type === "inlineCode") {
      result.push({
        key,
        kind: node.type === "text" ? "text" : "code",
        text: takePreviewText(node.value, budget),
      });
    } else if (node.type === "break") {
      budget.characters -= 1;
      result.push({ key, kind: "break" });
    } else if (
      depth < 12 &&
      (node.type === "strong" ||
        node.type === "emphasis" ||
        node.type === "delete" ||
        node.type === "link" ||
        node.type === "linkReference")
    ) {
      result.push({
        children: previewInlines(node.children, budget, depth + 1),
        key,
        kind: node.type === "linkReference" ? "link" : node.type,
      });
    } else {
      // Keep a faithful static prefix; never evaluate MDX or skip visible media.
      budget.stopped = true;
    }
  }
  return result;
}

function previewBlocks(
  nodes: RootContent[],
  images: PreviewImageScope,
  budget: PreviewBudget = {
    blocks: PREVIEW_BLOCK_LIMIT,
    characters: PREVIEW_CHARACTER_LIMIT,
    nodes: PREVIEW_NODE_LIMIT,
    stopped: false,
  },
  depth = 0
): ArticlePreviewBlock[] {
  const blocks: ArticlePreviewBlock[] = [];
  for (const node of nodes) {
    if (
      budget.stopped ||
      budget.blocks === 0 ||
      budget.characters === 0 ||
      budget.nodes === 0 ||
      depth === 12
    ) {
      break;
    }
    if (node.type === "mdxjsEsm") {
      continue;
    }
    budget.blocks -= 1;
    budget.nodes -= 1;
    const base = {
      key: node.position?.start.offset ?? blocks.length,
    };
    if (node.type === "paragraph" || node.type === "heading") {
      const content = previewInlines(node.children, budget);
      const value = previewInlineText(content);
      if (value) {
        const block = { ...base, content, text: value };
        if (node.type === "heading" && node.depth !== 1) {
          blocks.push({ ...block, depth: node.depth, kind: "heading" });
        } else if (node.type === "paragraph") {
          blocks.push({ ...block, kind: "paragraph" });
        }
      }
    } else if (node.type === "thematicBreak") {
      blocks.push({ ...base, kind: "divider", text: "" });
    } else if (node.type === "code") {
      blocks.push({
        ...base,
        kind: "code",
        text: takePreviewText(node.value, budget),
      });
    } else if (node.type === "mdxJsxFlowElement") {
      const image = getPreviewImage(node, images);
      if (image) {
        const alt = takePreviewText(image.alt, budget);
        blocks.push({
          ...base,
          ...image,
          alt,
          kind: "image",
          text: alt,
          title:
            image.title === undefined
              ? undefined
              : takePreviewText(image.title, budget),
        });
      } else {
        budget.stopped = true;
      }
    } else if (node.type === "blockquote") {
      const children = previewBlocks(node.children, images, budget, depth + 1);
      blocks.push({
        ...base,
        children,
        kind: "quote",
        text: children.map((child) => child.text).join(""),
      });
    } else if (node.type === "list") {
      const items: Extract<ArticlePreviewBlock, { kind: "list" }>["items"] = [];
      for (const item of node.children) {
        if (budget.stopped || budget.nodes === 0 || budget.blocks === 0) {
          break;
        }
        if (item.checked !== null && item.checked !== undefined) {
          budget.stopped = true;
          break;
        }
        budget.nodes -= 1;
        items.push({
          children: previewBlocks(item.children, images, budget, depth + 1),
          key: item.position?.start.offset ?? items.length,
          loose: !!(node.spread || item.spread),
        });
      }
      blocks.push({
        ...base,
        items,
        kind: "list",
        ordered: node.ordered ?? false,
        start: node.start ?? 1,
        text: items
          .flatMap((item) => item.children.map((child) => child.text))
          .join(""),
      });
    } else {
      budget.stopped = true;
    }
  }
  return blocks;
}

function translation(
  file: string,
  meta: Record<string, unknown>,
  locale: ArticleLocale
): ValidatedTranslation {
  const source = readFileSync(file, "utf8");
  const tree = processor.parse(source);
  const paragraphs = tree.children.filter((node) => node.type === "paragraph");
  const prose = tree.children
    .filter((node) => node.type !== "mdxjsEsm")
    .map(text)
    .join(" ");
  const chineseCharacters = (prose.match(/\p{Script=Han}/gu) ?? []).length;
  const words = (
    prose.replace(/\p{Script=Han}/gu, " ").match(/[\p{L}\p{N}]+/gu) ?? []
  ).length;
  const slugger = new GithubSlugger();
  const headings = tree.children
    .filter((node) => node.type === "heading")
    .map((node) => ({
      depth: node.depth,
      id: slugger.slug(text(node)),
      title: text(node),
    }));
  if (headings.some((heading) => heading.depth === 1)) {
    throw new Error(`${file}: use h2-h6; the reader supplies the article h1`);
  }
  for (const match of source.matchAll(IMPORT_PATTERN)) {
    if (!existsSync(path.resolve(path.dirname(file), match[1]))) {
      throw new Error(`${file}: missing imported asset ${match[1]}`);
    }
  }
  if (!paragraphs.length) {
    throw new Error(`${file}: article must contain a paragraph`);
  }
  return {
    headings,
    preview: previewBlocks(
      tree.children,
      getPreviewImageScope(file, tree.children)
    ),
    readingMinutes: Math.max(
      1,
      Math.ceil(chineseCharacters / 450 + words / 220)
    ),
    title: localizedField(meta, "title", locale, file),
  };
}

export function discoverArticles(
  directory = ARTICLE_DIRECTORY
): ValidatedArticle[] {
  const articles: ValidatedArticle[] = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (!entry.isDirectory() || entry.name.startsWith(".")) {
      continue;
    }
    const slug = entry.name;
    const file = path.join(directory, slug, "meta.json");
    if (!SLUG_PATTERN.test(slug)) {
      throw new Error(`${file}: invalid article slug ${slug}`);
    }
    const meta = record(JSON.parse(readFileSync(file, "utf8")), file);
    const titles = record(meta.title, `${file}: title`);
    for (const locale of Object.keys(titles)) {
      if (!LOCALES.some((supported) => supported === locale)) {
        throw new Error(`${file}: unsupported language ${locale}`);
      }
    }
    const { published } = meta;
    if (
      typeof published !== "string" ||
      !DATE_PATTERN.test(published) ||
      Number.isNaN(Date.parse(published)) ||
      new Date(published).toISOString().slice(0, 10) !== published
    ) {
      throw new Error(`${file}: published must be a valid YYYY-MM-DD date`);
    }
    if (meta.draft !== undefined && typeof meta.draft !== "boolean") {
      throw new Error(`${file}: draft must be a boolean`);
    }
    const translations: ValidatedArticle["translations"] = {};
    for (const locale of LOCALES) {
      const body = path.join(directory, slug, `${locale}.mdx`);
      if (existsSync(body)) {
        translations[locale] = translation(body, meta, locale);
      } else if (titles[locale] !== undefined) {
        throw new Error(
          `${file}: missing ${locale}.mdx for declared translation`
        );
      }
    }
    if (!Object.keys(translations).length) {
      throw new Error(`${file}: no article translations`);
    }
    if (!meta.draft) {
      articles.push({ published, slug, translations });
    }
  }
  return articles.sort(
    (a, b) =>
      b.published.localeCompare(a.published) || a.slug.localeCompare(b.slug)
  );
}

export function generateArticles(
  directory = ARTICLE_DIRECTORY,
  generatedDirectory = GENERATED_DIRECTORY
): ValidatedArticle[] {
  const articles = discoverArticles(directory);
  const catalogue: ArticleMetadata[] = articles.map((article) => {
    const translations: ArticleMetadata["translations"] = {};
    for (const locale of LOCALES) {
      const value = article.translations[locale];
      if (value) {
        translations[locale] = {
          preview: value.preview,
          readingMinutes: value.readingMinutes,
          title: value.title,
        };
      }
    }
    return { published: article.published, slug: article.slug, translations };
  });
  const previewImages = new Map<string, string>();
  for (const article of catalogue) {
    for (const localized of Object.values(article.translations)) {
      if (localized) {
        collectPreviewImageAssets(localized.preview, previewImages);
      }
    }
  }
  const imageImports = [...previewImages]
    .map(([file, name]) => {
      const relative = path
        .relative(generatedDirectory, file)
        .split(path.sep)
        .join("/");
      const specifier = relative.startsWith(".") ? relative : `./${relative}`;
      return `import ${name} from ${JSON.stringify(`${specifier}?no-inline`)};`;
    })
    .join("\n");
  const catalogueSource = JSON.stringify(
    catalogue,
    (key: string, value: unknown) =>
      key === "src" && typeof value === "string" && previewImages.has(value)
        ? previewImages.get(value)
        : value,
    2
  ).replace(/"src": "(articlePreviewImage\d+)"/g, '"src": $1');
  mkdirSync(generatedDirectory, { recursive: true });
  writeChanged(
    path.join(generatedDirectory, "catalogue.ts"),
    `// Generated by tools/articles.ts; do not edit.\nimport type { ArticleMetadata } from "@/types/article";\n${imageImports}\nexport const articles: ArticleMetadata[] = ${catalogueSource};\n`
  );
  const loaders = articles
    .map(
      (article) =>
        `${JSON.stringify(article.slug)}: {${Object.keys(article.translations)
          .map(
            (locale) =>
              `${locale}: () => import(${JSON.stringify(`@/content/articles/${article.slug}/${locale}.mdx`)})`
          )
          .join(",")}}`
    )
    .join(",\n");
  writeChanged(
    path.join(generatedDirectory, "loaders.ts"),
    `// Generated by tools/articles.ts; do not edit.\nimport type { ArticleLocale, ArticleModule } from "@/types/article";\nexport const articleLoaders: Record<string, Partial<Record<ArticleLocale, () => Promise<ArticleModule>>>> = {${loaders}};\n`
  );
  return articles;
}
