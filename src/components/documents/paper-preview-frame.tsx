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
        <p className="bg-background2 text-foreground1/50 mx-2 mt-2 mb-1 w-fit rounded-full px-5 py-2 text-sm font-medium">
          {label}
        </p>
      ) : null}
      {children}
    </div>
  );
}
