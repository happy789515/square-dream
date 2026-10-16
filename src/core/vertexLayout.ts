const MARGIN = 72;

/** Circle radius that fits the shorter screen side, inset so dots stay on screen. */
export function scatterRadius(viewWidth: number, viewHeight: number): number {
  const short = Math.min(viewWidth, viewHeight);
  return Math.max(1, short / 2 - MARGIN);
}

/** Largest dot that still leaves a gap between neighbors on a circle. */
export function vertexDotRadius(count: number, orbit: number): number {
  const n = Math.max(3, Math.floor(count));
  const chord = 2 * orbit * Math.sin(Math.PI / n);
  const fit = chord * 0.38;
  const preferred = Math.min(14, Math.max(3.5, orbit * 0.045));
  return Math.max(0.01, Math.min(preferred, fit));
}
