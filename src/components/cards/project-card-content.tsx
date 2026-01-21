import { ArrowUpRightIcon } from "@phosphor-icons/react";
import { motion } from "framer-motion";
import { memo, useState } from "react";
import { AnalyticsEvents, track } from "@/lib/analytics";
import { SPRING_PRESETS } from "@/lib/animation";
import { tw } from "@/lib/utils";
import type { ProjectCardContent } from "@/types/canvas";

interface ProjectCardContentProps {
  data: ProjectCardContent;
  isExpanded?: boolean;
  priority?: boolean;
}

const ProjectCardContentComponent = ({
  data,
  isExpanded = true,
  priority = false,
}: ProjectCardContentProps) => {
  const [imageError, setImageError] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  return (
    <div className="flex h-full flex-col gap-1.5">
      <div
        className={tw(
          "no-pan overflow-hidden rounded-4xl border-6 bg-white transition-shadow",
          isExpanded
            ? "border-white shadow-3xl"
            : "border-white drop-shadow-[0_2px_6px_rgba(0,0,0,0.12)]"
        )}
      >
        {imageError ? (
          <div className="flex items-center justify-center p-12 text-foreground2">
            No Image
          </div>
        ) : (
          // biome-ignore lint/a11y/noNoninteractiveElementInteractions: error handling
          <img
            alt={data.title}
            className={tw(
              // FIXME: should support maintaining aspect ratio
              "aspect-square w-full object-cover transition-opacity duration-300",
              imageLoaded ? "opacity-100" : "opacity-0"
            )}
            height="200"
            loading={priority ? "eager" : "lazy"}
            onError={() => setImageError(true)}
            onLoad={() => setImageLoaded(true)}
            src={data.image}
            width="200"
          />
        )}
      </div>
      <motion.div
        animate={{
          opacity: isExpanded ? 1 : 0,
          y: isExpanded ? 0 : -8,
          scale: isExpanded ? 1 : 0.95,
        }}
        className="no-pan flex w-fit items-center gap-4 rounded-full bg-white px-5 py-3 shadow-2xl"
        initial={false}
        transition={SPRING_PRESETS.snappy}
      >
        <span className="font-medium">{data.title}</span>
        {data.link?.url && (
          <div className="flex items-center gap-1">
            <a
              className="no-drag flex items-center gap-1 text-accent"
              href={data.link.url}
              onClick={() =>
                track(AnalyticsEvents.PROJECT_LINK_CLICK, {
                  company: "unknown",
                  project_name: data.title,
                  link_type: data.link?.label ?? "external",
                })
              }
              rel="noopener noreferrer"
              target="_blank"
            >
              {data.link.icon ?? (
                <ArrowUpRightIcon
                  weight={data.link.label ? "regular" : "bold"}
                />
              )}
              {data.link.label && (
                <span className="text-sm">{data.link.label}</span>
              )}
            </a>
          </div>
        )}
      </motion.div>
      {data.description && (
        <motion.p
          animate={{
            opacity: isExpanded ? 1 : 0,
            y: isExpanded ? 0 : -8,
            scale: isExpanded ? 1 : 0.95,
          }}
          className="no-pan rounded-3xl bg-white px-5 py-4 text-sm shadow-2xl"
          initial={false}
          transition={{
            ...SPRING_PRESETS.snappy,
            delay: 0.02,
          }}
        >
          {data.description}
        </motion.p>
      )}
    </div>
  );
};

export const ProjectCardContentView = memo(ProjectCardContentComponent);
