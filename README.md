# Pixi.js + Skia Canvas App

A side-by-side renderer that draws the same `PIXI.Container` through two
independent backends — `pixi.js-legacy` in canvas mode and Google's Skia
(CanvasKit WASM) — plus a real vector **PDF export** powered by Skia's PDF backend.

#### You can check it out right now on https://volniy1.github.io/pixi-skia-canvas-app/

# 1 - Chosen Skia Library

**CanvasKit-WASM** — Skia compiled to WebAssembly. Custom-built locally with
`skia_enable_pdf=true` and JPEG codec callbacks so the PDF backend works in the browser.
link - https://skia.org/docs/user/modules/canvaskit/

# 2 - Features

### Requirements Done

- Custom Skia wrapper that walks a `PIXI.Container` tree and renders every node
- Full transform support — translate, rotate, scale (via Pixi's `localTransform`)
- **PIXI.Graphics** — `drawShape`, `moveTo`, `lineTo`, `drawRect`, ellipse, circle, rounded-rect, polygon (fill + stroke)
- **PIXI.Sprite** (PNG) — bitmap via Skia `drawImageRect`
- **Vector PDF export** through Skia PDF backend (sprites embed as JPEG — spec-allowed exception)
- **`pointerDown` / `pointerUp` on both canvases** via the shared `EventEmitter` on each `DisplayObject`
- "Generate Random Shape/Line" button — rect / ellipse / circle / line / sprite into the live scene
- TypeScript, `pixi.js-legacy@7.2.4`, `forceCanvas: true`, modular architecture

### Bonus Features

- Side-by-side canvases for a live visual diff between Pixi and Skia
- Custom CanvasKit WASM build with PDF backend (see [skia-build/README.md](skia-build/README.md))
- Sample output: [scene.pdf](scene.pdf) — zoom to 800%, shapes stay crisp

## Tech Stack

- React 19.2
- TypeScript 6.0
- Vite 8.0
- pixi.js-legacy 7.2.4 (canvas mode, `forceCanvas: true`)
- canvaskit-wasm 0.41 (custom build, PDF + JPEG)

# 3 - Local Setup

### Prerequisites

- Node.js 20.x or higher
- npm 10.x or higher

### Installation

1. **Install dependencies**:

   ```bash
   npm install
   ```

2. **Start development server**:

   ```bash
   npm run dev
   ```

3. **Open browser** at `http://localhost:5173`

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

---

**Author**: Arthur Koshelenko
