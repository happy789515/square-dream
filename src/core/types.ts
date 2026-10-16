export interface Settings {
  bgmVolume: number;
  sfxVolume: number;
  muted: boolean;
  haptics: boolean;
}

export interface SaveData {
  version: 2;
  sides: number;
  progress: number;
  /** Cumulative forward travel, in meters. */
  distance: number;
  terrainSeed: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  angle: number;
  angularVelocity: number;
  settings: Settings;
  savedAt: number;
}

export type GamePhase = "Moving" | "Evolving";

export type ScreenId = "title" | "settings" | "play";

export interface RuntimeState {
  sides: number;
  progress: number;
  /** Cumulative forward travel, in meters. */
  distance: number;
  terrainSeed: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  angle: number;
  angularVelocity: number;
  settings: Settings;
  phase: GamePhase;
  screen: ScreenId;
}
