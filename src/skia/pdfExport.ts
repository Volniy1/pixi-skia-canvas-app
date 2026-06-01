import type { CanvasKit, Canvas as SkCanvas } from "canvaskit-wasm";
import * as PIXI from "pixi.js-legacy";
import { loadCanvasKit } from "./canvasKit";
import { renderPixiToSkia } from "./renderPixiToSkia";

interface PdfDocument {
  beginPage(width: number, height: number): SkCanvas;
  endPage(): void;
  close(): Uint8Array;
}

interface PdfCapableCanvasKit extends CanvasKit {
  MakePDFDocument(): PdfDocument;
}

export async function exportContainerToPdf(
  container: PIXI.Container,
  width: number,
  height: number,
  filename = "scene.pdf",
): Promise<void> {
  const CK = await loadCanvasKit();
  // MakePDFDocument only exists on the custom WASM built from skia-build/.
  // The npm canvaskit-wasm types don't declare it, so we cast through unknown
  // and runtime-check before calling.
  const pdfCK = CK as unknown as Partial<PdfCapableCanvasKit>;
  if (typeof pdfCK.MakePDFDocument !== "function") {
    throw new Error(
      "CanvasKit PDF backend missing — build a custom canvaskit.wasm (see skia-build/README.md).",
    );
  }

  const doc = pdfCK.MakePDFDocument();
  const pdfCanvas = doc.beginPage(width, height);
  renderPixiToSkia(container, pdfCanvas, CK);
  doc.endPage();
  const bytes = doc.close();

  const blob = new Blob([bytes as BlobPart], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
