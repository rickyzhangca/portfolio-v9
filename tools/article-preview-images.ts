import { statSync } from "node:fs";
import path from "node:path";
import type { RootContent } from "mdast";
import type { ArticlePreviewBlock } from "../src/types/article.ts";

type ImageElement = Extract<RootContent, { type: "mdxJsxFlowElement" }>;
type ImageAttribute = Extract<
  ImageElement["attributes"][number],
  { type: "mdxJsxAttribute" }
>;
type PreviewImage = Omit<
  Extract<ArticlePreviewBlock, { kind: "image" }>,
  "key" | "kind" | "text"
>;
const RELATIVE_IMPORT_PATTERN = /^\.\.?\//;
const DIMENSION_PATTERN = /^\d+(?:\.\d+)?$/;

const IMAGE_EXTENSIONS = new Set([
  ".avif",
  ".gif",
  ".jpeg",
  ".jpg",
  ".png",
  ".svg",
  ".webp",
]);
const IMAGE_ATTRIBUTES = new Set([
  "alt",
  "className",
  "height",
  "src",
  "title",
  "width",
]);

export interface PreviewImageScope {
  assets: Map<string, string>;
  components: Set<string>;
  file: string;
}

export function getPreviewImageScope(
  file: string,
  nodes: RootContent[]
): PreviewImageScope {
  const scope: PreviewImageScope = {
    assets: new Map(),
    components: new Set(),
    file,
  };
  for (const node of nodes) {
    if (node.type !== "mdxjsEsm") {
      continue;
    }
    for (const statement of node.data?.estree?.body ?? []) {
      if (
        statement.type !== "ImportDeclaration" ||
        typeof statement.source.value !== "string"
      ) {
        continue;
      }
      const source = statement.source.value;
      for (const specifier of statement.specifiers) {
        if (
          source === "@/components/articles/article-image" &&
          specifier.type === "ImportSpecifier" &&
          specifier.imported.type === "Identifier" &&
          specifier.imported.name === "ArticleImage"
        ) {
          scope.components.add(specifier.local.name);
        } else if (
          specifier.type === "ImportDefaultSpecifier" &&
          RELATIVE_IMPORT_PATTERN.test(source) &&
          IMAGE_EXTENSIONS.has(path.extname(source).toLowerCase())
        ) {
          scope.assets.set(
            specifier.local.name,
            path.resolve(path.dirname(file), source)
          );
        }
      }
    }
  }
  return scope;
}

function attributeExpression(attribute: ImageAttribute | undefined) {
  const value = attribute?.value;
  if (!value || typeof value === "string") {
    return;
  }
  const statements = value.data?.estree?.body;
  if (statements?.length !== 1) {
    return;
  }
  const [statement] = statements;
  return statement.type === "ExpressionStatement"
    ? statement.expression
    : undefined;
}

function staticValue(
  attribute: ImageAttribute | undefined
): string | number | undefined {
  if (typeof attribute?.value === "string") {
    return attribute.value;
  }
  const expression = attributeExpression(attribute);
  if (
    expression?.type === "Literal" &&
    (typeof expression.value === "string" ||
      typeof expression.value === "number")
  ) {
    return expression.value;
  }
  if (
    expression?.type === "UnaryExpression" &&
    expression.operator === "-" &&
    expression.argument.type === "Literal" &&
    typeof expression.argument.value === "number"
  ) {
    return -expression.argument.value;
  }
  return undefined;
}

export function getPreviewImage(
  node: ImageElement,
  scope: PreviewImageScope
): PreviewImage | null {
  if (!scope.components.has(node.name ?? "") || node.children.length) {
    return null;
  }
  const attributes = new Map<string, ImageAttribute>();
  for (const attribute of node.attributes) {
    if (
      attribute.type !== "mdxJsxAttribute" ||
      !IMAGE_ATTRIBUTES.has(attribute.name)
    ) {
      return null;
    }
    if (attributes.has(attribute.name)) {
      throw new Error(
        `${scope.file}: duplicate image attribute ${attribute.name}`
      );
    }
    attributes.set(attribute.name, attribute);
  }
  const source = attributeExpression(attributes.get("src"));
  const src =
    source?.type === "Identifier" ? scope.assets.get(source.name) : undefined;
  const widthValue = staticValue(attributes.get("width"));
  const heightValue = staticValue(attributes.get("height"));
  if (!src || widthValue === undefined || heightValue === undefined) {
    return null;
  }
  const width = Number(widthValue);
  const height = Number(heightValue);
  if (
    !(
      Number.isFinite(width) &&
      Number.isFinite(height) &&
      width > 0 &&
      height > 0 &&
      (typeof widthValue !== "string" || DIMENSION_PATTERN.test(widthValue)) &&
      (typeof heightValue !== "string" || DIMENSION_PATTERN.test(heightValue))
    )
  ) {
    throw new Error(
      `${scope.file}: preview image dimensions must be positive numbers`
    );
  }
  if (!statSync(src, { throwIfNoEntry: false })?.isFile()) {
    throw new Error(`${scope.file}: preview image must reference a local file`);
  }
  const strings: { alt: string; className?: string; title?: string } = {
    alt: "",
  };
  for (const name of ["alt", "className", "title"] as const) {
    if (!attributes.has(name)) {
      continue;
    }
    const value = staticValue(attributes.get(name));
    if (
      typeof value !== "string" ||
      (name === "className" && value.length > 256)
    ) {
      return null;
    }
    strings[name] = value;
  }
  return { ...strings, height, src, width };
}

export function collectPreviewImageAssets(
  blocks: ArticlePreviewBlock[],
  assets: Map<string, string>
) {
  for (const block of blocks) {
    if (block.kind === "image" && !assets.has(block.src)) {
      assets.set(block.src, `articlePreviewImage${assets.size}`);
    } else if (block.kind === "quote") {
      collectPreviewImageAssets(block.children, assets);
    } else if (block.kind === "list") {
      for (const item of block.items) {
        collectPreviewImageAssets(item.children, assets);
      }
    }
  }
}
