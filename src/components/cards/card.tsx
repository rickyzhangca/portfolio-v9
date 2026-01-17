import { memo } from "react";
import { cn } from "@/lib/utils";
import type {
  CardData,
  CompanyCardContent,
  ContactCardContent,
  ProjectCardContent,
} from "@/types/canvas";
import { CompanyCardContentView } from "./company-card-content";
import { ProjectCardContentView } from "./project-card-content";
import { ContactCardContentView } from "./contact-card-content";

interface CardProps {
  data: CardData;
  className?: string;
}

const isCompanyContent = (
  data: CardData["content"]
): data is CompanyCardContent => {
  return "image" in data && !("links" in data);
};

const isProjectContent = (
  data: CardData["content"]
): data is ProjectCardContent => {
  return "links" in data && ("image" in data || "richContent" in data);
};

const isContactContent = (
  data: CardData["content"]
): data is ContactCardContent => {
  return "links" in data && !("image" in data) && !("richContent" in data);
};

const CardComponent = ({ data, className }: CardProps) => {
  const renderContent = () => {
    if (isCompanyContent(data.content)) {
      return <CompanyCardContentView data={data.content} />;
    }
    if (isProjectContent(data.content)) {
      return <ProjectCardContentView data={data.content} />;
    }
    if (isContactContent(data.content)) {
      return <ContactCardContentView data={data.content} />;
    }
    return null;
  };

  return (
    <div
      className={cn(
        "transition-shadow duration-200",
        "rounded-2xl border shadow-2xl backdrop-blur-xl",
        "hover:shadow-[0_20px_70px_-15px_rgba(0,0,0,0.5)]",
        data.color === "purple" &&
          "border-purple-500/30 bg-gradient-to-br from-purple-500/20 to-pink-500/20",
        data.color === "blue" &&
          "border-blue-500/30 bg-gradient-to-br from-blue-500/20 to-cyan-500/20",
        data.color === "green" &&
          "border-emerald-500/30 bg-gradient-to-br from-emerald-500/20 to-teal-500/20",
        data.color === "orange" &&
          "border-orange-500/30 bg-gradient-to-br from-orange-500/20 to-red-500/20",
        !data.color && "border-white/20 bg-white/10 dark:bg-black/20",
        className
      )}
      style={{
        width: data.size.width,
        height: data.size.height,
      }}
    >
      {renderContent()}
    </div>
  );
};

export const Card = memo(CardComponent);
