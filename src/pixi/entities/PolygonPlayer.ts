import { Container, Graphics } from "pixi.js";
import { GlowFilter } from "pixi-filters/glow";
import { easeOutBack, smoothstep } from "../../core/color";
import { COLORS, PLAYER_RADIUS } from "../../core/constants";
import { scatterRadius, vertexDotRadius } from "../../core/vertexLayout";

export interface EvolvePose {
  focus: number;
  veil: number;
  fillAlpha: number;
  edgeAmount: number;
  appear: number;
  spread: number;
  fromSides: number;
  toSides: number;
  morphing: boolean;
  color: number;
}

interface Point {
  x: number;
  y: number;
}

export class PolygonPlayer {
  readonly root = new Container();
  private readonly shape = new Graphics();
  private readonly tapRing = new Graphics();
  private readonly glow: GlowFilter;
  private drawnSides = 0;
  private pulse = 0;
  private strokeColor: number = COLORS.cyan;
  private evolvePose: EvolvePose | null = null;
  private viewWidth = 1280;
  private viewHeight = 720;
  squashX = 1;
  squashY = 1;

  constructor() {
    this.glow = new GlowFilter({
      distance: 18,
      outerStrength: 2,
      innerStrength: 0.35,
      color: COLORS.cyan,
      quality: 0.2,
      alpha: 0.9,
    });
    this.tapRing.blendMode = "add";
    this.tapRing.eventMode = "none";
    this.root.filters = [this.glow];
    this.root.addChild(this.shape, this.tapRing);
    this.setSides(4);
  }

  getColor(): number {
    return this.strokeColor;
  }

  hasEvolvePose(): boolean {
    return this.evolvePose !== null;
  }

  getEvolvePose(): EvolvePose | null {
    return this.evolvePose;
  }

  kick(): void {
    this.pulse = 1;
  }

  impact(amount: number): void {
    if (amount > this.pulse) this.pulse = amount;
  }

  clearPulse(): void {
    this.pulse = 0;
    this.squashX = 1;
    this.squashY = 1;
    this.tapRing.clear();
    this.glow.outerStrength = 2;
  }

  tickPulse(dtSec: number): void {
    if (this.pulse <= 0) return;
    this.pulse = Math.max(0, this.pulse - dtSec / 0.16);
    const k = this.pulse * this.pulse;
    this.squashX = 1 + 0.16 * k;
    this.squashY = 1 - 0.12 * k;
    this.glow.outerStrength = 2 + 5 * k;
    this.glow.color = this.strokeColor;
    this.tapRing.clear();
    if (this.pulse <= 0) return;
    const radius = PLAYER_RADIUS * (1.02 + (1 - this.pulse) * 0.45);
    this.tapRing.circle(0, 0, radius).stroke({
      width: 3,
      color: this.strokeColor,
      alpha: this.pulse * 0.85,
    });
  }

  setEvolvePose(pose: EvolvePose | null): void {
    this.evolvePose = pose;
  }

  completeEvolve(color: number, sides: number): void {
    this.strokeColor = color;
    this.evolvePose = null;
    this.squashX = 1;
    this.squashY = 1;
    this.drawnSides = -1;
    this.glow.outerStrength = 2;
    this.glow.color = color;
    this.setSides(sides);
  }

  setSides(sides: number): void {
    const n = Math.max(4, Math.floor(sides));
    if (n === this.drawnSides) return;
    this.drawnSides = n;
    if (this.evolvePose) return;
    this.drawSolid(n);
    this.glow.distance = 14 + Math.min(22, n * 0.35);
    this.glow.color = this.strokeColor;
  }

  setViewSize(width: number, height: number): void {
    this.viewWidth = width;
    this.viewHeight = height;
  }

  syncBody(sides: number, x: number, y: number, angle: number): void {
    this.setSides(sides);
    this.root.position.set(x, y);
    this.root.rotation = angle;
    this.root.scale.set(this.squashX, this.squashY);
  }

  syncEvolve(x: number, y: number, angle: number): void {
    const pose = this.evolvePose;
    if (!pose) return;
    this.drawEvolve(pose);
    this.root.position.set(x, y);
    this.root.rotation = angle;
    this.root.scale.set(1, 1);
    this.glow.color = pose.color;
    this.glow.outerStrength = 2 + pose.focus * 3;
  }

  private drawSolid(sides: number): void {
    const points = regularPoints(sides, PLAYER_RADIUS);
    const g = this.shape;
    g.clear();
    g.poly(flatten(points), true)
      .fill({ color: this.strokeColor, alpha: 0.45 })
      .stroke({ width: 4, color: this.strokeColor, join: "round", alignment: 0.5 });
  }

  private drawEvolve(pose: EvolvePose): void {
    const points = this.evolvePoints(pose);
    const g = this.shape;
    g.clear();
    this.tapRing.clear();

    if (pose.fillAlpha > 0.01) {
      g.poly(flatten(points), true).fill({ color: pose.color, alpha: pose.fillAlpha * 0.5 });
    }
    if (pose.edgeAmount > 0.01) {
      drawEdges(g, points, pose.edgeAmount, pose.color, 4 + 2 * pose.spread);
    }
    const orbit = this.orbitRadius(pose);
    const dot = vertexDotRadius(points.length, orbit);
    for (let i = 0; i < points.length; i++) {
      const point = points[i];
      if (!point) continue;
      const isNew = pose.morphing && i === points.length - 1;
      const pop = isNew ? Math.min(1, easeOutBack(pose.appear)) : 1;
      g.circle(point.x, point.y, Math.max(0.01, dot * pop)).fill({ color: pose.color });
    }
  }

  private orbitRadius(pose: EvolvePose): number {
    const reach = scatterRadius(this.viewWidth, this.viewHeight);
    return PLAYER_RADIUS + (reach - PLAYER_RADIUS) * pose.spread;
  }

  private evolvePoints(pose: EvolvePose): Point[] {
    const from = regularPoints(pose.fromSides, 1);
    const to = regularPoints(pose.toSides, 1);
    const shift = smoothstep(pose.appear);
    const count = pose.morphing ? pose.toSides : pose.fromSides;
    const orbit = this.orbitRadius(pose);
    const points: Point[] = [];
    for (let i = 0; i < count; i++) {
      const src = from[i];
      const dst = to[i];
      const isNew = pose.morphing && i === pose.toSides - 1;
      let dir: Point | undefined;
      if (!pose.morphing) dir = src;
      else if (isNew) dir = dst;
      else if (src && dst) dir = blendUnit(src, dst, shift);
      if (!dir) continue;
      points.push({ x: dir.x * orbit, y: dir.y * orbit });
    }
    return points;
  }
}

/** Same vertex phase as Matter.Bodies.polygon, so the sprite matches the collider. */
function regularPoints(sides: number, radius: number): Point[] {
  const n = Math.max(3, Math.floor(sides));
  const step = (Math.PI * 2) / n;
  const offset = step * 0.5;
  const points: Point[] = [];
  for (let i = 0; i < n; i++) {
    const angle = offset + i * step;
    points.push({ x: Math.cos(angle) * radius, y: Math.sin(angle) * radius });
  }
  return points;
}

function blendUnit(from: Point, to: Point, t: number): Point {
  const x = from.x + (to.x - from.x) * t;
  const y = from.y + (to.y - from.y) * t;
  const len = Math.hypot(x, y) || 1;
  return { x: x / len, y: y / len };
}

function flatten(points: Point[]): number[] {
  const flat: number[] = [];
  for (const point of points) flat.push(point.x, point.y);
  return flat;
}

function drawEdges(g: Graphics, points: Point[], amount: number, color: number, width: number): void {
  const reveal = Math.min(1, Math.max(0, amount));
  for (let i = 0; i < points.length; i++) {
    const start = points[i];
    const end = points[(i + 1) % points.length];
    if (!start || !end) continue;
    const midX = (start.x + end.x) / 2;
    const midY = (start.y + end.y) / 2;
    const startTipX = start.x + (midX - start.x) * reveal;
    const startTipY = start.y + (midY - start.y) * reveal;
    const endTipX = end.x + (midX - end.x) * reveal;
    const endTipY = end.y + (midY - end.y) * reveal;
    g.moveTo(start.x, start.y).lineTo(startTipX, startTipY).stroke({ width, color, cap: "round" });
    g.moveTo(end.x, end.y).lineTo(endTipX, endTipY).stroke({ width, color, cap: "round" });
  }
}
