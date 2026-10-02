import { createHash } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  unlinkSync,
} from "node:fs";
import path from "node:path";
import { Resvg } from "@resvg/resvg-js";
import type { ArticleMetadata } from "../src/types/article.ts";
import { PROJECT_ROOT } from "./articles.ts";
import { writeChanged } from "./files.ts";

const HAN_CHARACTER = /\p{Script=Han}/u;
const SITE_URL = "https://rickyzhang.me";
const FONT_FILE = path.join(PROJECT_ROOT, "tools/fonts/noto-sans-sc.ttf");

function xml(value: string) {
  return value.replace(
    /[<>&"']/g,
    (character) =>
      ({
        "'": "&apos;",
        '"': "&quot;",
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
      })[character] ?? character
  );
}

function lines(value: string, maxWidth: number, size: number): string[] {
  const result: string[] = [];
  let current = "";
  let width = 0;
  for (const word of value.match(/\p{Script=Han}|[^\s\p{Script=Han}]+/gu) ??
    []) {
    const wordWidth = [...word].reduce(
      (total, character) =>
        total + (HAN_CHARACTER.test(character) ? size : size * 0.55),
      0
    );
    if (width + wordWidth > maxWidth && current) {
      result.push(current);
      current = "";
      width = 0;
    }
    const gap = current && !HAN_CHARACTER.test(word) ? " " : "";
    current += gap + word;
    width += wordWidth + gap.length * size * 0.3;
  }
  if (current) {
    result.push(current);
  }
  return result;
}

export function generateSharing(articles: ArticleMetadata[]) {
  const directory = path.join(PROJECT_ROOT, "public/writing/og");
  mkdirSync(directory, { recursive: true });
  const cacheDirectory = path.join(
    PROJECT_ROOT,
    "node_modules/.cache/portfolio-writing"
  );
  mkdirSync(cacheDirectory, { recursive: true });
  const hashesFile = path.join(cacheDirectory, "sharing-hashes.json");
  const previous = existsSync(hashesFile)
    ? (JSON.parse(readFileSync(hashesFile, "utf8")) as Record<string, string>)
    : {};
  const hashes: Record<string, string> = {};
  const fontHash = createHash("sha256")
    .update(readFileSync(FONT_FILE))
    .digest("hex");
  const urls = [`<url><loc>${SITE_URL}/</loc></url>`];
  for (const article of articles) {
    for (const [locale, translation] of Object.entries(article.translations)) {
      if (!translation) {
        continue;
      }
      const key = `${article.slug}-${locale}`;
      const title = lines(translation.title, 1030, 58).slice(0, 3);
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630"><rect width="1200" height="630" fill="#f7f7f4"/><rect x="40" y="40" width="1120" height="550" rx="28" fill="white"/><g fill="#26251f" font-family="Noto Sans SC"><text x="84" y="110" font-size="24" fill="#77756c">Ricky Zhang · Writing</text>${title.map((line, index) => `<text x="84" y="${220 + index * 78}" font-size="58" font-weight="600">${xml(line)}</text>`).join("")}<text x="84" y="550" font-size="20" fill="#77756c">${article.published} · ${locale === "cn" ? "中文" : "English"} · rickyzhang.me</text></g><circle cx="1090" cy="538" r="16" fill="#e35b28"/></svg>`;
      hashes[key] = createHash("sha256")
        .update(svg)
        .update(fontHash)
        .digest("hex");
      const file = path.join(directory, `${key}.png`);
      if (previous[key] !== hashes[key] || !existsSync(file)) {
        writeChanged(
          file,
          new Resvg(svg, {
            font: {
              defaultFontFamily: "Noto Sans SC",
              fontFiles: [FONT_FILE],
              loadSystemFonts: false,
            },
          })
            .render()
            .asPng()
        );
      }
      const alternateLinks = Object.keys(article.translations)
        .map(
          (language) =>
            `<xhtml:link rel="alternate" hreflang="${language === "cn" ? "zh-CN" : "en"}" href="${SITE_URL}/writing/${language}/${article.slug}"/>`
        )
        .join("");
      urls.push(
        `<url><loc>${SITE_URL}/writing/${locale}/${article.slug}</loc><lastmod>${article.published}</lastmod>${alternateLinks}</url>`
      );
    }
  }
  for (const entry of readdirSync(directory)) {
    if (
      (entry.endsWith(".png") && !(entry.slice(0, -4) in hashes)) ||
      entry === ".hashes.json"
    ) {
      unlinkSync(path.join(directory, entry));
    }
  }
  writeChanged(hashesFile, `${JSON.stringify(hashes)}\n`);
  writeChanged(
    path.join(PROJECT_ROOT, "public/sitemap.xml"),
    `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">${urls.join("")}</urlset>\n`
  );
}
