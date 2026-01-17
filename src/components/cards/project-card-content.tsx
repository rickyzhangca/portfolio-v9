import { ArrowUpRightIcon } from "@phosphor-icons/react";
import { motion } from "framer-motion";
import { memo } from "react";
import { cn } from "@/lib/utils";
import type { ProjectCardContent } from "@/types/canvas";

interface ProjectCardContentProps {
  data: ProjectCardContent;
  isExpanded?: boolean;
}

const ProjectCardContentComponent = ({
  data,
  isExpanded = true,
}: ProjectCardContentProps) => {
  return (
    <div className="flex h-full flex-col gap-2">
      <div
        className={cn(
          "overflow-hidden rounded-4xl border-4 border-white bg-white transition-shadow",
          isExpanded ? "shadow-3xl" : "drop-shadow-[0_2px_6px_rgba(0,0,0,0.12)]"
        )}
      >
        <img
          alt={data.title}
          className="h-auto w-full object-cover"
          height="200"
          src={data.image}
          width="200"
        />
      </div>
      <motion.div
        animate={{
          opacity: isExpanded ? 1 : 0,
          y: isExpanded ? 0 : -8,
          scale: isExpanded ? 1 : 0.95,
        }}
        className="flex w-fit items-center gap-4 rounded-full bg-white px-5 py-3 shadow-3xl"
        initial={false}
        transition={{
          type: "spring",
          stiffness: 520,
          damping: 46,
          mass: 0.8,
        }}
      >
        <span className="font-medium">{data.title}</span>
        {data.link?.url && (
          <div className="flex items-center gap-1">
            <a
              className="no-drag flex items-center gap-1 text-accent"
              href={data.link.url}
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
          className="rounded-3xl bg-white px-5 py-4 text-sm shadow-3xl"
          initial={false}
          transition={{
            type: "spring",
            stiffness: 520,
            damping: 46,
            mass: 0.8,
            delay: 0.02,
          }}
        >
          {data.description}
        </motion.p>
      )}

      {data.richContent && (
        <motion.div
          animate={{
            opacity: isExpanded ? 1 : 0,
            y: isExpanded ? 0 : -8,
            scale: isExpanded ? 1 : 0.95,
          }}
          className="flex-grow overflow-auto"
          initial={false}
          transition={{
            type: "spring",
            stiffness: 520,
            damping: 46,
            mass: 0.8,
            delay: 0.04,
          }}
        >
          {data.richContent}
        </motion.div>
      )}
    </div>
  );
};

export const ProjectCardContentView = memo(ProjectCardContentComponent);
