import type { Settings } from "../core/types";

export interface SettingsHandlers {
  onChange: (settings: Settings) => void;
  onReset: () => void;
  onBack: () => void;
}

export function bindSettings(handlers: SettingsHandlers): void {
  const bgm = document.querySelector("#bgm");
  const sfx = document.querySelector("#sfx");
  const mute = document.querySelector("#mute");
  const haptics = document.querySelector("#haptics");

  const emit = (): void => handlers.onChange(readSettings());
  bgm?.addEventListener("input", emit);
  sfx?.addEventListener("input", emit);
  mute?.addEventListener("change", emit);
  haptics?.addEventListener("change", emit);
  document.querySelector("#btn-reset")?.addEventListener("click", handlers.onReset);
  document.querySelector("#btn-settings-back")?.addEventListener("click", handlers.onBack);
}

export function showSettings(settings: Settings): void {
  writeSettings(settings);
  const title = document.querySelector("#title");
  const settingsEl = document.querySelector("#settings");
  if (title instanceof HTMLElement) title.hidden = true;
  if (settingsEl instanceof HTMLElement) settingsEl.hidden = false;
  const app = document.querySelector("#app");
  if (app instanceof HTMLElement) app.classList.remove("home-live");
}

export function readSettings(): Settings {
  const bgm = document.querySelector("#bgm");
  const sfx = document.querySelector("#sfx");
  const mute = document.querySelector("#mute");
  const haptics = document.querySelector("#haptics");
  return {
    bgmVolume: bgm instanceof HTMLInputElement ? Number(bgm.value) / 100 : 0.55,
    sfxVolume: sfx instanceof HTMLInputElement ? Number(sfx.value) / 100 : 0.8,
    muted: mute instanceof HTMLInputElement ? mute.checked : false,
    haptics: haptics instanceof HTMLInputElement ? haptics.checked : true,
  };
}

export function writeSettings(settings: Settings): void {
  const bgm = document.querySelector("#bgm");
  const sfx = document.querySelector("#sfx");
  const mute = document.querySelector("#mute");
  const haptics = document.querySelector("#haptics");
  if (bgm instanceof HTMLInputElement) bgm.value = String(Math.round(settings.bgmVolume * 100));
  if (sfx instanceof HTMLInputElement) sfx.value = String(Math.round(settings.sfxVolume * 100));
  if (mute instanceof HTMLInputElement) mute.checked = settings.muted;
  if (haptics instanceof HTMLInputElement) haptics.checked = settings.haptics;
}

export function confirmReset(message: string): Promise<boolean> {
  const dialog = document.querySelector("#confirm");
  const text = document.querySelector("#confirm-text");
  const yes = document.querySelector("#confirm-yes");
  const no = document.querySelector("#confirm-no");
  if (!(dialog instanceof HTMLElement) || !(yes instanceof HTMLButtonElement) || !(no instanceof HTMLButtonElement)) {
    return Promise.resolve(false);
  }
  if (text) text.textContent = message;
  dialog.hidden = false;
  return new Promise((resolve) => {
    const close = (value: boolean): void => {
      dialog.hidden = true;
      yes.removeEventListener("click", onYes);
      no.removeEventListener("click", onNo);
      resolve(value);
    };
    const onYes = (): void => close(true);
    const onNo = (): void => close(false);
    yes.addEventListener("click", onYes);
    no.addEventListener("click", onNo);
  });
}
