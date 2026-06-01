import type { CanvasKit, CanvasKitInitOptions, Surface } from "canvaskit-wasm";

type CanvasKitInitFn = (opts: CanvasKitInitOptions) => Promise<CanvasKit>;

declare global {
  interface Window {
    CanvasKitInit?: CanvasKitInitFn;
  }
}

// Memoise the CanvasKit init across the whole app session. The WASM module
// is process-wide — re-initialising it (e.g. from a StrictMode-remounted
// useEffect) leaks the previous instance and can crash on the second load.
let pending: Promise<CanvasKit> | null = null;

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      `script[data-canvaskit="${src}"]`,
    );
    if (existing) {
      if (window.CanvasKitInit) return resolve();
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error(`Failed to load ${src}`)), { once: true });
      return;
    }
    const s = document.createElement("script");
    s.src = src;
    s.async = true;
    s.dataset.canvaskit = src;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error(`Failed to load ${src}`));
    document.head.appendChild(s);
  });
}

// Load our locally-built canvaskit.js (which exposes the custom PDF binding)
// rather than the npm package's loader. The npm-bundled .js was compiled
// against the stock WASM and doesn't see SkPDFDocument.
export function loadCanvasKit(): Promise<CanvasKit> {
  if (!pending) {
    pending = loadScript("/canvaskit.js").then(() => {
      const init = window.CanvasKitInit;
      if (!init) throw new Error("CanvasKitInit not found on window after loading /canvaskit.js");
      return init({ locateFile: (file: string) => `/${file}` });
    });
  }
  return pending;
}

export function createSurface(
  CK: CanvasKit,
  canvas: HTMLCanvasElement,
  width: number,
  height: number,
): Surface | null {
  canvas.width = width;
  canvas.height = height;
  return CK.MakeCanvasSurface(canvas);
}
