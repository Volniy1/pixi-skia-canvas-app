# Custom CanvasKit WASM build (with PDF backend)

The npm package `canvaskit-wasm` ships **without** PDF support. To make
`Export to PDF` produce a real vector PDF, you need to rebuild CanvasKit
from Skia with `skia_enable_pdf=true`.

The resulting two files (`canvaskit.wasm`, `canvaskit.js`) are
platform-agnostic — build once on any host, then drop into
`pixi-skia-app/public/`.

> Budget 1–2 hours on a clean machine. The Skia checkout is ~3 GB and the
> first build is slow; subsequent incremental builds are minutes.

---

## 1. Prerequisites

| Tool        | Notes                                                              |
| ----------- | ------------------------------------------------------------------ |
| Python 3    | Skia's build glue.                                                 |
| Git         | For `depot_tools` and cloning Skia.                                |
| Ninja       | Pulled in via `depot_tools`.                                       |
| Emscripten  | `emsdk` from <https://github.com/emscripten-core/emsdk>.           |
| depot_tools | <https://chromium.googlesource.com/chromium/tools/depot_tools.git> |

**Windows:** native PowerShell + emsdk works, but the build is smoother
under WSL2 (Ubuntu). The resulting `.wasm` runs identically in the
browser regardless of which host you built on.

---

## 2. One-time setup

```bash
# depot_tools — adds gclient, gn, ninja to PATH
git clone https://chromium.googlesource.com/chromium/tools/depot_tools.git
export PATH="$PWD/depot_tools:$PATH"

# emscripten
git clone https://github.com/emscripten-core/emsdk.git
cd emsdk
./emsdk install latest
./emsdk activate latest
source ./emsdk_env.sh
cd ..

# skia
git clone https://skia.googlesource.com/skia.git
cd skia
python3 tools/git-sync-deps
```

---

## 3. Build CanvasKit with PDF support

Skia's stock build script is `modules/canvaskit/compile.sh`. We invoke it
in release mode, then edit the generated `out/canvaskit/args.gn` to enable
PDF.

```bash
cd skia
./modules/canvaskit/compile.sh release
```

If you need to flip the PDF flag manually, edit
`out/canvaskit/args.gn` and ensure these lines exist:

```
skia_enable_pdf = true
skia_use_zlib = true
```

Then rebuild:

```bash
ninja -C out/canvaskit canvaskit
```

Outputs land at `skia/out/canvaskit/canvaskit.{js,wasm}`.

---

## 4. Drop the build into the app

```bash
cp skia/out/canvaskit/canvaskit.wasm <repo>/pixi-skia-app/public/canvaskit.wasm
cp skia/out/canvaskit/canvaskit.js   <repo>/pixi-skia-app/public/canvaskit.js   # optional override
```

The app's `loadCanvasKit()` (in `src/skia/canvasKit.ts`) uses Vite's
`public/` folder, so `/canvaskit.wasm` resolves to the file you just
copied. Restart `npm run dev` so Vite re-serves the new asset.

---

## 5. Verify

1. Reload the app, click **Export to PDF**.
2. The downloaded `scene.pdf` opens in any PDF viewer.
3. Zoom to 800 % — the shapes stay crisp (no pixelation). That confirms
   they were emitted as vector paths, not rasterised.
4. `pdfinfo scene.pdf` (Poppler) should report one page at the requested
   dimensions; `pdfimages -list scene.pdf` should list only the
   sprite-derived images (if any).

If clicking the button throws
*"CanvasKit PDF backend missing"*, the custom WASM either isn't in
`public/` or `public/canvaskit.js` wasn't updated and the app is still
loading the npm-shipped loader. Replace both files and hard-reload.
