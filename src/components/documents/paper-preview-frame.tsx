import type { ReactNode } from "react";

export function PaperPreviewFrame({
  label,
  children,
}: {
  label?: string;
  children: ReactNode;
}) {
  return (
    <div className="h-full w-full overflow-hidden rounded-3xl bg-white">
      {label ? (
        <p className="mx-2 mt-2 mb-1 w-fit rounded-full bg-background2 px-5 py-2 font-medium text-foreground1/50 text-sm">
          {label}
        </p>
      ) : null}
      {children}
    </div>
  );
}
