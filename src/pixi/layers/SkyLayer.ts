import { Container, FillGradient, Graphics } from "pixi.js";
import { COLORS, PARALLAX } from "../../core/constants";
import { groundY } from "../../core/layout";

export class SkyLayer {
  readonly root = new Container();
  private readonly backdrop = new Graphics();
  private readonly fog = new Graphics();
  private width = 1280;
  private height = 720;

  constructor() {
    this.fog.blendMode = "add";
    this.root.addChild(this.backdrop, this.fog);
  }

  resize(width: number, height: number): void {
    this.width = width;
    this.height = height;
    this.drawBackdrop();
    this.drawFog();
  }

  sync(distance: number): void {
    const span = this.width;
    this.fog.x = -((distance * PARALLAX.fog) % span);
  }

  private drawBackdrop(): void {
    const gradient = new FillGradient({
      start: { x: 0, y: 0 },
      end: { x: 0, y: 1 },
      colorStops: [
        { offset: 0, color: COLORS.bgDeep },
        { offset: 0.55, color: COLORS.bg },
        { offset: 1, color: COLORS.horizon },
      ],
    });
    const g = this.backdrop;
    g.clear();
    g.rect(0, 0, this.width, this.height).fill(gradient);

    const gy = groundY(this.height);
    for (let i = 0; i < 48; i++) {
      const x = (i * 97) % this.width;
      const y = (i * 53) % (gy * 0.72);
      const r = 1 + (i % 3);
      const color = i % 7 === 0 ? COLORS.magenta : COLORS.cyan;
      g.circle(x, y, r).fill({ color, alpha: 0.35 + (i % 5) * 0.08 });
    }
  }

  private drawFog(): void {
    const g = this.fog;
    g.clear();
    const gy = groundY(this.height);
    const span = this.width * 2;
    for (let i = 0; i < 8; i++) {
      const x = (i / 8) * span;
      g.ellipse(x, gy * 0.72, this.width * 0.22, 36).fill({
        color: i % 2 === 0 ? COLORS.cyan : COLORS.violet,
        alpha: 0.05,
      });
    }
  }
}
