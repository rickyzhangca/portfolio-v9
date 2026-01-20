import { memo, useLayoutEffect, useRef } from "react";
import type { CardInstance } from "@/cards/registry";
import { AboutCard } from "@/cards/about/about-card";
import { CoverCard } from "@/cards/cover/cover-card";
import { EmailCard } from "@/cards/email/email-card";
import { MacbookCard } from "@/cards/macbook/macbook-card";
import { ProfilePicCard } from "@/cards/profilepic/profilepic-card";
import { ProjectCard } from "@/cards/project/project-card";
import { ResumeCard } from "@/cards/resume/resume-card";
import { SocialsCard } from "@/cards/socials/socials-card";
import { StickyNoteCard } from "@/cards/stickynote/stickynote-card";

interface RenderCardProps {
  card: CardInstance;
  className?: string;
  isExpanded?: boolean;
  onMeasure?: (height: number) => void;
  priority?: boolean;
}

/**
 * Generic card renderer that routes to the appropriate card component
 * based on the card kind from the registry.
 */
const RenderCardComponent = ({
  card,
  className,
  isExpanded = true,
  onMeasure,
  priority,
}: RenderCardProps) => {
  const ref = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (!(ref.current && onMeasure)) {
      return;
    }

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.borderBoxSize) {
          const height = entry.borderBoxSize[0].blockSize;
          if (height !== card.size.height) {
            onMeasure(height);
          }
        }
      }
    });

    observer.observe(ref.current);

    return () => {
      observer.disconnect();
    };
  }, [onMeasure, card.size.height]);

  // Render the appropriate card component based on kind
  const renderContent = () => {
    switch (card.kind) {
      case "cover":
        return <CoverCard content={card.content} />;
      case "project":
        return (
          <ProjectCard
            content={card.content}
            isExpanded={isExpanded}
            priority={priority}
          />
        );
      case "resume":
        return <ResumeCard content={card.content} />;
      case "about":
        return <AboutCard content={card.content} />;
      case "email":
        return <EmailCard content={card.content} />;
      case "socials":
        return <SocialsCard content={card.content} />;
      case "stickynote":
        return <StickyNoteCard content={card.content} />;
      case "profilepic":
        return <ProfilePicCard content={card.content} />;
      case "macbook":
        return <MacbookCard content={card.content} />;
      default: {
        // Exhaustiveness check - if we get here, we have a bug
        const _exhaustive: never = card;
        return _exhaustive;
      }
    }
  };

  return (
    <div
      className={className}
      ref={ref}
      style={{
        width: card.size.width ?? "auto",
        height: card.size.height ?? "auto",
      }}
    >
      {renderContent()}
    </div>
  );
};

export const RenderCard = memo(RenderCardComponent);
