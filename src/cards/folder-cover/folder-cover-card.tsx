import type { FolderCoverCardContent } from "@/cards/registry";

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
          height={1360}
          src={content.image}
          width={960}
        />
      ) : null}
      <p className="wrap-break-word relative translate-x-1 translate-y-1 whitespace-pre-wrap font-hand text-sm">
        {content.label}
      </p>
    </div>
  );
}
