import { SAVE_KEY, SETTINGS_KEY } from "../core/constants";
import { defaultSave, defaultSettings } from "../core/gameState";
import type { SaveData, Settings } from "../core/types";

interface SaveV1 {
  version: 1;
  sides: number;
  progress: number;
  distance: number;
  rollAngle: number;
  settings: Settings;
  savedAt: number;
}

function isSettings(value: unknown): value is Settings {
  if (!value || typeof value !== "object") return false;
  const s = value as Settings;
  return (
    typeof s.bgmVolume === "number" &&
    typeof s.sfxVolume === "number" &&
    typeof s.muted === "boolean" &&
    typeof s.haptics === "boolean"
  );
}

function clamp01(n: number): number {
  return Math.min(1, Math.max(0, n));
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function readDistance(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return 0;
  return Math.max(0, value);
}

/** v2 saves written before distance existed omit the field. */
function isSaveV2(value: unknown): value is SaveData {
  if (!value || typeof value !== "object") return false;
  const s = value as SaveData;
  return (
    s.version === 2 &&
    typeof s.sides === "number" &&
    s.sides >= 4 &&
    Number.isFinite(s.sides) &&
    typeof s.progress === "number" &&
    s.progress >= 0 &&
    s.progress < s.sides &&
    isFiniteNumber(s.terrainSeed) &&
    isFiniteNumber(s.x) &&
    isFiniteNumber(s.y) &&
    isFiniteNumber(s.vx) &&
    isFiniteNumber(s.vy) &&
    isFiniteNumber(s.angle) &&
    isFiniteNumber(s.angularVelocity) &&
    typeof s.savedAt === "number" &&
    isSettings(s.settings)
  );
}

function isSaveV1(value: unknown): value is SaveV1 {
  if (!value || typeof value !== "object") return false;
  const s = value as SaveV1;
  return (
    s.version === 1 &&
    typeof s.sides === "number" &&
    s.sides >= 4 &&
    Number.isFinite(s.sides) &&
    typeof s.progress === "number" &&
    s.progress >= 0 &&
    s.progress < s.sides &&
    typeof s.distance === "number" &&
    typeof s.rollAngle === "number" &&
    typeof s.savedAt === "number" &&
    isSettings(s.settings)
  );
}

function normalize(save: SaveData): SaveData {
  return {
    ...save,
    sides: Math.floor(save.sides),
    progress: Math.floor(save.progress),
    distance: readDistance(save.distance),
    terrainSeed: Math.floor(save.terrainSeed),
    settings: {
      bgmVolume: clamp01(save.settings.bgmVolume),
      sfxVolume: clamp01(save.settings.sfxVolume),
      muted: save.settings.muted,
      haptics: save.settings.haptics,
    },
  };
}

function migrateV1(save: SaveV1): SaveData {
  return normalize({
    version: 2,
    sides: save.sides,
    progress: save.progress,
    distance: 0,
    terrainSeed: Math.floor(Math.random() * 0x7fffffff),
    x: 0,
    y: 1_000_000,
    vx: 0,
    vy: 0,
    angle: 0,
    angularVelocity: 0,
    settings: { ...save.settings },
    savedAt: save.savedAt,
  });
}

export function loadSettings(): Settings {
  const fromSave = loadSave();
  if (fromSave) return { ...fromSave.settings };
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return defaultSettings();
    const parsed: unknown = JSON.parse(raw);
    if (!isSettings(parsed)) return defaultSettings();
    return {
      bgmVolume: clamp01(parsed.bgmVolume),
      sfxVolume: clamp01(parsed.sfxVolume),
      muted: parsed.muted,
      haptics: parsed.haptics,
    };
  } catch {
    return defaultSettings();
  }
}

export function saveSettings(settings: Settings): void {
  const existing = loadSave();
  if (existing) {
    writeSave({ ...existing, settings: { ...settings }, savedAt: Date.now() });
    return;
  }
  localStorage.setItem(
    SETTINGS_KEY,
    JSON.stringify({
      bgmVolume: clamp01(settings.bgmVolume),
      sfxVolume: clamp01(settings.sfxVolume),
      muted: settings.muted,
      haptics: settings.haptics,
    }),
  );
}

export function hasSave(): boolean {
  return loadSave() !== null;
}

export function loadSave(): SaveData | null {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (isSaveV1(parsed)) {
      const migrated = migrateV1(parsed);
      writeSave(migrated);
      return migrated;
    }
    if (!isSaveV2(parsed)) return null;
    return normalize(parsed);
  } catch {
    return null;
  }
}

export function writeSave(data: SaveData): void {
  const normalized = normalize({
    ...data,
    sides: Math.max(4, Math.floor(data.sides)),
    progress: Math.max(0, Math.floor(data.progress)),
  });
  if (normalized.progress >= normalized.sides) {
    normalized.progress = normalized.sides - 1;
  }
  localStorage.setItem(SAVE_KEY, JSON.stringify(normalized));
}

export function clearSave(): void {
  localStorage.removeItem(SAVE_KEY);
}

export function freshSave(settings: Settings): SaveData {
  return defaultSave(settings);
}
