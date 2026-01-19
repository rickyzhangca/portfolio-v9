import { motion } from "framer-motion";
import { memo } from "react";
import type { ProfilePicCardContent } from "@/types/canvas";

interface ProfilePicCardContentProps {
  data: ProfilePicCardContent;
}

const ProfilePicCardContentComponent = ({
  data,
}: ProfilePicCardContentProps) => {
  return (
    <div className="relative flex h-full items-center justify-center overflow-hidden rounded-lg">
      {/** biome-ignore lint/correctness/useImageSize: follows container size */}
      <motion.img
        alt={data.alt || "Profile picture"}
        className="rounded-full border-6 border-white"
        src={data.imageUrl}
        whileHover={{ scale: 1.05 }}
      />
    </div>
  );
};

export const ProfilePicCardContentView = memo(ProfilePicCardContentComponent);
