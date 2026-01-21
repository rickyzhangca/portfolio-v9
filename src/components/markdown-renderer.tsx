import ReactMarkdown from "react-markdown";

const VIDEO_EXTENSIONS_REGEX = /\.(mov|mp4|webm)$/i;

interface MarkdownRendererProps {
  content: string;
}

export const MarkdownRenderer = ({ content }: MarkdownRendererProps) => {
  return (
    <ReactMarkdown
      components={{
        h1: ({ children }) => (
          <h1 className="mb-8 font-medium text-5xl">{children}</h1>
        ),
        h2: ({ children }) => (
          <h2 className="mt-5 mb-4 font-medium text-2xl">{children}</h2>
        ),
        h3: ({ children }) => (
          <h3 className="mt-4 mb-3 font-medium text-lg">{children}</h3>
        ),
        p: ({ children }) => (
          <p className="mb-3 text-foreground1/80">{children}</p>
        ),
        ul: ({ children }) => (
          <ul className="my-4 list-inside list-disc space-y-2">{children}</ul>
        ),
        li: ({ children }) => <li>{children}</li>,
        strong: ({ children }) => (
          <strong className="font-semibold">{children}</strong>
        ),
        blockquote: ({ children }) => (
          <blockquote className="mt-3 mb-6 flex w-full items-center gap-1.5">
            <div className="h-full w-1.5 rounded-full bg-accent" />
            <div className="flex-1 rounded-xl bg-accent/8 px-4 pt-3">
              {children}
            </div>
          </blockquote>
        ),
        a: ({ href, children }) => (
          <a
            className="text-accent"
            href={href as string}
            rel="noopener noreferrer"
            target="_blank"
          >
            {children}
          </a>
        ),
        img: ({ src, alt }) => {
          const isVideo = src?.match(VIDEO_EXTENSIONS_REGEX);

          if (isVideo) {
            return (
              <video
                className="my-4 w-full rounded-lg outline outline-border"
                controls
                loop
                muted
                playsInline
                src={src as string}
              />
            );
          }

          return (
            // biome-ignore lint/correctness/useImageSize: auto sizing
            <img
              alt={alt as string}
              className="my-4 w-full rounded-lg outline outline-border"
              src={src as string}
            />
          );
        },
      }}
    >
      {content}
    </ReactMarkdown>
  );
};
