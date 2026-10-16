import { Assets, Container, Graphics, Texture, TilingSprite } from "pixi.js";
import { PARALLAX } from "../../core/constants";
import { groundY } from "../../core/layout";

const FAR_URL = "/assets/bg/city-far.webp";
const MID_URL = "/assets/bg/city-mid.webp";

export class ParallaxLayer {
  readonly root = new Container();
  private far: TilingSprite | null = null;
  private mid: TilingSprite | null = null;
  private procedural: Container | null = null;
  private width = 1280;
  private height = 720;
  private mode: "texture" | "procedural" = "procedural";

  async load(): Promise<void> {
    try {
      const farTex = await Assets.load<Texture>(FAR_URL);
      const midTex = await Assets.load<Texture>(MID_URL);
      this.useTextures(farTex, midTex);
    } catch (error) {
      console.warn("Parallax WebP unavailable, using procedural silhouettes.", error);
      this.useProcedural();
    }
  }

  resize(width: number, height: number): void {
    this.width = width;
    this.height = height;
    if (this.mode === "texture") this.layoutTextures();
    else this.useProcedural();
  }

  sync(distance: number): void {
    if (this.far) this.far.tilePosition.x = -distance * PARALLAX.far;
    if (this.mid) this.mid.tilePosition.x = -distance * PARALLAX.mid;
    if (this.procedural) {
      const span = this.width;
      this.procedural.x = -((distance * PARALLAX.mid) % span);
    }
  }

  private useTextures(farTex: Texture, midTex: Texture): void {
    this.clearChildren();
    this.mode = "texture";
    this.far = new TilingSprite({ texture: farTex, width: this.width, height: 320 });
    this.mid = new TilingSprite({ texture: midTex, width: this.width, height: 360 });
    this.root.addChild(this.far, this.mid);
    this.layoutTextures();
  }

  private layoutTextures(): void {
    const gy = groundY(this.height);
    if (this.far) {
      this.far.width = this.width;
      this.far.height = gy * 0.48;
      this.far.y = gy - this.far.height - 8;
    }
    if (this.mid) {
      this.mid.width = this.width;
      this.mid.height = gy * 0.62;
      this.mid.y = gy - this.mid.height;
    }
  }

  private useProcedural(): void {
    this.clearChildren();
    this.mode = "procedural";
    const gy = groundY(this.height);
    const band = gy * 0.62;
    const span = this.width;
    const layer = new Container();
    const back = cityGraphics(span, band * 0.7, 3, 0x101624);
    back.y = gy - band * 0.7 - 24;
    const front = cityGraphics(span, band, 11, 0x070b12);
    front.y = gy - band;
    const back2 = cityGraphics(span, band * 0.7, 3, 0x101624);
    back2.y = back.y;
    back2.x = span;
    const front2 = cityGraphics(span, band, 11, 0x070b12);
    front2.y = front.y;
    front2.x = span;
    layer.addChild(back, back2, front, front2);
    this.procedural = layer;
    this.root.addChild(layer);
  }

  private clearChildren(): void {
    this.far?.destroy();
    this.mid?.destroy();
    this.procedural?.destroy({ children: true });
    this.far = null;
    this.mid = null;
    this.procedural = null;
    this.root.removeChildren();
  }
}

function cityGraphics(width: number, height: number, seed: number, color: number): Graphics {
  const g = new Graphics();
  let x = 0;
  let i = 0;
  while (x < width) {
    const bw = 36 + ((i * 47 + seed * 13) % 90);
    const bh = 28 + ((i * 91 + seed * 7) % Math.max(40, Math.floor(height - 16)));
    const neon = (i + seed) % 4 === 0 ? 0xff006e : 0x00f5d4;
    g.rect(x, height - bh, bw - 6, bh).fill({ color, alpha: 0.95 });
    g.rect(x, height - bh, bw - 6, 3).fill({ color: neon, alpha: 0.9 });
    x += bw;
    i += 1;
  }
  return g;
}
