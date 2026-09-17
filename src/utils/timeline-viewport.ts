/** Preserve the viewed chronological center when a viewport changes width. */
export function resizeTimelineViewport(left: number, previousWidth: number, nextWidth: number, contentWidth: number) {
  // A complete chronology is centered within a wider viewport.
  const center = left + Math.min(previousWidth, contentWidth) / 2;
  return Math.max(0, Math.min(Math.max(0, contentWidth - nextWidth), center - nextWidth / 2));
}
