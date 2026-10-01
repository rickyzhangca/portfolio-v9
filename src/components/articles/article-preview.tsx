import { useEffect, useRef, useState } from "react";
import type {
  ArticlePreviewBlock,
  ArticlePreviewInline,
} from "@/types/article";
import { ArticleImage } from "./article-image";

function PreviewInline({ node }: { node: ArticlePreviewInline }) {
  if (node.kind === "text") {
    return node.text;
  }
  if (node.kind === "code") {
    return <code>{node.text}</code>;
  }
  if (node.kind === "break") {
    return <br />;
  }
  if (!("children" in node)) {
    return null;
  }
  const children = <PreviewInlines nodes={node.children} />;
  switch (node.kind) {
    case "strong":
      return <strong>{children}</strong>;
    case "emphasis":
      return <em>{children}</em>;
    case "delete":
      return <del>{children}</del>;
    case "link":
      // The entire card is already a link; retain styling without nested links.
      return <span className="article-preview-link">{children}</span>;
    default:
      return null;
  }
}

function PreviewInlines({ nodes }: { nodes: ArticlePreviewInline[] }) {
  return nodes.map((node) => <PreviewInline key={node.key} node={node} />);
}

function PreviewBlock({
  block,
  loadedImages,
  tight = false,
}: {
  block: ArticlePreviewBlock;
  loadedImages: ReadonlySet<string>;
  tight?: boolean;
}) {
  switch (block.kind) {
    case "paragraph": {
      const content = <PreviewInlines nodes={block.content} />;
      return tight ? content : <p>{content}</p>;
    }
    case "heading": {
      const Heading = `h${block.depth}` as "h2" | "h3" | "h4" | "h5" | "h6";
      return (
        <Heading>
          <PreviewInlines nodes={block.content} />
        </Heading>
      );
    }
    case "divider":
      return <hr />;
    case "image":
      return (
        <ArticleImage
          alt={block.alt}
          className={block.className}
          data-preview-src={block.src}
          height={block.height}
          src={loadedImages.has(block.src) ? block.src : undefined}
          style={{
            aspectRatio: `${block.width} / ${block.height}`,
            visibility: loadedImages.has(block.src) ? undefined : "hidden",
          }}
          title={block.title}
          width={block.width}
        />
      );
    case "code":
      return (
        <pre>
          <code>{block.text}</code>
        </pre>
      );
    case "quote":
      return (
        <blockquote>
          <PreviewBlocks blocks={block.children} loadedImages={loadedImages} />
        </blockquote>
      );
    case "list": {
      const List = block.ordered ? "ol" : "ul";
      return (
        <List start={block.ordered ? block.start : undefined}>
          {block.items.map((item) => (
            <li key={item.key}>
              <PreviewBlocks
                blocks={item.children}
                loadedImages={loadedImages}
                tight={!item.loose}
              />
            </li>
          ))}
        </List>
      );
    }
    default:
      return null;
  }
}

function PreviewBlocks({
  blocks,
  loadedImages,
  tight,
}: {
  blocks: ArticlePreviewBlock[];
  loadedImages: ReadonlySet<string>;
  tight?: boolean;
}) {
  return blocks.map((block) => (
    <PreviewBlock
      block={block}
      key={block.key}
      loadedImages={loadedImages}
      tight={tight}
    />
  ));
}

export function ArticlePreview({ blocks }: { blocks: ArticlePreviewBlock[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [loadedImages, setLoadedImages] = useState<ReadonlySet<string>>(
    () => new Set()
  );
  useEffect(() => {
    if (!blocks.length) {
      return;
    }
    const images = containerRef.current?.querySelectorAll(
      "img[data-preview-src]:not([src])"
    );
    if (!images?.length) {
      return;
    }
    // Native lazy loading can prefetch past the card's overflow clip.
    const observer = new IntersectionObserver((entries) => {
      const visibleSources: string[] = [];
      for (const entry of entries) {
        if (!entry.isIntersecting) {
          continue;
        }
        const src = entry.target.getAttribute("data-preview-src");
        if (src) {
          visibleSources.push(src);
          observer.unobserve(entry.target);
        }
      }
      if (visibleSources.length) {
        setLoadedImages((current) => {
          if (visibleSources.every((src) => current.has(src))) {
            return current;
          }
          return new Set([...current, ...visibleSources]);
        });
      }
    });
    for (const image of images) {
      observer.observe(image);
    }
    return () => observer.disconnect();
  }, [blocks]);
  return (
    <div className="article-prose" ref={containerRef}>
      <PreviewBlocks blocks={blocks} loadedImages={loadedImages} />
    </div>
  );
}
