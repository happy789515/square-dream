import { Container, Graphics } from "pixi.js";
import { COLORS } from "../../core/constants";
import { TERRAIN_DEPTH, type TerrainPoint } from "../../core/terrain";

export class GroundLayer {
  readonly root = new Container();
  private readonly shape = new Graphics();
  private key = "";

  constructor() {
    this.root.addChild(this.shape);
  }

  resize(_width: number, _height: number): void {}

  setPolylines(lines: TerrainPoint[][]): void {
    const key = lines.map((line) => (line[0] ? `${line[0].x}:${line.length}` : "")).join("|");
    if (key === this.key) return;
    this.key = key;
    this.draw(lines);
  }

  private draw(lines: TerrainPoint[][]): void {
    const g = this.shape;
    g.clear();
    for (const line of lines) {
      if (line.length < 2) continue;
      const first = line[0];
      const last = line[line.length - 1];
      if (!first || !last) continue;
      const fill: number[] = [];
      for (const point of line) fill.push(point.x, point.y);
      fill.push(last.x, last.y + TERRAIN_DEPTH, first.x, first.y + TERRAIN_DEPTH);
      g.poly(fill, true).fill({ color: 0x070b12, alpha: 1 });

      const stroke: number[] = [];
      for (const point of line) stroke.push(point.x, point.y);
      g.poly(stroke, false).stroke({
        width: 3,
        color: COLORS.cyan,
        alpha: 0.95,
        join: "round",
        cap: "round",
      });
    }
  }
}
