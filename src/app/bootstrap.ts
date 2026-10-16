import { Application, Container } from "pixi.js";
import { fitScale } from "../core/layout";
import { designSize } from "../core/layout";

export async function createPixiApp(mount: HTMLElement): Promise<Application> {
  const app = new Application();
  await app.init({
    resizeTo: window,
    background: "#0D1117",
    antialias: true,
    autoDensity: true,
    resolution: Math.min(window.devicePixelRatio || 1, 2),
    preference: "webgl",
  });
  mount.appendChild(app.canvas);
  return app;
}

export function layoutView(app: Application, view: Container): { width: number; height: number } {
  const design = designSize();
  document.documentElement.dataset.orientation = design.orientation;
  const fitted = fitScale(app.screen.width, app.screen.height, design.width, design.height);
  view.scale.set(fitted.scale);
  view.position.set(fitted.x, fitted.y);
  return { width: design.width, height: design.height };
}
