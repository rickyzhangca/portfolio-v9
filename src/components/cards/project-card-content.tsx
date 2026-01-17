import {
  ArrowSquareOut,
  GithubLogo,
  LinkedinLogo,
} from "@phosphor-icons/react";
import { memo } from "react";
import type { ProjectCardContent } from "@/types/canvas";

interface ProjectCardContentProps {
  data: ProjectCardContent;
}

const ProjectCardContentComponent = ({ data }: ProjectCardContentProps) => {
  const renderIcon = (iconName?: string) => {
    switch (iconName) {
      case "github":
        return <GithubLogo size={18} weight="fill" />;
      case "linkedin":
        return <LinkedinLogo size={18} weight="fill" />;
      default:
        return <ArrowSquareOut size={18} weight="fill" />;
    }
  };

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="mb-4 flex-shrink-0 overflow-hidden rounded-lg bg-white/5">
        <img
          alt={data.title}
          className="h-auto w-full object-cover"
          height="200"
          src={data.image}
          width="200"
        />
      </div>

      <h3 className="mb-2 flex-shrink-0 font-bold text-white text-xl">
        {data.title}
      </h3>

      {data.description && (
        <p className="mb-4 flex-grow overflow-auto text-sm text-white/70">
          {data.description}
        </p>
      )}

      <div className="flex">
        <a
          className="no-drag flex items-center gap-1 rounded-lg bg-white/10 px-3 py-1.5 text-sm text-white/90 transition-colors hover:bg-white/20 hover:text-white"
          href={data.link.url}
          rel="noopener noreferrer"
          target="_blank"
        >
          {renderIcon(data.link.icon)}
          <span>{data.link.label}</span>
        </a>
      </div>

      {data.richContent && (
        <div className="flex-grow overflow-auto">{data.richContent}</div>
      )}
    </div>
  );
};

export const ProjectCardContentView = memo(ProjectCardContentComponent);
