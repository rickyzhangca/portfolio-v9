import type { ReactNode } from "react";
import { tw } from "@/lib/utils";

interface ResumeSectionProps {
  children: ReactNode;
  label: ReactNode;
  labelClassName?: string;
}

/** A label in the left margin from 640px, stacked above its content on phones. */
export const ResumeSection = ({
  children,
  label,
  labelClassName,
}: ResumeSectionProps) => (
  <section className="flex flex-col gap-3 sm:flex-row sm:gap-10">
    <h2
      className={tw(
        "shrink-0 font-semibold sm:w-32 sm:text-end",
        labelClassName
      )}
    >
      {label}
    </h2>
    <div className="min-w-0 flex-1">{children}</div>
  </section>
);
