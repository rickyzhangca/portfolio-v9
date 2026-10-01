import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { discoverArticles, PROJECT_ROOT } from "./articles.ts";

const output = path.join(PROJECT_ROOT, "dist/client");
const sitemap = readFileSync(path.join(output, "sitemap.xml"), "utf8");
assert.ok(
  !existsSync(path.join(output, "writing.html")),
  "Writing index must not be published"
);
assert.ok(
  !sitemap.includes("<loc>https://rickyzhang.me/writing</loc>"),
  "Writing index must not appear in sitemap"
);
const articles = discoverArticles();
let translations = 0;
for (const article of articles) {
  for (const [locale, translation] of Object.entries(article.translations)) {
    if (!translation) {
      continue;
    }
    const route = `/writing/${locale}/${article.slug}`;
    const html = readFileSync(path.join(output, `${route}.html`), "utf8");
    assert.equal(
      (html.match(/<h1(?:\s|>)/g) ?? []).length,
      1,
      `${route}: expected a single h1`
    );
    assert.ok(
      html.includes('class="article-prose"'),
      `${route}: prerendered body is missing`
    );
    assert.ok(
      html.includes(`https://rickyzhang.me${route}`),
      `${route}: canonical URL is missing`
    );
    assert.ok(
      html.includes(`lang="${locale === "cn" ? "zh-CN" : "en"}"`),
      `${route}: language is missing`
    );
    assert.ok(
      sitemap.includes(`<loc>https://rickyzhang.me${route}</loc>`),
      `${route}: missing from sitemap`
    );
    for (const heading of translation.headings) {
      assert.ok(
        html.includes(`id="${heading.id}"`),
        `${route}: missing section ID ${heading.id}`
      );
    }
    for (const match of html.matchAll(/(?:src|href)="(\/assets\/[^"?#]+)"/g)) {
      assert.ok(
        existsSync(path.join(output, match[1])),
        `${route}: missing deployed asset ${match[1]}`
      );
    }
    const image = readFileSync(
      path.join(output, "writing/og", `${article.slug}-${locale}.png`)
    );
    assert.equal(
      image.subarray(1, 4).toString(),
      "PNG",
      `${route}: invalid sharing image`
    );
    assert.equal(image.readUInt32BE(16), 1200);
    assert.equal(image.readUInt32BE(20), 630);
    translations += 1;
  }
}
assert.ok(
  existsSync(path.join(output, "404.html")),
  "Static 404 page is missing"
);
assert.ok(
  !existsSync(path.join(output, "tools/fonts")),
  "Build fonts must not be published"
);
console.log(
  `Verified ${translations} static article pages, headings, assets, sitemap and sharing images.`
);
