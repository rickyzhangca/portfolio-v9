import type { ComponentProps } from "react";
import { tw } from "@/lib/utils";

export function ArticleImage({
  className,
  alt = "",
  width,
  height,
  ...props
}: ComponentProps<"img">) {
  return (
    <img
      alt={alt}
      className={tw("my-8 h-auto w-full rounded-xl", className)}
      decoding="async"
      height={height}
      loading="lazy"
      width={width}
      {...props}
    />
  );
}
