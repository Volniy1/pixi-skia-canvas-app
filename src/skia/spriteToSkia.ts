import type * as PIXI from "pixi.js-legacy";
import type { CanvasKit, Canvas as SkCanvas } from "canvaskit-wasm";

export function drawSprite(
  sprite: PIXI.Sprite,
  canvas: SkCanvas,
  CK: CanvasKit,
): void {
  const tex = sprite.texture;

  // pixi.js-legacy stores the drawable on resource.source (HTMLImageElement,
  // ImageBitmap, or HTMLCanvasElement, depending on how the texture was loaded).
  // CanvasKit.MakeImageFromCanvasImageSource accepts the same union, so we can
  // pass it through directly.
  const resource = tex.baseTexture.resource as { source?: CanvasImageSource };
  const src = resource?.source;
  if (!src) return;

  const img = CK.MakeImageFromCanvasImageSource(src);
  if (!img) return;

  // Pixi sprite.anchor is a normalised [0..1] origin within the texture,
  // measured from the top-left. To draw the sprite around its anchor, we offset
  // the destination rect by -(anchor * size). Parent transform already applies
  // sprite.scale / rotation / position, so we render at the texture's natural size.
  const w = tex.orig.width;
  const h = tex.orig.height;
  const ax = sprite.anchor.x * w;
  const ay = sprite.anchor.y * h;

  const frame = tex.frame;
  const srcRect = CK.LTRBRect(
    frame.x,
    frame.y,
    frame.x + frame.width,
    frame.y + frame.height,
  );
  const dstRect = CK.LTRBRect(-ax, -ay, -ax + w, -ay + h);

  const paint = new CK.Paint();
  canvas.drawImageRect(img, srcRect, dstRect, paint);
  paint.delete();
  img.delete();
}
