import ReactMarkdown from "react-markdown";
import { tw } from "@/lib/utils";

import { CodeHighlighter } from "./code-highlighter";

const LANGUAGE_REGEX = /language-(\w+)/;
const VIDEO_EXTENSIONS_REGEX = /\.(mov|mp4|webm)$/i;

interface MarkdownRendererProps {
  content: string;
}

export const MarkdownRenderer = ({ content }: MarkdownRendererProps) => {
  return (
    <ReactMarkdown
      components={{
        h1: ({ children }) => (
          <h1 className="not-last:mb-8 font-medium text-5xl">{children}</h1>
        ),
        h2: ({ children }) => (
          <h2 className="mt-5 not-last:mb-4 font-medium text-2xl">
            {children}
          </h2>
        ),
        h3: ({ children }) => (
          <h3 className="mt-4 not-last:mb-3 font-medium text-lg">{children}</h3>
        ),
        p: ({ children }) => (
          <p className="not-last:mb-3 text-foreground1/80">{children}</p>
        ),
        ul: ({ children }) => (
          <ul className="my-4 list-inside list-disc space-y-2">{children}</ul>
        ),
        li: ({ children }) => <li>{children}</li>,
        strong: ({ children }) => (
          <strong className="font-semibold">{children}</strong>
        ),
        blockquote: ({ children }) => (
          <blockquote className="mt-3 not-last:mb-6 flex w-full items-center gap-1.5">
            <div className="h-full w-1.5 rounded-full bg-accent" />
            <div className="flex-1 rounded-xl bg-accent/8 px-4 py-3">
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
                className="mt-4 not-last:mb-4 w-full rounded-lg outline outline-border"
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
              className="mt-4 not-last:mb-4 w-full rounded-lg outline outline-border"
              src={src as string}
            />
          );
        },
        code: ({ className, children, ...props }) => {
          const match = LANGUAGE_REGEX.exec(className || "");
          const isInline = !match;

          if (isInline) {
            return (
              <code
                className={tw(
                  "rounded-md bg-background3 px-1.5 py-0.5 font-mono text-accent text-xs"
                )}
                {...props}
              >
                {children}
              </code>
            );
          }

          return <code {...props}>{children}</code>;
        },
        pre: ({ children }) => {
          const codeElement = children as React.ReactElement;
          const codeProps = codeElement?.props as
            | { children?: string; className?: string }
            | undefined;
          const codeString = codeProps?.children;
          const className = codeProps?.className || "";
          const languageMatch = LANGUAGE_REGEX.exec(className);
          const language = languageMatch?.[1] || "text";

          if (typeof codeString !== "string") {
            return <pre>{children}</pre>;
          }

          return <CodeHighlighter code={codeString} language={language} />;
        },
      }}
    >
      {content}
    </ReactMarkdown>
  );
};
