import { hasSave } from "../save/storage";

export interface TitleHandlers {
  onContinue: () => void;
  onNewGame: () => void;
  onSettings: () => void;
}

export function bindTitle(handlers: TitleHandlers): void {
  document.querySelector("#btn-continue")?.addEventListener("click", handlers.onContinue);
  document.querySelector("#btn-new")?.addEventListener("click", handlers.onNewGame);
  document.querySelector("#btn-settings")?.addEventListener("click", handlers.onSettings);
}

export function showTitle(): void {
  const title = document.querySelector("#title");
  const settings = document.querySelector("#settings");
  if (title instanceof HTMLElement) title.hidden = false;
  if (settings instanceof HTMLElement) settings.hidden = true;
  const cont = document.querySelector("#btn-continue");
  if (cont instanceof HTMLButtonElement) cont.hidden = !hasSave();
  setHomeBackdrop(true);
}

export function hideMenus(): void {
  const title = document.querySelector("#title");
  const settings = document.querySelector("#settings");
  if (title instanceof HTMLElement) title.hidden = true;
  if (settings instanceof HTMLElement) settings.hidden = true;
  setHomeBackdrop(false);
}

function setHomeBackdrop(on: boolean): void {
  const app = document.querySelector("#app");
  if (app instanceof HTMLElement) app.classList.toggle("home-live", on);
}
