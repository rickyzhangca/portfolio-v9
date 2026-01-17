import { memo, useLayoutEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import type {
  CardData,
  CompanyCardContent,
  ContactCardContent,
  ProjectCardContent,
} from "@/types/canvas";
import { CompanyCardContentView } from "./company-card-content";
import { ContactCardContentView } from "./contact-card-content";
import { ProjectCardContentView } from "./project-card-content";

interface CardProps {
  data: CardData;
  className?: string;
  onMeasure?: (height: number) => void;
}

const CardComponent = ({ data, className, onMeasure }: CardProps) => {
  const ref = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (!(ref.current && onMeasure)) {
      return;
    }

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.borderBoxSize) {
          const height = entry.borderBoxSize[0].blockSize;
          if (height !== data.size.height) {
            onMeasure(height);
          }
        }
      }
    });

    observer.observe(ref.current);

    return () => {
      observer.disconnect();
    };
  }, [onMeasure, data.size.height]);

  const renderContent = () => {
    switch (data.type) {
      case "company":
        return (
          <CompanyCardContentView data={data.content as CompanyCardContent} />
        );
      case "project":
        return (
          <ProjectCardContentView data={data.content as ProjectCardContent} />
        );
      case "contact":
        return (
          <ContactCardContentView data={data.content as ContactCardContent} />
        );
      default:
        return null;
    }
  };

  return (
    <div
      className={cn(
        "transition-shadow duration-200",
        "hover:shadow-[0_20px_70px_-15px_rgba(0,0,0,0.5)]",
        className
      )}
      ref={ref}
      style={{
        width: data.size.width,
        height: data.size.height ?? "auto",
      }}
    >
      {renderContent()}
    </div>
  );
};

export const Card = memo(CardComponent);
