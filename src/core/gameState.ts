import type { RuntimeState, SaveData, Settings } from "./types";

/** Below any terrain height, so a fresh body is lifted onto the surface. */
const SURFACE_SNAP_Y = 1_000_000;

export function defaultSettings(): Settings {
  return {
    bgmVolume: 0.55,
    sfxVolume: 0.8,
    muted: false,
    haptics: true,
  };
}

export function defaultSave(settings: Settings = defaultSettings()): SaveData {
  return {
    version: 2,
    sides: 4,
    progress: 0,
    distance: 0,
    terrainSeed: Math.floor(Math.random() * 0x7fffffff),
    x: 0,
    y: SURFACE_SNAP_Y,
    vx: 0,
    vy: 0,
    angle: 0,
    angularVelocity: 0,
    settings: { ...settings },
    savedAt: Date.now(),
  };
}

export function runtimeFromSave(save: SaveData): RuntimeState {
  return {
    sides: save.sides,
    progress: save.progress,
    distance: save.distance,
    terrainSeed: save.terrainSeed,
    x: save.x,
    y: save.y,
    vx: save.vx,
    vy: save.vy,
    angle: save.angle,
    angularVelocity: save.angularVelocity,
    settings: { ...save.settings },
    phase: "Moving",
    screen: "title",
  };
}

export function toSaveData(state: RuntimeState): SaveData {
  return {
    version: 2,
    sides: state.sides,
    progress: state.progress,
    distance: state.distance,
    terrainSeed: state.terrainSeed,
    x: state.x,
    y: state.y,
    vx: state.vx,
    vy: state.vy,
    angle: state.angle,
    angularVelocity: state.angularVelocity,
    settings: { ...state.settings },
    savedAt: Date.now(),
  };
}

export function resetProgress(state: RuntimeState): void {
  const settings = { ...state.settings };
  const fresh = runtimeFromSave(defaultSave(settings));
  state.sides = fresh.sides;
  state.progress = fresh.progress;
  state.distance = fresh.distance;
  state.terrainSeed = fresh.terrainSeed;
  state.x = fresh.x;
  state.y = fresh.y;
  state.vx = fresh.vx;
  state.vy = fresh.vy;
  state.angle = fresh.angle;
  state.angularVelocity = fresh.angularVelocity;
  state.phase = "Moving";
  state.settings = settings;
}
