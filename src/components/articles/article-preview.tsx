import type {
  ArticlePreviewBlock,
  ArticlePreviewInline,
} from "@/types/article";

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
  tight = false,
}: {
  block: ArticlePreviewBlock;
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
    case "code":
      return (
        <pre>
          <code>{block.text}</code>
        </pre>
      );
    case "quote":
      return (
        <blockquote>
          <PreviewBlocks blocks={block.children} />
        </blockquote>
      );
    case "list": {
      const List = block.ordered ? "ol" : "ul";
      return (
        <List start={block.ordered ? block.start : undefined}>
          {block.items.map((item) => (
            <li key={item.key}>
              <PreviewBlocks blocks={item.children} tight={!item.loose} />
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
  tight,
}: {
  blocks: ArticlePreviewBlock[];
  tight?: boolean;
}) {
  return blocks.map((block) => (
    <PreviewBlock block={block} key={block.key} tight={tight} />
  ));
}

export function ArticlePreview({ blocks }: { blocks: ArticlePreviewBlock[] }) {
  return (
    <div className="article-prose">
      <PreviewBlocks blocks={blocks} />
    </div>
  );
}
