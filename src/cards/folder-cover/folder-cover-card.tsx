import type { FolderCoverCardContent } from "@/cards/registry";
import { getResponsiveImageSources } from "@/cards/responsive-image";
import { LAMP_LIFT } from "@/components/lighting/lamp-shadows";
import { PaperLighting } from "@/components/lighting/lit-paper";

/** The label's corner radius, in CSS px. */
const LABEL_RADIUS = 3;

export function FolderCoverCard({
  content,
}: {
  content: FolderCoverCardContent;
}) {
  return (
    <div className="relative h-full bg-[#d7e4d4] p-4">
      {content.image ? (
        <img
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
          height={1020}
          width={720}
          {...getResponsiveImageSources(content.image)}
        />
      ) : null}
      {/* A paper label stuck on the folder, a little askew. */}
      <div
        className="relative isolate mt-2.5 ml-2.5 inline-block -rotate-2 bg-[#fbf8f1] px-3 py-1.5 drop-shadow-[0_1px_1.5px_rgba(0,0,0,0.14)]"
        data-lamp-shadow={LAMP_LIFT.label}
        style={{ borderRadius: LABEL_RADIUS }}
      >
        <p className="wrap-break-word whitespace-pre-wrap font-hand text-sm">
          {content.label}
        </p>
        <PaperLighting kind="label" radius={LABEL_RADIUS} />
      </div>
    </div>
  );
}
