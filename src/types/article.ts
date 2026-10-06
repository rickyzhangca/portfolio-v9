import type { MDXProps } from "mdx/types";
import type { ComponentType } from "react";

export type ArticleLocale = "en" | "cn";

export type ArticlePreviewInline = { key: number } & (
  | { kind: "text" | "code"; text: string }
  | { kind: "break" }
  | {
      children: ArticlePreviewInline[];
      kind: "strong" | "emphasis" | "delete" | "link";
    }
);

export type ArticlePreviewBlock = {
  key: number;
  text: string;
} & (
  | { content: ArticlePreviewInline[]; kind: "paragraph" }
  | {
      content: ArticlePreviewInline[];
      depth: 2 | 3 | 4 | 5 | 6;
      kind: "heading";
    }
  | { kind: "divider" | "code" }
  | {
      alt: string;
      className?: string;
      height: number;
      kind: "image";
      src: string;
      title?: string;
      width: number;
    }
  | { children: ArticlePreviewBlock[]; kind: "quote" }
  | {
      items: {
        children: ArticlePreviewBlock[];
        key: number;
        loose: boolean;
      }[];
      kind: "list";
      ordered: boolean;
      start: number;
    }
);

export interface ArticleTranslation {
  preview: ArticlePreviewBlock[];
  readingMinutes: number;
  title: string;
}

export interface ArticleMetadata {
  published: string;
  slug: string;
  translations: Partial<Record<ArticleLocale, ArticleTranslation>>;
}

export interface ArticleModule {
  default: ComponentType<MDXProps>;
}

export interface ArticleSource {
  cardId: string;
  itemId: string;
}
