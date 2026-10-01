/** Match the actual canvas instance, including cards nested in folders. */
export function getDocumentLayoutId(itemId: string, cardId: string) {
  return `document:${itemId}:${cardId}`;
}
