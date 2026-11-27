import { SolarSystem, ToolMode } from "../sim/solarSystem";

export interface ToolPaletteHandlers {
  onModeChange: (mode: ToolMode) => void;
  onDestroy: () => void;
  onImpact: () => void;
  onRestoreOne: () => void;
  onReset: () => void;
  onUndo: () => void;
  onFocus: (planetId: string) => void;
  onSelectPlanet: (planetId: string) => void;
  onTimeScale: (value: number) => void;
  onPauseToggle: (paused: boolean) => void;
  getState: () => SolarSystem;
}

export class ToolPalette {
  private readonly root: HTMLElement;
  private readonly handlers: ToolPaletteHandlers;
  private modeButtons: Partial<Record<ToolMode, HTMLButtonElement>> = {};
  private planetList!: HTMLUListElement;
  private undoBtn!: HTMLButtonElement;
  private timeLabel!: HTMLSpanElement;
  private pauseBtn!: HTMLButtonElement;

  constructor(rootId: string, handlers: ToolPaletteHandlers) {
    const el = document.getElementById(rootId);
    if (!el) throw new Error(`Missing #${rootId}`);
    this.root = el;
    this.handlers = handlers;
    this.render();
    this.refresh();
  }

  refresh(): void {
    const sim = this.handlers.getState();
    this.undoBtn.disabled = !sim.history.canUndo;

    for (const mode of ["select", "destroy", "impact"] as ToolMode[]) {
      this.modeButtons[mode]?.classList.toggle("active", sim.mode === mode);
    }

    this.timeLabel.textContent = sim.paused
      ? "일시정지"
      : `${sim.timeScale.toFixed(2)}×`;
    this.pauseBtn.textContent = sim.paused ? "재생" : "일시정지";

    const items = sim.listStates();
    this.planetList.innerHTML = "";
    for (const item of items) {
      const li = document.createElement("li");
      li.classList.toggle("selected", sim.selectedIds.has(item.id));
      li.classList.toggle("destroyed", item.destroyed);

      const swatch = document.createElement("span");
      swatch.className = "planet-swatch";
      swatch.style.background = `#${item.color.toString(16).padStart(6, "0")}`;

      li.appendChild(swatch);
      li.appendChild(document.createTextNode(item.nameKo));

      li.addEventListener("click", (e) => {
        if (e.shiftKey) {
          this.handlers.onSelectPlanet(item.id);
        } else {
          sim.selectOnly(item.id);
          this.handlers.onSelectPlanet(item.id);
        }
        this.refresh();
      });

      li.addEventListener("dblclick", () => {
        this.handlers.onFocus(item.id);
      });

      this.planetList.appendChild(li);
    }
  }

  private render(): void {
    this.root.innerHTML = `
      <p class="panel-title">우주 도구</p>
      <section class="tool-group">
        <h3>모드</h3>
        <div class="btn-row" id="mode-row"></div>
      </section>
      <section class="tool-group">
        <h3>행동</h3>
        <div class="btn-row">
          <button type="button" class="tool-btn" data-action="destroy">행성 파괴</button>
          <button type="button" class="tool-btn" data-action="impact">운석 충돌</button>
          <button type="button" class="tool-btn" data-action="restore">하나 복원</button>
          <button type="button" class="tool-btn" data-action="reset">전체 리셋</button>
          <button type="button" class="tool-btn" id="undo-btn" data-action="undo">실행 취소</button>
        </div>
      </section>
      <section class="tool-group">
        <h3>시간</h3>
        <button type="button" class="tool-btn" id="pause-btn" style="width:100%">일시정지</button>
        <label class="range-row">
          <span>배율 <span id="time-label">1×</span> (0.25×–100×)</span>
          <input type="range" id="time-scale" min="0" max="100" step="0.25" value="1" />
        </label>
      </section>
      <section class="tool-group">
        <h3>행성 (Shift+클릭 다중 선택)</h3>
        <ul class="planet-list" id="planet-list"></ul>
        <p class="scale-note">
          궤도·크기는 교육용 로그 스케일입니다. 실제 AU/반지름 비율은 HUD와 README에 표기합니다.
        </p>
      </section>
    `;

    const modeRow = this.root.querySelector("#mode-row")!;
    const modes: { id: ToolMode; label: string }[] = [
      { id: "select", label: "선택" },
      { id: "destroy", label: "파괴 모드" },
      { id: "impact", label: "충돌 모드" },
    ];
    for (const m of modes) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "tool-btn";
      btn.textContent = m.label;
      btn.addEventListener("click", () => {
        this.handlers.onModeChange(m.id);
        this.refresh();
      });
      modeRow.appendChild(btn);
      this.modeButtons[m.id] = btn;
    }

    this.planetList = this.root.querySelector("#planet-list")!;
    this.undoBtn = this.root.querySelector("#undo-btn")!;
    this.timeLabel = this.root.querySelector("#time-label")!;
    this.pauseBtn = this.root.querySelector("#pause-btn")!;

    this.root.querySelectorAll("[data-action]").forEach((node) => {
      const btn = node as HTMLButtonElement;
      btn.addEventListener("click", () => {
        const action = btn.dataset.action;
        switch (action) {
          case "destroy":
            this.handlers.onDestroy();
            break;
          case "impact":
            this.handlers.onImpact();
            break;
          case "restore":
            this.handlers.onRestoreOne();
            break;
          case "reset":
            this.handlers.onReset();
            break;
          case "undo":
            this.handlers.onUndo();
            break;
        }
        this.refresh();
      });
    });

    this.pauseBtn.addEventListener("click", () => {
      const sim = this.handlers.getState();
      this.handlers.onPauseToggle(!sim.paused);
      this.refresh();
    });

    const slider = this.root.querySelector("#time-scale") as HTMLInputElement;
    const mapScale = (v: number): number => {
      if (v <= 1) return 0.25 + (v / 1) * 0.75;
      return 1 + ((v - 1) / 99) * 99;
    };
  slider.addEventListener("input", () => {
      const raw = Number(slider.value);
      const scale = mapScale(raw);
      this.handlers.onTimeScale(scale);
      this.refresh();
    });
  }
}