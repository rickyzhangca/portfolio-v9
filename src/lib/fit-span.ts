/**
 * Start position that keeps a span of `size` inside `[margin, bound - margin]`,
 * moving it as little as possible from `start`. A span too large to fit sits at
 * the leading margin so its beginning stays readable.
 */
export const fitSpan = (
  start: number,
  size: number,
  bound: number,
  margin: number
) => {
  const max = bound - margin - size;
  if (max < margin) {
    return margin;
  }
  return Math.min(max, Math.max(margin, start));
};
