import * as PIXI from "pixi.js-legacy";
import type { CanvasKit, Canvas as SkCanvas } from "canvaskit-wasm";
import { drawGraphics } from "./graphicsToSkia";
import { drawSprite } from "./spriteToSkia";

/**
 * Render a PIXI.Container tree onto a Skia canvas.
 *
 * Walks the tree depth-first, applies each node's local transform via
 * canvas.concat, and dispatches to a per-type drawer. The same function backs
 * both the live Skia canvas (Skia.tsx) and PDF export (pdfExport.ts), which
 * is what makes the PDF output truly vector — there is no bitmap intermediary.
 */
export function renderPixiToSkia(
  root: PIXI.Container,
  canvas: SkCanvas,
  CK: CanvasKit,
): void {
  renderNode(root, canvas, CK);
}

function renderNode(
  obj: PIXI.DisplayObject,
  canvas: SkCanvas,
  CK: CanvasKit,
): void {
  if (!obj.visible || !obj.renderable) return;

  canvas.save();
  applyLocalTransform(obj, canvas);

  if (obj instanceof PIXI.Graphics) {
    drawGraphics(obj, canvas, CK);
  } else if (obj instanceof PIXI.Sprite) {
    drawSprite(obj, canvas, CK);
  }

  if (obj instanceof PIXI.Container) {
    for (const child of obj.children) {
      renderNode(child, canvas, CK);
    }
  }

  canvas.restore();
}

function applyLocalTransform(obj: PIXI.DisplayObject, canvas: SkCanvas): void {
  // Pixi already composes pivot + scale + rotation + position into a single
  // affine matrix on obj.transform.localTransform. Use it directly — manually
  // re-applying the components in order is error-prone and unnecessary.
  obj.transform.updateLocalTransform();
  const m = obj.transform.localTransform;
  // Pixi Matrix layout:  | a c tx |          CanvasKit expects a row-major
  //                      | b d ty |          number[9]: [a, c, tx, b, d, ty, 0, 0, 1].
  //                      | 0 0 1  |
  canvas.concat([m.a, m.c, m.tx, m.b, m.d, m.ty, 0, 0, 1]);
}
