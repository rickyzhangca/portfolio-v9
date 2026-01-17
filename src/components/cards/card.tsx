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

export const cardMask = (
  <svg
    fill="none"
    height="360"
    viewBox="0 0 240 360"
    width="240"
    xmlns="http://www.w3.org/2000/svg"
  >
    <title>Card Mask</title>
    <path
      d="M0 302.4C0 322.562 0 332.643 3.92377 340.344C7.37521 347.117 12.8825 352.625 19.6563 356.076C27.3572 360 37.4381 360 57.6 360H188.8C206.722 360 215.683 360 222.528 356.512C228.549 353.444 233.444 348.549 236.512 342.528C240 335.683 240 326.722 240 308.8V279.367C240 272.913 240 269.686 239.454 266.587C238.753 262.606 237.386 258.771 235.411 255.243C233.873 252.498 231.832 249.999 227.75 245C223.668 240.001 221.627 237.502 220.089 234.757C218.114 231.229 216.747 227.394 216.046 223.413C215.5 220.314 215.5 217.087 215.5 210.633V149.367C215.5 142.913 215.5 139.686 216.046 136.587C216.747 132.606 218.114 128.771 220.089 125.243C221.627 122.498 223.668 119.999 227.75 115C231.832 110.001 233.873 107.502 235.411 104.757C237.386 101.229 238.753 97.3944 239.454 93.4129C240 90.3142 240 87.0873 240 80.6335V51.2C240 33.2783 240 24.3175 236.512 17.4723C233.444 11.4511 228.549 6.55574 222.528 3.48779C215.683 0 206.722 0 188.8 0H57.6C37.4381 0 27.3572 0 19.6563 3.92377C12.8825 7.37521 7.37521 12.8825 3.92377 19.6563C0 27.3572 0 37.4381 0 57.6V302.4Z"
      fill="black"
    />
  </svg>
);

interface CardProps {
  data: CardData;
  className?: string;
  onMeasure?: (height: number) => void;
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
        "overflow-hidden rounded-4xl bg-foreground1/90 shadow-2xl backdrop-blur-xl",
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
