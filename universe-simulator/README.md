# Universe Simulator

Client-only solar system simulation (Sun + Mercury–Neptune) built with Vite, TypeScript, and Three.js. Deploy as a static site on **Cloudflare Pages**.

## Develop

```bash
cd universe-simulator
npm install
npm run dev
```

Open the URL Vite prints (default `http://127.0.0.1:5173`).

## Build

```bash
npm run build
npm run preview
```

## Cloudflare Pages

| Setting | Value |
|--------|--------|
| Root directory | `universe-simulator` (monorepo) or repo root (standalone) |
| Build command | `npm ci && npm run build` |
| Output directory | `dist` |
| Node | 22 |

Alternative CLI:

```bash
npm run build
npx wrangler pages deploy dist --project-name universe-simulator
```

## Scale conventions

Orbital radii use `8 + log10(AU + 0.05) × 28` scene units. Planet sizes use a logarithmic compression of Earth-radius ratios so the gas giants remain visible without overlapping the Sun. Orbital motion uses mean angular speed from sidereal periods (Kepler-like, circular approximation).

## Tools

- Select / multi-select (Shift+click)
- Destroy, meteor impact, restore one, reset all, undo
- Time scale 0.25×–100× and pause
- Orbit / pan / zoom camera; double-click a planet in the list to focus