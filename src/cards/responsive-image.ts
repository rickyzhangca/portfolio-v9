// Card images are encoded for 3x screens, which most visitors do not have.
// Each one in these folders has a "-2x" sibling sized for its card at 2x
// (720px project screenshots, 480px covers) at about a third of the bytes.
const VARIANT_SUFFIX = "-2x.webp";
const WEBP_EXTENSION = /\.webp$/;

const urls = import.meta.glob<string>(
  "../assets/{covers,mintlify,mosaic,rbc,wealthsimple}/*.webp",
  { eager: true, import: "default" }
);

const smallUrlByFullUrl = new Map<string, string>();
for (const [path, url] of Object.entries(urls)) {
  const small = path.endsWith(VARIANT_SUFFIX)
    ? undefined
    : urls[path.replace(WEBP_EXTENSION, VARIANT_SUFFIX)];
  if (small) {
    smallUrlByFullUrl.set(url, small);
  }
}

export interface ResponsiveImageSources {
  src: string;
  srcSet?: string;
}

/** Picks the 2x copy for 1x and 2x screens when the image has one. */
export const getResponsiveImageSources = (
  image: string
): ResponsiveImageSources => {
  const small = smallUrlByFullUrl.get(image);
  return small
    ? { src: small, srcSet: `${small} 2x, ${image} 3x` }
    : { src: image };
};
