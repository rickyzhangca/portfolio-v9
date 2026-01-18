import { resumeConfig } from "@/data/resume";
import { cn } from "@/lib/utils";

export const RESUME_SHEET_SIZE = {
  width: 840,
  height: 1188,
} as const;

interface ResumeSheetProps {
  className?: string;
  interactive?: boolean;
}

export const ResumeSheet = ({
  className,
  interactive = true,
}: ResumeSheetProps) => {
  return (
    <article
      className={cn(
        "h-full w-full bg-white text-foreground1",
        !interactive && "pointer-events-none select-none",
        className
      )}
      style={{
        width: RESUME_SHEET_SIZE.width,
        height: RESUME_SHEET_SIZE.height,
      }}
    >
      <div className="flex h-full flex-col gap-8 px-14 py-12">
        <header className="flex items-start justify-between gap-10">
          <div className="min-w-0">
            <h1 className="truncate font-bold text-[40px] leading-[1.1] tracking-tight">
              {resumeConfig.name}
            </h1>
            <p className="mt-2 text-foreground2 text-lg">
              {resumeConfig.headline}
            </p>
            <p className="mt-1 text-foreground2 text-sm">
              {resumeConfig.location}
            </p>
          </div>

          <div className="flex flex-col items-end gap-1 text-right text-[13px] text-foreground2">
            <a
              className="no-drag text-foreground1 underline decoration-border underline-offset-4 hover:decoration-foreground2"
              href={`mailto:${resumeConfig.email}`}
            >
              {resumeConfig.email}
            </a>
            <div className="flex flex-col items-end gap-0.5">
              {resumeConfig.links.map((link) => (
                <a
                  className="no-drag underline decoration-border underline-offset-4 hover:decoration-foreground2"
                  href={link.url}
                  key={link.url}
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  {link.label}
                </a>
              ))}
            </div>
          </div>
        </header>

        <section className="grid grid-cols-[1fr_240px] gap-10">
          <div className="min-w-0">
            <h2 className="font-semibold text-[13px] tracking-[0.14em] text-foreground2 uppercase">
              Summary
            </h2>
            <p className="mt-3 text-[15px] leading-relaxed">
              {resumeConfig.summary}
            </p>

            <h2 className="mt-10 font-semibold text-[13px] tracking-[0.14em] text-foreground2 uppercase">
              Experience
            </h2>
            <div className="mt-4 flex flex-col gap-6">
              {resumeConfig.experience.map((item) => (
                <div className="rounded-2xl border border-border p-4" key={item.company}>
                  <div className="flex items-baseline justify-between gap-4">
                    <div className="min-w-0">
                      <div className="truncate font-semibold">{item.company}</div>
                      <div className="truncate text-foreground2 text-sm">
                        {item.title}
                      </div>
                    </div>
                    <div className="flex-shrink-0 text-foreground2 text-sm">
                      {item.period}
                    </div>
                  </div>
                  <ul className="mt-3 list-disc space-y-1 pl-5 text-[14px] leading-relaxed">
                    {item.bullets.map((bullet) => (
                      <li key={bullet}>{bullet}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>

          <aside className="flex flex-col gap-10">
            <div>
              <h2 className="font-semibold text-[13px] tracking-[0.14em] text-foreground2 uppercase">
                Skills
              </h2>
              <div className="mt-3 flex flex-wrap gap-2">
                {resumeConfig.skills.map((skill) => (
                  <span
                    className="rounded-full border border-border bg-background2 px-3 py-1 text-[12px]"
                    key={skill}
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>

            <div>
              <h2 className="font-semibold text-[13px] tracking-[0.14em] text-foreground2 uppercase">
                Education
              </h2>
              <div className="mt-3 flex flex-col gap-3">
                {resumeConfig.education.map((item) => (
                  <div className="rounded-2xl border border-border p-4" key={item.school}>
                    <div className="font-semibold">{item.school}</div>
                    <div className="text-foreground2 text-sm">{item.degree}</div>
                    <div className="mt-1 text-foreground2 text-sm">
                      {item.period}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </aside>
        </section>

        <footer className="mt-auto flex items-center justify-between text-[12px] text-foreground2">
          <span>Built with React</span>
          <a
            className="no-drag underline decoration-border underline-offset-4 hover:decoration-foreground2"
            href={resumeConfig.pdfUrl}
            rel="noopener noreferrer"
            target="_blank"
          >
            Download PDF
          </a>
        </footer>
      </div>
    </article>
  );
};

