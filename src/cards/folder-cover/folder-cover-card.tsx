import { PencilLineIcon } from "@phosphor-icons/react";
import type { FolderCoverCardContent } from "@/cards/registry";

export function FolderCoverCard({
  content,
}: {
  content: FolderCoverCardContent;
}) {
  return (
    <div className="relative flex h-full flex-col justify-between bg-[#d7e4d4] p-7">
      <div>
        <p className="font-hand text-4xl text-[#344c3e] leading-tight">
          {content.label}
        </p>
        <p className="mt-3 text-[#344c3e]/60 text-sm">
          {content.count} essays & notes
        </p>
      </div>
      <div className="flex justify-end">
        <PencilLineIcon
          aria-hidden="true"
          className="text-[#344c3e]/70"
          size={60}
          weight="light"
        />
      </div>
      <p className="font-hand text-[#344c3e]/70 text-sm">
        Ideas, written down.
      </p>
    </div>
  );
}
