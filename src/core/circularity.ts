/** Display-only. Caps at 99 so the polygon never reads as a finished circle. */
export function circularityPercent(sides: number): number {
  if (!Number.isFinite(sides) || sides <= 1) return 0;
  const raw = Math.round((1 - 1 / sides) * 100);
  return Math.min(99, Math.max(0, raw));
}
