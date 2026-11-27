import {
  DoubleSide,
  Group,
  Mesh,
  MeshBasicMaterial,
  Object3D,
  RingGeometry,
  Scene,
  SphereGeometry,
  Vector3,
} from "three";
import {
  PLANETS,
  PlanetDefinition,
  bodyRadiusSceneUnits,
  orbitRadiusSceneUnits,
  sunRadiusSceneUnits,
} from "../data/planets";
import { ParticleSystem, MeteorState, createMeteorMesh } from "../effects/particles";
import { HistoryStack } from "./history";

export type ToolMode = "select" | "destroy" | "impact";

export interface PlanetRuntime {
  def: PlanetDefinition;
  group: Group;
  mesh: Mesh;
  orbitLine: Mesh;
  angle: number;
  orbitRadius: number;
  destroyed: boolean;
}

export class SolarSystem {
  readonly scene: Scene;
  readonly root = new Group();
  readonly planets = new Map<string, PlanetRuntime>();
  readonly sun: Mesh;
  readonly history = new HistoryStack();
  readonly particles: ParticleSystem;

  selectedIds = new Set<string>();
  mode: ToolMode = "select";
  timeScale = 1;
  paused = false;
  simDays = 0;

  private meteor: MeteorState | null = null;
  private focusId: string | null = null;

  constructor(scene: Scene) {
    this.scene = scene;
    this.particles = new ParticleSystem(scene);
    scene.add(this.root);

    const sunGeo = new SphereGeometry(sunRadiusSceneUnits(), 48, 48);
    const sunMat = new MeshBasicMaterial({ color: 0xfbbf24 });
    this.sun = new Mesh(sunGeo, sunMat);
    this.sun.name = "sun";
    this.root.add(this.sun);

    this.spawnAllPlanets();
  }

  private spawnAllPlanets(): void {
    for (const def of PLANETS) {
      this.createPlanet(def);
    }
  }

  private createPlanet(def: PlanetDefinition): PlanetRuntime {
    const orbitRadius = orbitRadiusSceneUnits(def.semiMajorAxisAu);
    const radius = bodyRadiusSceneUnits(def.radiusEarth);
    const angle = Math.random() * Math.PI * 2;

    const group = new Group();
    group.name = def.id;

    const orbitGeo = new RingGeometry(orbitRadius - 0.03, orbitRadius + 0.03, 128);
    const orbitMat = new MeshBasicMaterial({
      color: 0x334155,
      transparent: true,
      opacity: 0.35,
      side: DoubleSide,
    });
    const orbitLine = new Mesh(orbitGeo, orbitMat);
    orbitLine.rotation.x = Math.PI / 2;
    group.add(orbitLine);

    const sphereGeo = new SphereGeometry(radius, 32, 32);
    const sphereMat = new MeshBasicMaterial({ color: def.color });
    const mesh = new Mesh(sphereGeo, sphereMat);
    mesh.userData.planetId = def.id;
    mesh.position.set(
      Math.cos(angle) * orbitRadius,
      0,
      Math.sin(angle) * orbitRadius,
    );
    group.add(mesh);

    if (def.hasRings) {
      const ring = new Mesh(
        new RingGeometry(radius * 1.4, radius * 2.2, 64),
        new MeshBasicMaterial({
          color: 0xc4b5a5,
          transparent: true,
          opacity: 0.55,
          side: DoubleSide,
        }),
      );
      ring.rotation.x = Math.PI / 2;
      mesh.add(ring);
    }

    this.root.add(group);

    const runtime: PlanetRuntime = {
      def,
      group,
      mesh,
      orbitLine,
      angle,
      orbitRadius,
      destroyed: false,
    };
    this.planets.set(def.id, runtime);
    return runtime;
  }

  getFocusTarget(): Object3D {
    if (this.focusId) {
      const p = this.planets.get(this.focusId);
      if (p && !p.destroyed) return p.mesh;
    }
    return this.sun;
  }

  setFocus(planetId: string | null): void {
    this.focusId = planetId;
  }

  toggleSelect(planetId: string): void {
    if (this.selectedIds.has(planetId)) {
      this.selectedIds.delete(planetId);
    } else {
      this.selectedIds.add(planetId);
    }
    this.updateSelectionVisuals();
  }

  clearSelection(): void {
    this.selectedIds.clear();
    this.updateSelectionVisuals();
  }

  selectOnly(planetId: string): void {
    this.selectedIds.clear();
    this.selectedIds.add(planetId);
    this.updateSelectionVisuals();
  }

  private updateSelectionVisuals(): void {
    for (const [id, planet] of this.planets) {
      const mat = planet.mesh.material as MeshBasicMaterial;
      if (planet.destroyed) {
        mat.color.setHex(0x334155);
        continue;
      }
      if (this.selectedIds.has(id)) {
        mat.color.setHex(0xffffff);
      } else {
        mat.color.setHex(planet.def.color);
      }
    }
  }

  destroyPlanet(planetId: string, recordHistory = true): void {
    const planet = this.planets.get(planetId);
    if (!planet || planet.destroyed) return;

    planet.destroyed = true;
    planet.mesh.visible = false;
    if (planet.def.hasRings) {
      planet.mesh.children.forEach((c) => {
        c.visible = false;
      });
    }
    const mat = planet.orbitLine.material as MeshBasicMaterial;
    mat.opacity = 0.12;

    this.particles.spawnExplosion(
      planet.mesh.getWorldPosition(new Vector3()),
      planet.def.color,
    );

    this.selectedIds.delete(planetId);
    if (recordHistory) {
      this.history.push({ kind: "destroy", planetId });
    }
    this.updateSelectionVisuals();
  }

  restorePlanet(planetId: string, recordHistory = true): void {
    const planet = this.planets.get(planetId);
    if (!planet || !planet.destroyed) return;

    planet.destroyed = false;
    planet.mesh.visible = true;
    planet.mesh.children.forEach((c) => {
      c.visible = true;
    });
    const mat = planet.orbitLine.material as MeshBasicMaterial;
    mat.opacity = 0.35;

    if (recordHistory) {
      this.history.push({ kind: "restore", planetId });
    }
    this.updateSelectionVisuals();
  }

  destroySelected(): void {
    for (const id of [...this.selectedIds]) {
      this.destroyPlanet(id);
    }
  }

  restoreOne(): void {
    const destroyed = PLANETS.map((p) => p.id).filter((id) => {
      const r = this.planets.get(id);
      return r?.destroyed;
    });
    if (destroyed.length === 0) return;
    const last = destroyed[destroyed.length - 1];
    this.restorePlanet(last);
  }

  undo(): void {
    const action = this.history.pop();
    if (!action) return;
    if (action.kind === "destroy") {
      this.restorePlanet(action.planetId, false);
    } else if (action.kind === "restore") {
      this.destroyPlanet(action.planetId, false);
    } else if (action.kind === "reset") {
      for (const id of this.planets.keys()) {
        if (action.destroyedIds.includes(id)) {
          this.destroyPlanet(id, false);
        } else {
          this.restorePlanet(id, false);
        }
      }
      this.simDays = action.simDays;
      this.updateSelectionVisuals();
    }
  }

  resetAll(recordHistory = true): void {
    const destroyedIds = [...this.planets.entries()]
      .filter(([, p]) => p.destroyed)
      .map(([id]) => id);
  const priorDays = this.simDays;

    for (const id of this.planets.keys()) {
      this.restorePlanet(id, false);
    }
    this.selectedIds.clear();
    this.simDays = 0;
    for (const planet of this.planets.values()) {
      planet.angle = Math.random() * Math.PI * 2;
      this.syncPlanetPosition(planet);
    }
    if (recordHistory) {
      this.history.push({
        kind: "reset",
        destroyedIds,
        simDays: priorDays,
      });
    }
    this.updateSelectionVisuals();
  }

  launchMeteorAt(targetId: string): void {
    const planet = this.planets.get(targetId);
    if (!planet || planet.destroyed || this.meteor?.active) return;

    const target = planet.mesh.getWorldPosition(new Vector3());
    const start = target
      .clone()
      .add(new Vector3(-40, 25, -30).normalize().multiplyScalar(80));

    const mesh = createMeteorMesh();
    mesh.position.copy(start);
    this.scene.add(mesh);

    this.meteor = {
      mesh,
      target: target.clone(),
      speed: 45,
      active: true,
      planetId: targetId,
      onHit: () => {
        this.destroyPlanet(targetId);
      },
    };
  }

  impactSelected(): void {
    const ids = [...this.selectedIds].filter((id) => {
      const p = this.planets.get(id);
      return p && !p.destroyed;
    });
    const target = ids[0] ?? null;
    if (!target) return;
    this.launchMeteorAt(target);
  }

  private syncPlanetPosition(planet: PlanetRuntime): void {
    planet.mesh.position.set(
      Math.cos(planet.angle) * planet.orbitRadius,
      0,
      Math.sin(planet.angle) * planet.orbitRadius,
    );
  }

  update(dt: number): void {
    const scale = this.paused ? 0 : this.timeScale;
    const dayStep = dt * scale * 8;
    this.simDays += dayStep;

    for (const planet of this.planets.values()) {
      if (planet.destroyed) continue;
      const omega = (2 * Math.PI) / planet.def.orbitalPeriodDays;
      planet.angle += omega * dayStep;
      this.syncPlanetPosition(planet);
    }

    if (this.meteor?.active) {
      const m = this.meteor;
      const pos = m.mesh.position;
      const dir = m.target.clone().sub(pos);
      const dist = dir.length();
      if (dist < 0.5) {
        m.active = false;
        this.particles.spawnExplosion(m.target, 0xf97316, 80);
        m.onHit();
        this.scene.remove(m.mesh);
        this.meteor = null;
      } else {
        dir.normalize().multiplyScalar(m.speed * dt);
        pos.add(dir);
      }
    }

    this.particles.update(dt);
  }

  getHudText(): string {
    const destroyedCount = [...this.planets.values()].filter(
      (p) => p.destroyed,
    ).length;
    const sel =
      this.selectedIds.size > 0
        ? [...this.selectedIds].join(", ")
        : "없음";
    return [
      `시뮬레이션 일수: ${this.simDays.toFixed(0)}`,
      `선택: ${sel}`,
      `파괴됨: ${destroyedCount}/${PLANETS.length}`,
      `시간 배율: ${this.paused ? "일시정지" : `${this.timeScale}×`}`,
    ].join(" · ");
  }

  listStates(): { id: string; nameKo: string; color: number; destroyed: boolean }[] {
    return PLANETS.map((p) => {
      const r = this.planets.get(p.id)!;
      return {
        id: p.id,
        nameKo: p.nameKo,
        color: p.color,
        destroyed: r.destroyed,
      };
    });
  }
}