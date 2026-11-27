import {
  BufferAttribute,
  BufferGeometry,
  Color,
  Group,
  Points,
  PointsMaterial,
  Scene,
  Vector3,
} from "three";

interface ParticleBurst {
  points: Points;
  velocities: Float32Array;
  life: number;
  maxLife: number;
}

export class ParticleSystem {
  private readonly bursts: ParticleBurst[] = [];
  private readonly scene: Scene;

  constructor(scene: Scene) {
    this.scene = scene;
  }

  spawnExplosion(position: Vector3, baseColor: number, count = 120): void {
    const geometry = new BufferGeometry();
    const positions = new Float32Array(count * 3);
    const velocities = new Float32Array(count * 3);
    const color = new Color(baseColor);

    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      positions[i3] = position.x;
      positions[i3 + 1] = position.y;
      positions[i3 + 2] = position.z;

      const dir = new Vector3(
        Math.random() - 0.5,
        Math.random() - 0.5,
        Math.random() - 0.5,
      ).normalize();
      const speed = 0.08 + Math.random() * 0.35;
      velocities[i3] = dir.x * speed;
      velocities[i3 + 1] = dir.y * speed;
      velocities[i3 + 2] = dir.z * speed;
    }

    geometry.setAttribute("position", new BufferAttribute(positions, 3));

    const material = new PointsMaterial({
      color,
      size: 0.35,
      transparent: true,
      opacity: 0.95,
      depthWrite: false,
    });

    const points = new Points(geometry, material);
    this.scene.add(points);
    this.bursts.push({ points, velocities, life: 0, maxLife: 1.8 });
  }

  update(dt: number): void {
    for (let i = this.bursts.length - 1; i >= 0; i--) {
      const burst = this.bursts[i];
      burst.life += dt;
      const t = burst.life / burst.maxLife;
      const attr = burst.points.geometry.getAttribute(
        "position",
      ) as BufferAttribute;
      const pos = attr.array as Float32Array;

      for (let p = 0; p < pos.length; p += 3) {
        pos[p] += burst.velocities[p] * dt * 60;
        pos[p + 1] += burst.velocities[p + 1] * dt * 60;
        pos[p + 2] += burst.velocities[p + 2] * dt * 60;
      }
      attr.needsUpdate = true;

      const mat = burst.points.material as PointsMaterial;
      mat.opacity = Math.max(0, 1 - t);

      if (burst.life >= burst.maxLife) {
        this.scene.remove(burst.points);
        burst.points.geometry.dispose();
        mat.dispose();
        this.bursts.splice(i, 1);
      }
    }
  }
}

export interface MeteorState {
  mesh: Group;
  target: Vector3;
  speed: number;
  active: boolean;
  planetId: string | null;
  onHit: () => void;
}

export function createMeteorMesh(): Group {
  const group = new Group();
  const core = new Points(
    new BufferGeometry().setAttribute(
      "position",
      new BufferAttribute(new Float32Array([0, 0, 0]), 3),
    ),
    new PointsMaterial({ color: 0xf97316, size: 1.2 }),
  );
  group.add(core);
  return group;
}