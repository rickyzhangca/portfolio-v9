import { memo, useLayoutEffect, useRef } from "react";
import type { CardData } from "@/types/canvas";
import { CoverCardContentView } from "./cover-card-content";
import { DocCardContentView } from "./doc-card-content";
import { EmailCardContentView } from "./email-card-content";
import { MacbookCardContentView } from "./macbook-card-content";
import { ProfilePicCardContentView } from "./profilepic-card-content";
import { ProjectCardContentView } from "./project-card-content";
import { StickyNoteCardContentView } from "./stickynote-card-content";
import { SocialsCardContentView } from "./socials-card-content";

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
    if (data.type === "cover") {
      return <CoverCardContentView data={data.content} />;
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
    if (data.type === "doc") {
      return <DocCardContentView data={data.content} />;
    }
    if (data.type === "email") {
      return <EmailCardContentView data={data.content} />;
    }
    if (data.type === "stickynote") {
      return <StickyNoteCardContentView data={data.content} />;
    }
    if (data.type === "socials") {
      return <SocialsCardContentView data={data.content} />;
    }
    if (data.type === "profilepic") {
      return <ProfilePicCardContentView data={data.content} />;
    }
    if (data.type === "macbook") {
      return <MacbookCardContentView data={data.content} />;
    }
    return null;
  };

  return (
    <div
      className={className}
      ref={ref}
      style={{
        width: data.size.width ?? "auto",
        height: data.size.height ?? "auto",
      }}
    >
      {renderContent()}
    </div>
  );
};

export const Card = memo(CardComponent);
