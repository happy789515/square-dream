import { Container } from "pixi.js";
import {
  EVOLVE_DISSOLVE_END,
  EVOLVE_EDGE_END,
  EVOLVE_FILL_END,
  EVOLVE_MS,
  EVOLVE_REFORM_END,
  EVOLVE_RISE_END,
  EVOLVE_SCATTER_END,
  EVOLVE_VERTEX_END,
} from "../../core/constants";
import { lerpColor, randomColor, smoothstep } from "../../core/color";
import type { EvolvePose, PolygonPlayer } from "../entities/PolygonPlayer";

export type EvolveStep = "idle" | "running" | "commit" | "done";

export class EvolveEffect {
  readonly root = new Container();
  private elapsed = 0;
  private running = false;
  private committed = false;
  private fromSides = 4;
  private fromColor = 0x00f5d4;
  private toColor = 0x00f5d4;

  resize(_width: number, _height: number): void {}

  start(player: PolygonPlayer, fromSides: number): void {
    this.elapsed = 0;
    this.running = true;
    this.committed = false;
    this.fromSides = Math.max(4, Math.floor(fromSides));
    this.fromColor = player.getColor();
    this.toColor = randomColor();
    player.setEvolvePose(this.pose(0));
  }

  update(dtMs: number, player: PolygonPlayer, onCommit: () => void): EvolveStep {
    if (!this.running) return "idle";
    this.elapsed = Math.min(EVOLVE_MS, this.elapsed + dtMs);
    player.setEvolvePose(this.pose(this.elapsed));

    if (!this.committed && this.elapsed >= EVOLVE_SCATTER_END) {
      this.committed = true;
      onCommit();
    }

    if (this.elapsed >= EVOLVE_MS) {
      this.running = false;
      player.completeEvolve(this.toColor, this.fromSides + 1);
      return "done";
    }
    return "running";
  }

  private pose(elapsed: number): EvolvePose {
    const rise = phase(elapsed, 0, EVOLVE_RISE_END);
    const dissolve = phase(elapsed, EVOLVE_RISE_END, EVOLVE_DISSOLVE_END);
    const scatter = phase(elapsed, EVOLVE_DISSOLVE_END, EVOLVE_SCATTER_END);
    const appear = phase(elapsed, EVOLVE_SCATTER_END, EVOLVE_VERTEX_END);
    const edges = phase(elapsed, EVOLVE_VERTEX_END, EVOLVE_EDGE_END);
    const fill = phase(elapsed, EVOLVE_EDGE_END, EVOLVE_FILL_END);
    const contract = phase(elapsed, EVOLVE_FILL_END, EVOLVE_REFORM_END);
    const morphing = elapsed >= EVOLVE_SCATTER_END;
    const forming = elapsed >= EVOLVE_VERTEX_END;
    const focus = elapsed >= EVOLVE_RISE_END ? 1 : smoothstep(rise);

    let spread = 0;
    if (elapsed >= EVOLVE_FILL_END) spread = 1 - smoothstep(contract);
    else if (elapsed >= EVOLVE_SCATTER_END) spread = 1;
    else if (elapsed >= EVOLVE_DISSOLVE_END) spread = smoothstep(scatter);

    return {
      focus,
      veil: focus,
      fillAlpha: forming ? smoothstep(fill) : elapsed >= EVOLVE_DISSOLVE_END ? 0 : 1 - smoothstep(dissolve),
      edgeAmount: forming ? smoothstep(edges) : elapsed >= EVOLVE_DISSOLVE_END ? 0 : 1 - smoothstep(dissolve),
      appear,
      spread,
      fromSides: this.fromSides,
      toSides: this.fromSides + 1,
      morphing,
      color: morphing ? lerpColor(this.fromColor, this.toColor, smoothstep(appear)) : this.fromColor,
    };
  }
}

function phase(elapsed: number, start: number, end: number): number {
  if (elapsed <= start) return 0;
  if (elapsed >= end) return 1;
  return (elapsed - start) / (end - start);
}
