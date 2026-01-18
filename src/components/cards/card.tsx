import { memo, useLayoutEffect, useRef } from "react";
import type { CardData } from "@/types/canvas";
import { CompanyCardContentView } from "./company-card-content";
import { ContactCardContentView } from "./contact-card-content";
import { ProjectCardContentView } from "./project-card-content";

interface CardProps {
  data: CardData;
  className?: string;
  isExpanded?: boolean;
  onMeasure?: (height: number) => void;
  priority?: boolean;
}

const CardComponent = ({
  data,
  className,
  isExpanded = true,
  onMeasure,
  priority,
}: CardProps) => {
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
    if (data.type === "company") {
      return <CompanyCardContentView data={data.content} />;
    }
    if (data.type === "project") {
      return (
        <ProjectCardContentView
          data={data.content}
          isExpanded={isExpanded}
          priority={priority}
        />
      );
    }
    if (data.type === "contact") {
      return <ContactCardContentView data={data.content} />;
    }
    return null;
  };

  return (
    <div
      className={className}
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
