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
      "flex h-full w-full flex-col bg-white px-10 pt-10",
      !interactive && "pointer-events-none select-none",
      className
    )}
  >
    <Suspense fallback={<p>Loading…</p>}>
      <MarkdownRenderer content={aboutContent} />
    </Suspense>
  </article>
);
