import { circularityPercent } from "../core/circularity";
import { formatDistance, formatRollScale } from "../core/distance";
import type { RuntimeState } from "../core/types";

export function renderDistance(meters: number): void {
  const el = document.querySelector("#distance");
  if (!(el instanceof HTMLElement)) return;
  const label = formatDistance(meters);
  if (el.textContent !== label) el.textContent = label;
}

export function setDistanceVisible(visible: boolean): void {
  const el = document.querySelector("#distance");
  if (el instanceof HTMLElement) el.hidden = !visible;
}

export function renderHud(state: RuntimeState): void {
  const remain = Math.max(0, state.sides - state.progress);
  setMenuLabel("#menu-remain", `진화까지 ${remain}탭`);
  setMenuLabel("#menu-sides", `${state.sides}각`);
  setMenuLabel("#menu-speed", `속도 ${formatRollScale(state.sides)}`);
  setMenuLabel("#menu-circle", `원에 가까움 ${circularityPercent(state.sides)}%`);
}

export function setHudVisible(visible: boolean): void {
  const hud = document.querySelector("#hud");
  if (!(hud instanceof HTMLElement)) return;
  hud.hidden = !visible;
  if (!visible) closePlayMenu();
}

export function bindPlayMenu(handlers: { onHome: () => void; onSave: () => void }): void {
  document.querySelector("#btn-menu")?.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    togglePlayMenu();
  });
  document.querySelector("#menu-home")?.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    closePlayMenu();
    handlers.onHome();
  });
  document.querySelector("#menu-save")?.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    closePlayMenu();
    handlers.onSave();
  });
}

export function isPlayMenuOpen(): boolean {
  const menu = document.querySelector("#play-menu");
  return menu instanceof HTMLElement && !menu.hidden;
}

export function closePlayMenu(): void {
  const menu = document.querySelector("#play-menu");
  const button = document.querySelector("#btn-menu");
  if (menu instanceof HTMLElement) menu.hidden = true;
  if (button instanceof HTMLButtonElement) button.setAttribute("aria-expanded", "false");
}

export function showSaving(): void {
  const saving = document.querySelector("#saving");
  if (saving instanceof HTMLElement) saving.hidden = false;
}

export function hideSaving(): void {
  const saving = document.querySelector("#saving");
  if (saving instanceof HTMLElement) saving.hidden = true;
}

function setMenuLabel(row: string, text: string): void {
  const label = document.querySelector(`${row} span`);
  if (label) label.textContent = text;
}

function togglePlayMenu(): void {
  const menu = document.querySelector("#play-menu");
  const button = document.querySelector("#btn-menu");
  if (!(menu instanceof HTMLElement)) return;
  menu.hidden = !menu.hidden;
  if (button instanceof HTMLButtonElement) button.setAttribute("aria-expanded", String(!menu.hidden));
}
