import {
  ArrowSquareOut,
  EnvelopeSimple,
  GithubLogo,
  LinkedinLogo,
} from "@phosphor-icons/react";
import { memo, type ReactNode } from "react";
import type { ContactCardContent } from "@/types/canvas";

interface ContactCardContentProps {
  data: ContactCardContent;
}

const ContactCardContentComponent = ({ data }: ContactCardContentProps) => {
  const renderIcon = (icon?: ReactNode) => {
    if (typeof icon === "string") {
      switch (icon) {
        case "github":
          return <GithubLogo size={18} weight="fill" />;
        case "linkedin":
          return <LinkedinLogo size={18} weight="fill" />;
        case "email":
          return <EnvelopeSimple size={18} weight="fill" />;
        default:
          return <ArrowSquareOut size={18} weight="fill" />;
      }
    }

    if (icon != null) {
      return icon;
    }

    return <ArrowSquareOut size={18} weight="fill" />;
  };

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <h3 className="mb-2 flex-shrink-0 font-bold text-white text-xl">
        {data.title}
      </h3>

      {data.description && (
        <p className="mb-4 flex-grow overflow-auto text-sm text-white/70">
          {data.description}
        </p>
      )}

      <div className="flex flex-shrink-0">
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
    </div>
  );
};

export const ContactCardContentView = memo(ContactCardContentComponent);
