import {
  lazy,
  memo,
  type ReactElement,
  Suspense,
  useEffect,
  useRef,
  useState,
} from "react";
import ReactMarkdown from "react-markdown";
import { tw } from "@/lib/utils";

const LANGUAGE_REGEX = /language-(\w+)/;
const VIDEO_EXTENSIONS_REGEX = /\.(mov|mp4|webm)(?:[?#].*)?$/i;
const DEFAULT_VIDEO_ASPECT_RATIO = "16 / 9";
const LazyCodeHighlighter = lazy(() =>
  import("./code-highlighter").then((module) => ({
    default: module.CodeHighlighter,
  }))
);

interface MarkdownVideoProps {
  src: string;
  alt?: string;
}

interface VisibilityStyleSnapshot {
  display: string;
  isTransparent: boolean;
  visibility: string;
}

const getVisibilityStyleSnapshot = (
  style: CSSStyleDeclaration
): VisibilityStyleSnapshot => {
  const opacity = Number.parseFloat(style.opacity);
  return {
    display: style.display,
    isTransparent: Number.isFinite(opacity) && opacity <= 0,
    visibility: style.visibility,
  };
};

const hasHiddenAncestor = (video: HTMLVideoElement) => {
  const videoStyle = window.getComputedStyle(video);
  if (
    videoStyle.display === "none" ||
    videoStyle.visibility === "hidden" ||
    videoStyle.visibility === "collapse"
  ) {
    return true;
  }

  let ancestor = video.parentElement;
  while (ancestor) {
    const style = window.getComputedStyle(ancestor);
    const opacity = Number.parseFloat(style.opacity);
    if (
      style.display === "none" ||
      style.visibility === "hidden" ||
      style.visibility === "collapse" ||
      (Number.isFinite(opacity) && opacity <= 0)
    ) {
      return true;
    }
    ancestor = ancestor.parentElement;
  }

  return false;
};

const visibilityStylesChanged = (
  record: MutationRecord,
  styleSnapshots: Map<Element, VisibilityStyleSnapshot>
) => {
  if (record.attributeName === "class") {
    return true;
  }

  if (
    record.attributeName !== "style" ||
    !(record.target instanceof HTMLElement)
  ) {
    return false;
  }

  const previous = styleSnapshots.get(record.target);
  const current = getVisibilityStyleSnapshot(record.target.style);
  styleSnapshots.set(record.target, current);

  return (
    previous?.display !== current.display ||
    previous?.visibility !== current.visibility ||
    previous?.isTransparent !== current.isTransparent
  );
};

const MarkdownVideo = ({ src, alt }: MarkdownVideoProps) => {
  const [aspectRatio, setAspectRatio] = useState(DEFAULT_VIDEO_ASPECT_RATIO);
  const [isReady, setIsReady] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [isAutoplayBlocked, setIsAutoplayBlocked] = useState(false);
  const [hasError, setHasError] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const isVisibleRef = useRef(false);
  const currentSourceRef = useRef(src);

  useEffect(() => {
    if (currentSourceRef.current === src) {
      return;
    }

    currentSourceRef.current = src;
    setIsReady(false);
    setIsAutoplayBlocked(false);
    setHasError(false);
  }, [src]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) {
      return;
    }

    let latestEntry: IntersectionObserverEntry | null = null;
    const setVisibility = (visible: boolean) => {
      if (isVisibleRef.current === visible) {
        return;
      }

      isVisibleRef.current = visible;
      setIsVisible(visible);

      if (visible) {
        setHasError(false);
      } else {
        video.pause();
        setIsReady(false);
        setIsAutoplayBlocked(false);
      }
    };

    const updateVisibility = () => {
      if (!latestEntry) {
        return;
      }

      setVisibility(latestEntry.isIntersecting && !hasHiddenAncestor(video));
    };

    if (typeof IntersectionObserver !== "undefined") {
      const handleIntersection: IntersectionObserverCallback = (entries) => {
        const entry = entries.find((candidate) => candidate.target === video);
        if (entry) {
          latestEntry = entry;
          updateVisibility();
        }
      };

      const observerOptions: IntersectionObserverInit = {
        rootMargin: "0px",
        threshold: 0.1,
      };
      const observer = new IntersectionObserver(
        handleIntersection,
        observerOptions
      );
      observer.observe(video);

      const styleSnapshots = new Map<Element, VisibilityStyleSnapshot>();
      const styleObserver =
        typeof MutationObserver === "undefined"
          ? null
          : new MutationObserver((records) => {
              let visibilityMayHaveChanged = false;
              for (const record of records) {
                visibilityMayHaveChanged =
                  visibilityStylesChanged(record, styleSnapshots) ||
                  visibilityMayHaveChanged;
              }

              if (visibilityMayHaveChanged) {
                updateVisibility();
              }
            });

      if (styleObserver) {
        let ancestor = video.parentElement;
        while (ancestor) {
          if (ancestor instanceof HTMLElement) {
            styleSnapshots.set(
              ancestor,
              getVisibilityStyleSnapshot(ancestor.style)
            );
          }
          styleObserver.observe(ancestor, {
            attributeFilter: ["class", "style"],
            attributes: true,
          });
          ancestor = ancestor.parentElement;
        }
      }

      return () => {
        observer.disconnect();
        styleObserver?.disconnect();
      };
    }

    const updateViewportFallback = () => {
      const bounds = video.getBoundingClientRect();
      const withinViewport =
        bounds.bottom >= 0 &&
        bounds.top <= window.innerHeight &&
        bounds.right >= 0 &&
        bounds.left <= window.innerWidth;
      setVisibility(withinViewport && !hasHiddenAncestor(video));
    };

    window.addEventListener("scroll", updateViewportFallback, true);
    window.addEventListener("resize", updateViewportFallback);
    updateViewportFallback();

    return () => {
      window.removeEventListener("scroll", updateViewportFallback, true);
      window.removeEventListener("resize", updateViewportFallback);
    };
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!(isVisible && video) || video.getAttribute("src") !== src) {
      return;
    }

    let isCurrentPlaybackRequest = true;
    const handlePlaybackFailure = (error: unknown) => {
      if (!isCurrentPlaybackRequest) {
        return;
      }

      const errorName =
        error &&
        typeof error === "object" &&
        "name" in error &&
        typeof error.name === "string"
          ? error.name
          : undefined;

      if (errorName === "NotAllowedError") {
        setIsAutoplayBlocked(true);
      } else if (errorName !== "AbortError") {
        setHasError(true);
      }
    };

    try {
      video.play().catch(handlePlaybackFailure);
    } catch (error) {
      handlePlaybackFailure(error);
    }

    return () => {
      isCurrentPlaybackRequest = false;
    };
  }, [isVisible, src]);

  const showVideo = isReady || isAutoplayBlocked;

  return (
    <span className="relative mt-4 not-last:mb-4 w-full">
      <span
        aria-hidden={true}
        className="pointer-events-none absolute inset-0 bg-background3 transition-opacity"
        style={{ opacity: showVideo ? 0 : 1 }}
      />
      <video
        aria-label={alt}
        autoPlay={isVisible}
        className="h-full w-full outline outline-border/50 transition-opacity"
        controls={isAutoplayBlocked}
        loop
        muted
        onError={() => {
          setIsAutoplayBlocked(false);
          setHasError(true);
        }}
        onLoadedMetadata={(event) => {
          const { videoWidth, videoHeight } = event.currentTarget;
          if (videoWidth > 0 && videoHeight > 0) {
            setAspectRatio(`${videoWidth / videoHeight}`);
          }
        }}
        onPlaying={() => {
          setIsReady(true);
          setHasError(false);
        }}
        playsInline
        preload={isVisible ? "auto" : "none"}
        ref={videoRef}
        src={isVisible ? src : undefined}
        style={{
          borderRadius: 12,
          aspectRatio,
          opacity: showVideo ? 1 : 0,
        }}
      />
      {hasError && (
        <span
          className="absolute inset-0 flex items-center justify-center rounded-xl bg-background3 text-foreground2 text-sm"
          role="alert"
        >
          Video could not be loaded.
        </span>
      )}
    </span>
  );
};

interface MarkdownRendererProps {
  content: string;
}

const MarkdownRendererComponent = ({ content }: MarkdownRendererProps) => {
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
              <MarkdownVideo
                alt={typeof alt === "string" ? alt : undefined}
                src={src as string}
              />
            );
          }

          return (
            // biome-ignore lint/correctness/useImageSize: auto sizing
            <img
              alt={alt as string}
              className="mt-4 not-last:mb-4 w-full rounded-lg outline outline-border"
              decoding="async"
              loading="lazy"
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
          const codeElement = children as ReactElement;
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

          return (
            <Suspense fallback={<pre>{children}</pre>}>
              <LazyCodeHighlighter code={codeString} language={language} />
            </Suspense>
          );
        },
      }}
    >
      {content}
    </ReactMarkdown>
  );
};

export const MarkdownRenderer = memo(MarkdownRendererComponent);
