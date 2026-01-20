import { ArrowUpRightIcon } from "@phosphor-icons/react";
import { motion } from "framer-motion";
import { memo, useState } from "react";
import { SPRING_PRESETS } from "@/lib/animation";
import { tw } from "@/lib/utils";
import type { ProjectCardContent } from "@/cards/registry";

interface ProjectCardProps {
  content: ProjectCardContent;
  isExpanded?: boolean;
  priority?: boolean;
}

const ProjectCardComponent = ({
  content,
  isExpanded = true,
  priority = false,
}: ProjectCardProps) => {
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
            alt={content.title}
            className={tw(
              // FIXME: should support maintaining aspect ratio
              "aspect-square w-full object-cover transition-opacity duration-300",
              imageLoaded ? "opacity-100" : "opacity-0"
            )}
            height="200"
            loading={priority ? "eager" : "lazy"}
            onError={() => setImageError(true)}
            onLoad={() => setImageLoaded(true)}
            src={content.image}
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
        <span className="font-medium">{content.title}</span>
        {content.link?.url && (
          <div className="flex items-center gap-1">
            <a
              className="no-drag flex items-center gap-1 text-accent"
              href={content.link.url}
              rel="noopener noreferrer"
              target="_blank"
            >
              {content.link.icon ?? (
                <ArrowUpRightIcon
                  weight={content.link.label ? "regular" : "bold"}
                />
              )}
              {content.link.label && (
                <span className="text-sm">{content.link.label}</span>
              )}
            </a>
          </div>
        )}
      </motion.div>
      {content.description && (
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
          {content.description}
        </motion.p>
      )}
    </div>
  );
};

export const ProjectCard = memo(ProjectCardComponent);
