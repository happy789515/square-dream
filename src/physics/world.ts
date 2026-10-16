import Matter from "matter-js";
import { PLAYER_RADIUS, SCROLL_SPEED } from "../core/constants";
import { rollScale } from "../core/distance";
import { playerX } from "../core/layout";
import {
  CHUNK_WIDTH,
  TERRAIN_DEPTH,
  chunkPoints,
  surfaceY,
  type TerrainPoint,
} from "../core/terrain";
import type { RuntimeState } from "../core/types";

const STEP_MS = 1000 / 60;
const GRAVITY_SCALE = 0.002;
const TARGET_VX = SCROLL_SPEED / 60;
const OMEGA_STEP = 0.008;
const REST_CLEARANCE = PLAYER_RADIUS + 8;
const LAUNCH_VY = -24;

export interface BodyPose {
  x: number;
  y: number;
  vx: number;
  vy: number;
  angle: number;
  angularVelocity: number;
}

export interface PhysicsSample extends BodyPose {
  cameraX: number;
  cameraY: number;
  polylines: TerrainPoint[][];
}

interface LiveChunk {
  index: number;
  bodies: Matter.Body[];
  points: TerrainPoint[];
}

export class PhysicsWorld {
  readonly seed: number;
  private readonly engine: Matter.Engine;
  private player: Matter.Body;
  private readonly chunks = new Map<number, LiveChunk>();
  private accumulator = 0;
  private grounded = false;
  private frozen = false;
  private cameraX = 0;
  private cameraY = 0;
  private cameraLive = false;
  private impact = 0;
  private sides = 4;

  constructor(seed: number) {
    this.seed = seed;
    this.engine = Matter.Engine.create({ enableSleeping: false });
    this.engine.gravity.x = 0;
    this.engine.gravity.y = 1;
    this.engine.gravity.scale = GRAVITY_SCALE;
    this.player = createPlayer(4, 0, 0, 0);
    Matter.Composite.add(this.engine.world, this.player);
    Matter.Events.on(this.engine, "beforeUpdate", this.onBeforeUpdate);
    Matter.Events.on(this.engine, "collisionActive", this.onCollisionActive);
    Matter.Events.on(this.engine, "collisionStart", this.onCollisionStart);
  }

  destroy(): void {
    Matter.Events.off(this.engine, "beforeUpdate", this.onBeforeUpdate);
    Matter.Events.off(this.engine, "collisionActive", this.onCollisionActive);
    Matter.Events.off(this.engine, "collisionStart", this.onCollisionStart);
    Matter.Composite.clear(this.engine.world, false, true);
    this.chunks.clear();
  }

  spawn(state: RuntimeState): void {
    const x = state.x;
    const ground = surfaceY(this.seed, x);
    const restY = ground - REST_CLEARANCE;
    const y = state.y > restY ? restY : state.y;
    this.replacePlayer(state.sides, {
      x,
      y,
      vx: state.vx,
      vy: state.vy,
      angle: state.angle,
      angularVelocity: state.angularVelocity,
    });
    this.frozen = false;
    this.cameraLive = false;
    this.syncChunks();
  }

  step(dtSec: number): void {
    if (this.frozen) return;
    this.accumulator += dtSec * 1000;
    if (this.accumulator > 100) this.accumulator = 100;
    let guard = 0;
    while (this.accumulator >= STEP_MS && guard < 6) {
      this.syncChunks();
      this.applyDrive();
      Matter.Engine.update(this.engine, STEP_MS);
      this.accumulator -= STEP_MS;
      guard += 1;
    }
  }

  capture(): BodyPose {
    return {
      x: this.player.position.x,
      y: this.player.position.y,
      vx: this.player.velocity.x,
      vy: this.player.velocity.y,
      angle: this.player.angle,
      angularVelocity: this.player.angularVelocity,
    };
  }

  freeze(): void {
    this.frozen = true;
    Matter.Body.setStatic(this.player, true);
  }

  restore(sides: number, pose: BodyPose): void {
    this.replacePlayer(sides, pose);
    this.frozen = false;
  }

  /** Drops the finished shape back into the live world and throws it upward. */
  launch(sides: number, pose: BodyPose, viewHeight: number): void {
    this.restore(sides, {
      x: pose.x,
      y: this.cameraY + viewHeight * 0.5,
      vx: pose.vx,
      vy: LAUNCH_VY,
      angle: pose.angle,
      angularVelocity: pose.angularVelocity,
    });
  }

  consumeImpact(): number {
    const value = this.impact;
    this.impact = 0;
    return value;
  }

  write(state: RuntimeState): void {
    state.x = this.player.position.x;
    state.y = this.player.position.y;
    state.vx = this.player.velocity.x;
    state.vy = this.player.velocity.y;
    state.angle = this.player.angle;
    state.angularVelocity = this.player.angularVelocity;
    state.terrainSeed = this.seed;
  }

  sample(viewWidth: number, viewHeight: number): PhysicsSample {
    this.cameraX = this.player.position.x - playerX(viewWidth);
    if (!this.frozen) {
      const targetY = this.player.position.y - viewHeight * 0.62;
      if (!this.cameraLive) {
        this.cameraY = targetY;
        this.cameraLive = true;
      } else {
        this.cameraY += (targetY - this.cameraY) * 0.14;
      }
    }
    const polylines: TerrainPoint[][] = [];
    const ordered = [...this.chunks.keys()].sort((a, b) => a - b);
    for (const index of ordered) {
      const chunk = this.chunks.get(index);
      if (chunk) polylines.push(chunk.points);
    }
    return {
      x: this.player.position.x,
      y: this.player.position.y,
      vx: this.player.velocity.x,
      vy: this.player.velocity.y,
      angle: this.player.angle,
      angularVelocity: this.player.angularVelocity,
      cameraX: this.cameraX,
      cameraY: this.cameraY,
      polylines,
    };
  }

  private replacePlayer(sides: number, pose: BodyPose): void {
    this.sides = Math.max(4, Math.floor(sides));
    Matter.Composite.remove(this.engine.world, this.player);
    this.player = createPlayer(this.sides, pose.x, pose.y, pose.angle);
    Matter.Body.setVelocity(this.player, { x: pose.vx, y: pose.vy });
    Matter.Body.setAngularVelocity(this.player, pose.angularVelocity);
    Matter.Composite.add(this.engine.world, this.player);
  }

  private applyDrive(): void {
    if (!this.grounded || this.player.isStatic) return;
    const apothem = PLAYER_RADIUS * Math.cos(Math.PI / this.sides);
    const targetOmega = (TARGET_VX * rollScale(this.sides)) / apothem;
    const deficit = targetOmega - this.player.angularVelocity;
    if (deficit <= 0.001) return;
    const gain = Math.min(deficit, OMEGA_STEP);
    this.player.torque += (this.player.inertia * gain) / (STEP_MS * STEP_MS);
  }

  private syncChunks(): void {
    const index = Math.floor(this.player.position.x / CHUNK_WIDTH);
    for (let i = index - 2; i <= index + 3; i++) this.ensureChunk(i);
    for (const [key, chunk] of this.chunks) {
      if (key < index - 3 || key > index + 4) {
        for (const body of chunk.bodies) Matter.Composite.remove(this.engine.world, body);
        this.chunks.delete(key);
      }
    }
  }

  private ensureChunk(index: number): void {
    if (this.chunks.has(index)) return;
    const points = chunkPoints(this.seed, index);
    const bodies: Matter.Body[] = [];
    for (let i = 0; i < points.length - 1; i++) {
      const a = points[i];
      const b = points[i + 1];
      if (!a || !b) continue;
      const body = segmentBody(a, b);
      if (body) bodies.push(body);
    }
    Matter.Composite.add(this.engine.world, bodies);
    this.chunks.set(index, { index, bodies, points });
  }

  private onBeforeUpdate = (): void => {
    this.grounded = false;
  };

  private onCollisionActive = (event: Matter.IEventCollision<Matter.Engine>): void => {
    for (const pair of event.pairs) {
      const hit =
        pair.bodyA === this.player ||
        pair.bodyB === this.player ||
        pair.bodyA.parent === this.player ||
        pair.bodyB.parent === this.player;
      if (hit) this.grounded = true;
    }
  };

  private onCollisionStart = (event: Matter.IEventCollision<Matter.Engine>): void => {
    for (const pair of event.pairs) {
      if (pair.bodyA !== this.player && pair.bodyB !== this.player && pair.bodyA.parent !== this.player && pair.bodyB.parent !== this.player) {
        continue;
      }
      const normal = pair.collision.normal;
      const vn = this.player.velocity.x * normal.x + this.player.velocity.y * normal.y;
      const hit = Math.abs(vn);
      if (hit <= 2.2) continue;
      this.impact = Math.max(this.impact, Math.min(1, (hit - 2.2) / 6));
    }
  };
}

function createPlayer(sides: number, x: number, y: number, angle: number): Matter.Body {
  const n = Math.max(4, Math.floor(sides));
  const body = Matter.Bodies.polygon(x, y, n, PLAYER_RADIUS, {
    label: "player",
    friction: 0.95,
    frictionStatic: 0.95,
    frictionAir: 0.002,
    restitution: 0.06,
    sleepThreshold: Infinity,
    angle,
  });
  return body;
}

function segmentBody(a: TerrainPoint, b: TerrainPoint): Matter.Body | null {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.hypot(dx, dy);
  if (len < 1) return null;
  const angle = Math.atan2(dy, dx);
  const midX = (a.x + b.x) / 2;
  const midY = (a.y + b.y) / 2;
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  return Matter.Bodies.rectangle(
    midX - sin * (TERRAIN_DEPTH / 2),
    midY + cos * (TERRAIN_DEPTH / 2),
    len + 4,
    TERRAIN_DEPTH,
    {
      isStatic: true,
      angle,
      label: "terrain",
      friction: 0.85,
      frictionStatic: 0.8,
      restitution: 0,
    },
  );
}
