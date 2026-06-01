import * as PIXI from "pixi.js-legacy";
import type { CanvasKit } from "canvaskit-wasm";

export function toCKColor(CK: CanvasKit, color: number, alpha: number) {
  const r = (color >> 16) & 0xff;
  const g = (color >> 8) & 0xff;
  const b = color & 0xff;
  return CK.Color(r, g, b, alpha);
}

export function mapCap(CK: CanvasKit, cap: PIXI.LINE_CAP) {
  switch (cap) {
    case PIXI.LINE_CAP.ROUND:
      return CK.StrokeCap.Round;
    case PIXI.LINE_CAP.SQUARE:
      return CK.StrokeCap.Square;
    default:
      return CK.StrokeCap.Butt;
  }
}

export function mapJoin(CK: CanvasKit, join: PIXI.LINE_JOIN) {
  switch (join) {
    case PIXI.LINE_JOIN.ROUND:
      return CK.StrokeJoin.Round;
    case PIXI.LINE_JOIN.BEVEL:
      return CK.StrokeJoin.Bevel;
    default:
      return CK.StrokeJoin.Miter;
  }
}
