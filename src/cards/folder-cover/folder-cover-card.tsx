import type { FolderCoverCardContent } from "@/cards/registry";

export function FolderCoverCard({
  content,
}: {
  content: FolderCoverCardContent;
}) {
  return (
    <div className="h-full bg-[#d7e4d4] p-4">
      <p className="wrap-break-word whitespace-pre-wrap font-hand text-sm">
        {content.label}
      </p>
    </div>
  );
}
