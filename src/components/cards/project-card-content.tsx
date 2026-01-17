import { ArrowUpRightIcon } from "@phosphor-icons/react";
import { memo } from "react";
import type { ProjectCardContent } from "@/types/canvas";

interface ProjectCardContentProps {
  data: ProjectCardContent;
}

const ProjectCardContentComponent = ({ data }: ProjectCardContentProps) => {
  return (
    <div className="flex h-full flex-col gap-2">
      <div className="overflow-hidden rounded-4xl border-4 border-white bg-white shadow-3xl">
        <img
          alt={data.title}
          className="h-auto w-full object-cover"
          height="200"
          src={data.image}
          width="200"
        />
      </div>
      <div className="flex w-fit items-center gap-4 rounded-full bg-white px-5 py-3 shadow-3xl">
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
      </div>
      {data.description && (
        <p className="rounded-3xl bg-white px-5 py-3 text-sm shadow-3xl">
          {data.description}
        </p>
      )}

      {data.richContent && (
        <div className="flex-grow overflow-auto">{data.richContent}</div>
      )}
    </div>
  );
};

export const ProjectCardContentView = memo(ProjectCardContentComponent);
