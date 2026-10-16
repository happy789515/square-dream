import { METERS_PER_PX, SPEED_PER_VERTEX } from "./constants";

/** Square is 1. Each extra vertex adds SPEED_PER_VERTEX. */
export function rollScale(sides: number): number {
  const extra = Math.max(0, Math.floor(sides) - 4);
  return 1 + extra * SPEED_PER_VERTEX;
}

export function formatRollScale(sides: number): string {
  return `${rollScale(sides).toFixed(2)}배`;
}

export function metersFromPixels(pixels: number): number {
  if (!Number.isFinite(pixels) || pixels <= 0) return 0;
  return pixels * METERS_PER_PX;
}

/** Whole meters below 1000. Kilometers with two decimals from 1000m. */
export function formatDistance(meters: number): string {
  const m = Number.isFinite(meters) ? Math.max(0, meters) : 0;
  if (m < 1000) return `${Math.floor(m)}m`;
  return `${(m / 1000).toFixed(2)}km`;
}
