import { AUTOSAVE_MS } from "../core/constants";
import type { SaveData } from "../core/types";
import { writeSave } from "./storage";

export class Autosave {
  private timer: ReturnType<typeof setInterval> | null = null;
  private paused = false;

  constructor(
    private readonly getSave: () => SaveData | null,
    private readonly canSave: () => boolean,
  ) {}

  start(): void {
    this.stop();
    this.timer = setInterval(() => this.flush(), AUTOSAVE_MS);
    document.addEventListener("visibilitychange", this.onVisibility);
    window.addEventListener("pagehide", this.onPageHide);
  }

  stop(): void {
    if (this.timer !== null) {
      clearInterval(this.timer);
      this.timer = null;
    }
    document.removeEventListener("visibilitychange", this.onVisibility);
    window.removeEventListener("pagehide", this.onPageHide);
  }

  pause(): void {
    this.paused = true;
  }

  resume(): void {
    this.paused = false;
  }

  flush(): void {
    if (this.paused || !this.canSave()) return;
    const data = this.getSave();
    if (!data) return;
    writeSave(data);
  }

  private onVisibility = (): void => {
    if (document.visibilityState === "hidden") this.flush();
  };

  private onPageHide = (): void => {
    this.flush();
  };
}
