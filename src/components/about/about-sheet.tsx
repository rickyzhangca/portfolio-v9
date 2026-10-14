import { lazy, Suspense } from "react";
import aboutContent from "@/content/about.md?raw";
import { tw } from "@/lib/utils";

const MarkdownRenderer = lazy(() =>
  import("../markdown-renderer").then((module) => ({
    default: module.MarkdownRenderer,
  }))
);

interface AboutSheetProps {
  className?: string;
  interactive?: boolean;
}

export const AboutSheet = ({
  className,
  interactive = true,
}: AboutSheetProps) => (
  <article
    className={tw(
      "reader-paper h-full w-full bg-white",
      !interactive && "pointer-events-none select-none",
      className
    )}
  >
    <div className="reader-column">
      <Suspense fallback={<p>Loading…</p>}>
        <MarkdownRenderer content={aboutContent} prose />
      </Suspense>
    </div>
  </article>
);
