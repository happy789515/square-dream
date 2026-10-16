export const CHUNK_WIDTH = 1400;
export const TERRAIN_BASE_Y = 560;
export const TERRAIN_DEPTH = 420;

const SAMPLE_STEP = 50;
const MAX_SLOPE = Math.tan((30 * Math.PI) / 180);
const MIN_CLIFF_DX = 8;

export interface TerrainPoint {
  x: number;
  y: number;
}

type Motif = "hills" | "up" | "down" | "cliff";

const startYCache = new Map<string, number>();
const relativeCache = new Map<string, TerrainPoint[]>();

function cacheKey(seed: number, index: number): string {
  return `${seed}:${index}`;
}

/** Deterministic 0..1 value. Negative chunk indexes stay stable. */
function unit(seed: number, index: number, salt: number): number {
  let h = (seed | 0) ^ Math.imul(index | 0, 0x9e3779b1) ^ Math.imul(salt | 0, 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 16), 0x7feb352d);
  h = Math.imul(h ^ (h >>> 15), 0x846ca68b);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

function motifOf(seed: number, index: number): Motif {
  if (index === 0 || index === 1) return "hills";
  const table: Motif[] = ["hills", "up", "down", "cliff"];
  return table[Math.floor(unit(seed, index, 1) * table.length)] ?? "hills";
}

function deltaY(seed: number, index: number): number {
  const points = relativePoints(seed, index);
  const last = points[points.length - 1];
  return last ? last.y : 0;
}

function startY(seed: number, index: number): number {
  const key = cacheKey(seed, index);
  const cached = startYCache.get(key);
  if (cached !== undefined) return cached;

  if (!startYCache.has(cacheKey(seed, 0))) startYCache.set(cacheKey(seed, 0), TERRAIN_BASE_Y);

  if (index >= 0) {
    let from = 0;
    let y = TERRAIN_BASE_Y;
    for (let k = index; k >= 0; k--) {
      const known = startYCache.get(cacheKey(seed, k));
      if (known !== undefined) {
        from = k;
        y = known;
        break;
      }
    }
    for (let k = from; k < index; k++) {
      y += deltaY(seed, k);
      startYCache.set(cacheKey(seed, k + 1), y);
    }
    return y;
  }

  let from = 0;
  let y = startYCache.get(cacheKey(seed, 0)) ?? TERRAIN_BASE_Y;
  for (let k = -1; k >= index; k--) {
    const known = startYCache.get(cacheKey(seed, k));
    if (known !== undefined) {
      from = k;
      y = known;
      break;
    }
  }
  for (let k = from; k > index; k--) {
    y -= deltaY(seed, k - 1);
    startYCache.set(cacheKey(seed, k - 1), y);
  }
  return startYCache.get(key) ?? y;
}

function push(points: TerrainPoint[], x: number, y: number): void {
  const prev = points[points.length - 1];
  if (prev && Math.abs(prev.x - x) < 0.01 && Math.abs(prev.y - y) < 0.01) return;
  points.push({ x, y });
}

function walkFlats(
  points: TerrainPoint[],
  x0: number,
  x1: number,
  y: number,
): void {
  if (x1 < x0) return;
  const span = x1 - x0;
  const steps = Math.max(1, Math.round(span / SAMPLE_STEP));
  for (let i = 1; i <= steps; i++) push(points, x0 + (span * i) / steps, y);
}

function relativePoints(seed: number, index: number): TerrainPoint[] {
  const key = cacheKey(seed, index);
  const cached = relativeCache.get(key);
  if (cached) return cached;

  const startX = index * CHUNK_WIDTH;
  const endX = startX + CHUNK_WIDTH;
  const points: TerrainPoint[] = [{ x: startX, y: 0 }];
  const kind = motifOf(seed, index);

  if (kind === "hills") fillHills(points, seed, index, startX, endX);
  else if (kind === "up" || kind === "down") fillRamp(points, seed, index, startX, endX, kind);
  else fillCliff(points, seed, index, startX, endX);

  const last = points[points.length - 1];
  if (!last || last.x < endX - 0.01) push(points, endX, last?.y ?? 0);
  else last.x = endX;

  relativeCache.set(key, points);
  return points;
}

function fillHills(
  points: TerrainPoint[],
  seed: number,
  index: number,
  startX: number,
  endX: number,
): void {
  const waves = index <= 1 ? 1 : 1 + Math.floor(unit(seed, index, 4) * 2);
  const ampCap = (MAX_SLOPE * CHUNK_WIDTH) / (waves * Math.PI * 2);
  const gentle = index <= 1;
  const raw = gentle ? 16 + unit(seed, index, 2) * 18 : 28 + unit(seed, index, 2) * 36;
  const amp = Math.min(raw, ampCap * 0.92);
  const phase = unit(seed, index, 3) * Math.PI * 2;
  const steps = Math.round(CHUNK_WIDTH / SAMPLE_STEP);
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    const y = amp * (Math.sin(phase + t * waves * Math.PI * 2) - Math.sin(phase));
    push(points, startX + (endX - startX) * t, y);
  }
}

function fillRamp(
  points: TerrainPoint[],
  seed: number,
  index: number,
  startX: number,
  endX: number,
  kind: "up" | "down",
): void {
  const slope = 0.2 + unit(seed, index, 2) * (MAX_SLOPE - 0.2);
  const rampLen = 420 + unit(seed, index, 3) * 380;
  const leadMax = Math.max(0, CHUNK_WIDTH - rampLen - 280);
  const lead = 140 + unit(seed, index, 4) * leadMax;
  const ramp0 = startX + lead;
  const ramp1 = ramp0 + rampLen;
  const rise = slope * rampLen;
  const sign = kind === "up" ? -1 : 1;
  const yAt = (x: number): number => {
    if (x <= ramp0) return 0;
    if (x >= ramp1) return sign * rise;
    return sign * rise * ((x - ramp0) / rampLen);
  };
  const steps = Math.round(CHUNK_WIDTH / SAMPLE_STEP);
  for (let i = 1; i <= steps; i++) {
    const x = startX + ((endX - startX) * i) / steps;
    push(points, x, yAt(x));
  }
}

function fillCliff(
  points: TerrainPoint[],
  seed: number,
  index: number,
  startX: number,
  endX: number,
): void {
  const drop = 200 + unit(seed, index, 2) * 180;
  const landing = 220;
  const lipSpan = Math.max(0, CHUNK_WIDTH - MIN_CLIFF_DX - landing - 240);
  const lip = startX + 240 + unit(seed, index, 3) * lipSpan;
  const toe = lip + MIN_CLIFF_DX;
  walkFlats(points, startX, lip, 0);
  push(points, toe, drop);
  walkFlats(points, toe, endX, drop);
}

/** World-space surface polyline for one chunk. Shared by the collider and the renderer. */
export function chunkPoints(seed: number, index: number): TerrainPoint[] {
  const origin = startY(seed, index);
  return relativePoints(seed, index).map((point) => ({ x: point.x, y: point.y + origin }));
}

/** Surface height at a world x. Larger y is lower on screen. */
export function surfaceY(seed: number, x: number): number {
  const index = Math.floor(x / CHUNK_WIDTH);
  const points = chunkPoints(seed, index);
  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i];
    const b = points[i + 1];
    if (!a || !b) continue;
    if (x < a.x || x > b.x) continue;
    const span = b.x - a.x;
    const t = span === 0 ? 0 : (x - a.x) / span;
    return a.y + (b.y - a.y) * t;
  }
  return points[points.length - 1]?.y ?? TERRAIN_BASE_Y;
}
