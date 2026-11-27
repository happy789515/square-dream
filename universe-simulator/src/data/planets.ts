export interface PlanetDefinition {
  id: string;
  nameKo: string;
  nameEn: string;
  /** Mean distance from Sun in AU */
  semiMajorAxisAu: number;
  /** Earth radii */
  radiusEarth: number;
  /** Sidereal orbital period in Earth days */
  orbitalPeriodDays: number;
  color: number;
  /** Optional ring (Saturn) */
  hasRings?: boolean;
}

export const SUN_RADIUS_EARTH = 109;

export const PLANETS: PlanetDefinition[] = [
  {
    id: "mercury",
    nameKo: "수성",
    nameEn: "Mercury",
    semiMajorAxisAu: 0.387,
    radiusEarth: 0.383,
    orbitalPeriodDays: 88,
    color: 0x9ca3af,
  },
  {
    id: "venus",
    nameKo: "금성",
    nameEn: "Venus",
    semiMajorAxisAu: 0.723,
    radiusEarth: 0.949,
    orbitalPeriodDays: 224.7,
    color: 0xeab676,
  },
  {
    id: "earth",
    nameKo: "지구",
    nameEn: "Earth",
    semiMajorAxisAu: 1.0,
    radiusEarth: 1.0,
    orbitalPeriodDays: 365.25,
    color: 0x3b82f6,
  },
  {
    id: "mars",
    nameKo: "화성",
    nameEn: "Mars",
    semiMajorAxisAu: 1.524,
    radiusEarth: 0.532,
    orbitalPeriodDays: 687,
    color: 0xef4444,
  },
  {
    id: "jupiter",
    nameKo: "목성",
    nameEn: "Jupiter",
    semiMajorAxisAu: 5.204,
    radiusEarth: 11.21,
    orbitalPeriodDays: 4333,
    color: 0xd97706,
  },
  {
    id: "saturn",
    nameKo: "토성",
    nameEn: "Saturn",
    semiMajorAxisAu: 9.582,
    radiusEarth: 9.45,
    orbitalPeriodDays: 10759,
    color: 0xfcd34d,
    hasRings: true,
  },
  {
    id: "uranus",
    nameKo: "천왕성",
    nameEn: "Uranus",
    semiMajorAxisAu: 19.201,
    radiusEarth: 4.007,
    orbitalPeriodDays: 30687,
    color: 0x67e8f9,
  },
  {
    id: "neptune",
    nameKo: "해왕성",
    nameEn: "Neptune",
    semiMajorAxisAu: 30.047,
    radiusEarth: 3.883,
    orbitalPeriodDays: 60190,
    color: 0x2563eb,
  },
];

/** Educational staged scale — not 1:1 astronomical. */
export function orbitRadiusSceneUnits(au: number): number {
  return 8 + Math.log10(au + 0.05) * 28;
}

export function bodyRadiusSceneUnits(earthRadii: number): number {
  const log = Math.log10(earthRadii + 0.08);
  return Math.max(0.35, 0.55 + log * 2.2);
}

export function sunRadiusSceneUnits(): number {
  return 5.5;
}