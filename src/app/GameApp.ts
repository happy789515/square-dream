import { Container, Ticker } from "pixi.js";
import { AudioManager, pulseHaptic } from "../audio/AudioManager";
import { metersFromPixels } from "../core/distance";
import { applyTap, commitEvolution, finishEvolution } from "../core/evolution";
import { resetProgress, runtimeFromSave, toSaveData } from "../core/gameState";
import { currentOrientation, designSize, type Orientation } from "../core/layout";
import type { RuntimeState } from "../core/types";
import { bindPlayPointer } from "../pixi/input/pointer";
import { PlayScene } from "../pixi/PlayScene";
import { PhysicsWorld, type BodyPose } from "../physics/world";
import { Autosave } from "../save/autosave";
import { clearSave, freshSave, hasSave, loadSave, loadSettings, saveSettings, writeSave } from "../save/storage";
import { createPixiApp, layoutView } from "./bootstrap";
import { bindPlayMenu, hideSaving, renderDistance, renderHud, setDistanceVisible, setHudVisible, showSaving } from "../ui/hud";
import { bindSettings, confirmReset, showSettings } from "../ui/settings";
import { bindTitle, hideMenus, showTitle } from "../ui/title";

export class GameApp {
  private state: RuntimeState = runtimeFromSave(freshSave(loadSettings()));
  private view = new Container();
  private play = new PlayScene();
  private audio = new AudioManager();
  private autosave: Autosave;
  private app: Awaited<ReturnType<typeof createPixiApp>> | null = null;
  private physics: PhysicsWorld | null = null;
  private held: BodyPose | null = null;
  private lastScreenW = -1;
  private lastScreenH = -1;
  private lastOrientation: Orientation | null = null;
  private homeSaving = false;
  private anchorX = 0;

  constructor() {
    this.autosave = new Autosave(
      () => (this.state.screen === "play" ? toSaveData(this.state) : null),
      () => this.state.screen === "play" && this.state.phase === "Moving",
    );
  }

  async start(): Promise<void> {
    const mount = document.querySelector("#app");
    if (!(mount instanceof HTMLElement)) throw new Error("missing #app");
    this.app = await createPixiApp(mount);
    this.view.addChild(this.play.root);
    this.app.stage.addChild(this.view);
    await this.play.loadAssets();

    bindTitle({
      onContinue: () => this.continueGame(),
      onNewGame: () => void this.newGame(),
      onSettings: () => this.openSettings(),
    });
    bindSettings({
      onChange: (settings) => this.applySettings(settings),
      onReset: () => void this.resetFromSettings(),
      onBack: () => this.backToTitle(),
    });
    bindPlayPointer(
      () => this.onTap(),
      () => this.audio.unlock(),
    );
    bindPlayMenu({
      onHome: () => void this.goHome(),
      onSave: () => void this.saveManual(),
    });

    this.autosave.start();
    this.app.ticker.add(this.onTick);
    window.addEventListener("resize", this.onResize);
    window.addEventListener("orientationchange", this.onResize);
    document.addEventListener("visibilitychange", this.onVisibility);
    this.onResize();
    this.bootPhysics();
    this.audio.apply(this.state.settings);
    showTitle();
    setHudVisible(false);
    setDistanceVisible(false);
  }

  private onTick = (ticker: Ticker): void => {
    this.syncLayout();
    const dt = Math.min(ticker.deltaMS, 100) / 1000;
    if (this.homeSaving || !this.physics) return;
    if (this.state.screen === "title") {
      this.physics.step(dt);
      const impact = this.physics.consumeImpact();
      if (impact > 0) this.play.player.impact(impact);
      this.play.player.tickPulse(dt);
      this.paint();
      return;
    }
    if (this.state.screen !== "play") return;

    if (this.state.phase === "Moving") {
      this.physics.step(dt);
      this.physics.write(this.state);
      this.accrueDistance();
      renderDistance(this.state.distance);
      const impact = this.physics.consumeImpact();
      if (impact > 0) this.play.player.impact(impact);
      this.play.player.tickPulse(dt);
      this.paint();
      return;
    }

    const step = this.play.tickEvolve(Math.min(ticker.deltaMS, 100), () => {
      commitEvolution(this.state);
      this.play.player.setSides(this.state.sides);
      this.audio.playEvolve();
      pulseHaptic(45, this.state.settings.haptics);
      renderHud(this.state);
    });
    if (step === "done") {
      finishEvolution(this.state);
      if (this.held) {
        const size = designSize(this.lastOrientation ?? currentOrientation());
        this.physics.launch(this.state.sides, this.held, size.height);
      }
      this.held = null;
      this.play.endEvolve();
      this.physics.write(this.state);
      this.audio.setDuck(1);
      this.autosave.resume();
      this.autosave.flush();
      setHudVisible(true);
    }
    this.paint();
  };

  private onTap(): void {
    if (this.state.screen !== "play") return;
    const result = applyTap(this.state);
    if (result === "ignored") return;
    this.audio.playTap();
    pulseHaptic(12, this.state.settings.haptics);
    renderHud(this.state);
    this.play.player.kick();
    if (result === "evolve" && this.physics) {
      this.held = this.physics.capture();
      this.physics.freeze();
      this.play.player.clearPulse();
      this.autosave.pause();
      this.audio.setDuck(0.35);
      this.play.beginEvolve();
      setHudVisible(false);
      this.play.evolve.start(this.play.player, this.state.sides);
    }
  }

  private continueGame(): void {
    const save = loadSave();
    if (!save) {
      showTitle();
      return;
    }
    const next = runtimeFromSave(save);
    next.screen = "play";
    this.state = next;
    this.enterPlay();
  }

  private async newGame(): Promise<void> {
    if (hasSave()) {
      const ok = await confirmReset("저장된 진행을 지우고 새로 시작할까요?");
      if (!ok) return;
    }
    resetProgress(this.state);
    clearSave();
    this.state.screen = "play";
    this.enterPlay();
  }

  private enterPlay(): void {
    this.state.screen = "play";
    this.state.phase = "Moving";
    hideMenus();
    setHudVisible(true);
    setDistanceVisible(true);
    renderDistance(this.state.distance);
    renderHud(this.state);
    this.audio.unlock();
    this.audio.apply(this.state.settings);
    this.audio.startBgm();
    this.play.player.clearPulse();
    this.play.player.setSides(this.state.sides);
    this.bootPhysics();
    this.autosave.resume();
    this.autosave.flush();
  }

  private openSettings(): void {
    this.state.screen = "settings";
    showSettings(this.state.settings);
    setHudVisible(false);
    setDistanceVisible(false);
  }

  private backToTitle(): void {
    this.state.screen = "title";
    showTitle();
  }

  private async saveManual(): Promise<void> {
    await this.saveNow();
  }

  private async goHome(): Promise<void> {
    const saved = await this.saveNow();
    if (!saved) return;
    this.audio.stopBgm();
    this.state.screen = "title";
    setHudVisible(false);
    setDistanceVisible(false);
    showTitle();
  }

  private async saveNow(): Promise<boolean> {
    if (this.homeSaving || this.state.screen !== "play" || this.state.phase !== "Moving") return false;
    this.homeSaving = true;
    this.physics?.write(this.state);
    const snapshot = toSaveData(this.state);
    showSaving();
    const shownAt = performance.now();
    try {
      await nextFrame();
      writeSave(snapshot);
      const remain = 600 - (performance.now() - shownAt);
      if (remain > 0) await wait(remain);
    } catch {
      hideSaving();
      this.homeSaving = false;
      return false;
    }
    hideSaving();
    this.homeSaving = false;
    return true;
  }

  private applySettings(settings: RuntimeState["settings"]): void {
    this.state.settings = settings;
    this.audio.apply(settings);
    saveSettings(settings);
  }

  private async resetFromSettings(): Promise<void> {
    const ok = await confirmReset("진행을 지우고 처음부터 시작할까요?");
    if (!ok) return;
    resetProgress(this.state);
    clearSave();
    saveSettings(this.state.settings);
    this.bootPhysics();
    this.audio.stopBgm();
    this.state.screen = "title";
    showTitle();
    setHudVisible(false);
    setDistanceVisible(false);
  }

  private onResize = (): void => {
    this.lastScreenW = -1;
    this.syncLayout();
  };

  private syncLayout(): void {
    if (!this.app) return;
    const orientation = currentOrientation();
    const w = this.app.screen.width;
    const h = this.app.screen.height;
    if (w === this.lastScreenW && h === this.lastScreenH && orientation === this.lastOrientation) return;
    this.lastScreenW = w;
    this.lastScreenH = h;
    this.lastOrientation = orientation;
    const size = layoutView(this.app, this.view);
    this.play.resize(size.width, size.height);
    this.paint();
  }

  private bootPhysics(): void {
    this.physics?.destroy();
    this.held = null;
    this.play.endEvolve();
    this.physics = new PhysicsWorld(this.state.terrainSeed);
    this.physics.spawn(this.state);
    this.physics.write(this.state);
    this.anchorX = this.state.x;
    this.paint();
  }

  private accrueDistance(): void {
    const dx = this.state.x - this.anchorX;
    this.anchorX = this.state.x;
    if (dx <= 0) return;
    this.state.distance += metersFromPixels(dx);
  }

  private paint(): void {
    if (!this.physics) return;
    const size = designSize(this.lastOrientation ?? currentOrientation());
    this.play.sync(this.state, this.physics.sample(size.width, size.height));
  }

  private onVisibility = (): void => {
    if (!this.app) return;
    if (document.visibilityState === "hidden") this.app.stop();
    else this.app.start();
  };
}

function nextFrame(): Promise<void> {
  return new Promise((resolve) => {
    requestAnimationFrame(() => resolve());
  });
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}
