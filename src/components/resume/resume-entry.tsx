import type { ReactNode } from "react";

interface ResumeEntryProps {
  children: ReactNode;
  dates?: string;
  logo?: string;
  logoAlt: string;
  subtitle?: string;
  title?: string;
}

/** A logo, a title with its organization and dates, then the details. */
export const ResumeEntry = ({
  children,
  dates,
  logo,
  logoAlt,
  subtitle,
  title,
}: ResumeEntryProps) => (
  <div className="flex items-start gap-3">
    <img
      alt={logoAlt}
      className="-mt-px shrink-0"
      height={28}
      src={logo}
      width={28}
    />
    <div className="flex min-w-0 flex-col gap-3">
      <div>
        <h3 className="flex flex-wrap items-baseline gap-x-2 text-balance">
          <span className="font-semibold">{title}</span>
          <span className="text-foreground1/65">{subtitle}</span>
        </h3>
        <p className="mt-1 whitespace-pre-line text-foreground1/65 text-sm/[20px] tabular-nums">
          {dates}
        </p>
      </div>
      {children}
    </div>
  </div>
);
