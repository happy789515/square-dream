import { DESIGN, type Orientation } from "./constants";

export type { Orientation };

export interface DesignSize {
  width: number;
  height: number;
  orientation: Orientation;
}

export function currentOrientation(): Orientation {
  if (typeof window === "undefined") return "landscape";
  return window.matchMedia("(orientation: portrait)").matches ? "portrait" : "landscape";
}

export function designSize(orientation: Orientation = currentOrientation()): DesignSize {
  const size = DESIGN[orientation];
  return { width: size.width, height: size.height, orientation };
}

export function groundY(height: number): number {
  return height * 0.78;
}

export function playerX(width: number): number {
  return width * 0.5;
}

export function fitScale(
  screenWidth: number,
  screenHeight: number,
  designWidth: number,
  designHeight: number,
): { scale: number; x: number; y: number } {
  const scale = Math.min(screenWidth / designWidth, screenHeight / designHeight);
  return {
    scale,
    x: (screenWidth - designWidth * scale) / 2,
    y: (screenHeight - designHeight * scale) / 2,
  };
}
