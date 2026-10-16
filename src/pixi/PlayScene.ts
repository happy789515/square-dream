import { Container, Graphics } from "pixi.js";
import type { RuntimeState } from "../core/types";
import type { PhysicsSample } from "../physics/world";
import { PolygonPlayer } from "./entities/PolygonPlayer";
import { EvolveEffect, type EvolveStep } from "./effects/EvolveEffect";
import { GroundLayer } from "./layers/GroundLayer";
import { ParallaxLayer } from "./layers/ParallaxLayer";
import { SkyLayer } from "./layers/SkyLayer";

export class PlayScene {
  readonly root = new Container();
  readonly sky = new SkyLayer();
  readonly parallax = new ParallaxLayer();
  readonly ground = new GroundLayer();
  readonly player = new PolygonPlayer();
  readonly evolve = new EvolveEffect();
  private readonly world = new Container();
  private readonly veil = new Graphics();
  private width = 1280;
  private height = 720;
  private evolving = false;

  constructor() {
    this.veil.eventMode = "none";
    this.veil.alpha = 0;
    this.world.addChild(this.ground.root, this.player.root);
    this.root.addChild(this.sky.root, this.parallax.root, this.world, this.veil, this.evolve.root);
  }

  async loadAssets(): Promise<void> {
    await this.parallax.load();
  }

  resize(width: number, height: number): void {
    this.width = width;
    this.height = height;
    this.sky.resize(width, height);
    this.parallax.resize(width, height);
    this.ground.resize(width, height);
    this.evolve.resize(width, height);
    this.player.setViewSize(width, height);
    this.veil.clear();
    this.veil.rect(0, 0, width, height).fill({ color: 0x000000, alpha: 0.78 });
  }

  beginEvolve(): void {
    this.evolving = true;
    this.root.addChild(this.player.root);
  }

  endEvolve(): void {
    this.evolving = false;
    this.veil.alpha = 0;
    this.world.addChild(this.player.root);
  }

  sync(state: RuntimeState, sample: PhysicsSample): void {
    this.sky.sync(sample.x);
    this.parallax.sync(sample.x);
    this.ground.setPolylines(sample.polylines);
    this.world.position.set(-sample.cameraX, -sample.cameraY);

    const pose = this.player.getEvolvePose();
    if (this.evolving && pose) {
      this.veil.alpha = pose.veil;
      const fromX = sample.x - sample.cameraX;
      const fromY = sample.y - sample.cameraY;
      const x = fromX + (this.width / 2 - fromX) * pose.focus;
      const y = fromY + (this.height / 2 - fromY) * pose.focus;
      this.player.syncEvolve(x, y, sample.angle * (1 - pose.focus));
      return;
    }

    this.veil.alpha = 0;
    this.player.syncBody(state.sides, sample.x, sample.y, sample.angle);
  }

  tickEvolve(dtMs: number, onCommit: () => void): EvolveStep {
    return this.evolve.update(dtMs, this.player, onCommit);
  }
}
