/** Match the actual canvas instance, including cards nested in folders. */
export function getDocumentLayoutId(itemId: string, cardId: string) {
  return `document:${itemId}:${cardId}`;
}

export function getDocumentContentLayoutId(layoutId: string) {
  return `${layoutId}:content`;
}

export interface PaperSize {
  height: number;
  width: number;
}

export function getPaperPreviewLayout(size: PaperSize, inset: number) {
  if (
    !(
      Number.isFinite(size.width) &&
      Number.isFinite(size.height) &&
      Number.isFinite(inset) &&
      size.width > 0 &&
      size.height > 0 &&
      inset >= 0 &&
      inset * 2 < Math.min(size.width, size.height)
    )
  ) {
    throw new RangeError(
      "Paper preview needs positive bounds and a fitting inset"
    );
  }
  const scale = Math.min(
    (size.width - inset * 2) / size.width,
    (size.height - inset * 2) / size.height
  );
  const width = size.width * scale;
  const height = size.height * scale;
  return {
    height,
    scale,
    width,
    x: (size.width - width) / 2,
    y: (size.height - height) / 2,
  };
}
