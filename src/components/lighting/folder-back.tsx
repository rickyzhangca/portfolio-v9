import { getResponsiveImageSources } from "@/cards/responsive-image";
import { FOLDER_SHAPE_SIZE } from "@/lib/folder-shape";
import { LAMP_LIFT } from "./lamp-shadows";
import { LampSprite } from "./lamp-sprite";

interface FolderBackProps {
  /** Panel colour when the cover has no image. */
  color?: string;
  image?: string;
  size: { height: number; width: number };
}

/** Corner radius of the folder outline (FOLDER_SHAPE_PATH), in its units. */
const OUTLINE_RADIUS = 38.4;

/**
 * The back panel of a folder, under its papers: the same board as the cover,
 * seen from inside and in the cover's shade, so the papers sit in the folder
 * rather than on the desk, and the thumb notch shows the inside.
 */
export const FolderBack = ({ color, image, size }: FolderBackProps) => {
  const sources = image ? getResponsiveImageSources(image) : null;
  return (
    <div
      className="pointer-events-none absolute top-0 left-0"
      data-lamp-shadow={LAMP_LIFT.folderBack}
      style={{ height: size.height, width: size.width }}
    >
      <LampSprite outline="box" />
      <div
        className="h-full w-full overflow-hidden"
        style={{
          backgroundColor: color,
          borderRadius: (OUTLINE_RADIUS * size.width) / FOLDER_SHAPE_SIZE.width,
          // The inside of the folder, in the front panel's shade.
          filter: "brightness(0.62) saturate(0.85)",
        }}
      >
        {sources ? (
          <img
            alt=""
            className="h-full w-full object-cover"
            height={size.height}
            src={sources.src}
            srcSet={sources.srcSet}
            width={size.width}
          />
        ) : null}
      </div>
    </div>
  );
};
