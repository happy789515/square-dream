export const COLORS = {
  bg: 0x0d1117,
  bgDeep: 0x121826,
  horizon: 0x1a1030,
  cyan: 0x00f5d4,
  magenta: 0xff006e,
  violet: 0x7b61ff,
  fill: 0x1a1f2e,
  yellow: 0xffe566,
} as const;

export const SCROLL_SPEED = 150;
/** Extra linear speed per vertex beyond the starting square. */
export const SPEED_PER_VERTEX = 0.15;
/** World pixels to meters. Square cruise is 1.5 m/s. */
export const METERS_PER_PX = 0.01;
export const PLAYER_RADIUS = 78;
export const EVOLVE_MS = 4400;
export const EVOLVE_RISE_END = 700;
export const EVOLVE_DISSOLVE_END = 1300;
export const EVOLVE_SCATTER_END = 2100;
export const EVOLVE_VERTEX_END = 2700;
export const EVOLVE_EDGE_END = 3300;
export const EVOLVE_FILL_END = 3700;
export const EVOLVE_REFORM_END = 4400;
export const AUTOSAVE_MS = 10_000;
export const SAVE_KEY = "square-dream.save.v1";
export const SETTINGS_KEY = "square-dream.settings.v1";

export const PARALLAX = {
  far: 0.15,
  mid: 0.35,
  fog: 0.08,
} as const;

export const DESIGN = {
  landscape: { width: 1280, height: 720 },
  portrait: { width: 720, height: 1280 },
} as const;

export type Orientation = keyof typeof DESIGN;
