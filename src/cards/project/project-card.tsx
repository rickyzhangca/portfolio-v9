import { ArrowUpRightIcon } from "@phosphor-icons/react";
import { motion } from "framer-motion";
import { useAtomValue } from "jotai";
import { memo, useCallback, useState } from "react";
import { LAMP_LIFT } from "@/components/lighting/lamp-shadows";
import { PaperLighting } from "@/components/lighting/lit-paper";
import { deskLampAtom } from "@/context/atoms";
import { tw } from "@/lib/utils";
import type { ProjectCardContent } from "@/cards/registry";
import { getResponsiveImageSources } from "@/cards/responsive-image";

/** rounded-4xl: the print's corner radius, in CSS px. */
const PRINT_RADIUS = 32;

const DEFAULT_CAPTION_DELAY_S = 0.08;

const CAPTION_CLOSE_TRANSITION = {
  opacity: { duration: 0.08, ease: "easeOut" },
  y: { duration: 0.1, ease: "easeIn" },
} as const;

interface ProjectCardProps {
  captionDelay?: number;
  content: ProjectCardContent;
  isExpanded?: boolean;
  priority?: boolean;
}

const ProjectCardComponent = ({
  captionDelay = DEFAULT_CAPTION_DELAY_S,
  content,
  isExpanded = true,
  priority = false,
}: ProjectCardProps) => {
  const [imageError, setImageError] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const handleImageError = useCallback(() => setImageError(true), []);
  const handleImageLoad = useCallback(() => setImageLoaded(true), []);
  const { src, srcSet } = getResponsiveImageSources(content.image);
  // Under the lamp every screenshot casts the lamp's shadow, laid out or
  // tucked; the fixed downward shadow would point a different way.
  const isLampOn = useAtomValue(deskLampAtom);

  return (
    <div className="flex h-full flex-col gap-1.5">
      {/* Isolated so the lamp's shadow canvas sits behind the print. */}
      <div className="relative isolate">
        <div
          className={tw(
            "no-pan overflow-hidden rounded-4xl border-6 bg-white transition-shadow",
            "border-white",
            isExpanded && !isLampOn && "shadow-3xl",
            !isExpanded && "drop-shadow-[0_2px_6px_rgba(0,0,0,0.12)]"
          )}
          data-lamp-contact
          data-lamp-shadow={isExpanded ? LAMP_LIFT.card : LAMP_LIFT.screenshot}
        >
          {imageError ? (
            <div className="text-foreground2 flex items-center justify-center p-12">
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
              onError={handleImageError}
              onLoad={handleImageLoad}
              src={src}
              srcSet={srcSet}
              width="200"
            />
          )}
        </div>
        <PaperLighting
          castsShadow
          covered={!isExpanded}
          kind="photo"
          radius={PRINT_RADIUS}
        />
      </div>
      <motion.div
        animate={{
          opacity: isExpanded ? 1 : 0,
          y: isExpanded ? 0 : -6,
        }}
        className={tw(
          "no-pan flex w-fit items-center gap-4 rounded-full bg-white px-5 py-3",
          !isLampOn && "shadow-2xl"
        )}
        data-lamp-contact
        data-lamp-shadow={isExpanded ? LAMP_LIFT.caption : undefined}
        initial={false}
        transition={
          isExpanded
            ? {
                opacity: {
                  delay: captionDelay,
                  duration: 0.2,
                  ease: "easeOut",
                },
                y: {
                  damping: 36,
                  delay: captionDelay,
                  stiffness: 380,
                  type: "spring",
                },
              }
            : CAPTION_CLOSE_TRANSITION
        }
      >
        <span className="font-medium">{content.title}</span>
        {content.link?.url ? (
          <div className="flex items-center gap-1">
            <a
              className="no-drag text-accent flex items-center gap-1"
              href={content.link.url}
              rel="noopener noreferrer"
              target="_blank"
            >
              {content.link.icon ?? (
                <ArrowUpRightIcon
                  weight={content.link.label ? "regular" : "bold"}
                />
              )}
              {content.link.label ? (
                <span className="text-sm">{content.link.label}</span>
              ) : null}
            </a>
          </div>
        ) : null}
      </motion.div>
      {content.description ? (
        <motion.p
          animate={{
            opacity: isExpanded ? 1 : 0,
            y: isExpanded ? 0 : -6,
          }}
          className={tw(
            "no-pan rounded-3xl bg-white px-5 py-4 text-sm",
            !isLampOn && "shadow-2xl"
          )}
          data-lamp-contact
          data-lamp-shadow={isExpanded ? LAMP_LIFT.caption : undefined}
          initial={false}
          transition={
            isExpanded
              ? {
                  opacity: {
                    delay: captionDelay + 0.03,
                    duration: 0.2,
                    ease: "easeOut",
                  },
                  y: {
                    damping: 36,
                    delay: captionDelay + 0.03,
                    stiffness: 380,
                    type: "spring",
                  },
                }
              : CAPTION_CLOSE_TRANSITION
          }
        >
          {content.description}
        </motion.p>
      ) : null}
    </div>
  );
};

export const ProjectCard = memo(ProjectCardComponent);
