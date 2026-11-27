import {
  AmbientLight,
  PerspectiveCamera,
  Raycaster,
  Scene,
  Vector2,
  Vector3,
  WebGLRenderer,
} from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { SolarSystem, ToolMode } from "./sim/solarSystem";
import { ToolPalette } from "./ui/toolPalette";

const canvas = document.getElementById("scene") as HTMLCanvasElement;
const hud = document.getElementById("hud")!;

const renderer = new WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setClearColor(0x030712);

const scene = new Scene();
scene.add(new AmbientLight(0xffffff, 0.35));

const camera = new PerspectiveCamera(55, 1, 0.1, 2000);
camera.position.set(0, 55, 95);

const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;
controls.dampingFactor = 0.06;
controls.minDistance = 8;
controls.maxDistance = 400;

const sim = new SolarSystem(scene);
const raycaster = new Raycaster();
const pointer = new Vector2();

function resize(): void {
  const w = window.innerWidth;
  const h = window.innerHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}
window.addEventListener("resize", resize);
resize();

const palette = new ToolPalette("sidebar", {
  getState: () => sim,
  onModeChange: (mode: ToolMode) => {
    sim.mode = mode;
  },
  onDestroy: () => sim.destroySelected(),
  onImpact: () => sim.impactSelected(),
  onRestoreOne: () => sim.restoreOne(),
  onReset: () => sim.resetAll(),
  onUndo: () => sim.undo(),
  onFocus: (planetId) => {
    sim.setFocus(planetId);
    const target = sim.getFocusTarget();
    const world = target.getWorldPosition(new Vector3());
    controls.target.copy(world);
  },
  onSelectPlanet: (planetId) => sim.toggleSelect(planetId),
  onTimeScale: (value) => {
    sim.timeScale = value;
    sim.paused = false;
  },
  onPauseToggle: (paused) => {
    sim.paused = paused;
  },
});

function pickPlanet(clientX: number, clientY: number): string | null {
  const rect = canvas.getBoundingClientRect();
  pointer.x = ((clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -((clientY - rect.top) / rect.height) * 2 + 1;
  raycaster.setFromCamera(pointer, camera);

  const meshes = [...sim.planets.values()]
    .filter((p) => !p.destroyed)
    .map((p) => p.mesh);
  const hits = raycaster.intersectObjects(meshes, false);
  if (hits.length === 0) return null;
  return hits[0].object.userData.planetId as string;
}

canvas.addEventListener("pointerdown", (e) => {
  const id = pickPlanet(e.clientX, e.clientY);
  if (!id) {
    if (!e.shiftKey) sim.clearSelection();
    palette.refresh();
    return;
  }

  if (sim.mode === "destroy") {
    if (e.shiftKey) sim.toggleSelect(id);
    else sim.selectOnly(id);
    sim.destroySelected();
  } else if (sim.mode === "impact") {
    sim.selectOnly(id);
    sim.impactSelected();
  } else {
    if (e.shiftKey) sim.toggleSelect(id);
    else sim.selectOnly(id);
  }
  palette.refresh();
});

let last = performance.now();
function loop(now: number): void {
  const dt = Math.min((now - last) / 1000, 0.05);
  last = now;

  sim.update(dt);

  const focus = sim.getFocusTarget();
  if (sim.mode === "select" && sim.selectedIds.size === 1) {
    const id = [...sim.selectedIds][0];
    const p = sim.planets.get(id);
    if (p && !p.destroyed) {
      controls.target.lerp(p.mesh.position, 0.05);
    }
  } else {
    controls.target.lerp(focus.position, 0.02);
  }

  controls.update();
  renderer.render(scene, camera);
  hud.textContent = sim.getHudText();

  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);