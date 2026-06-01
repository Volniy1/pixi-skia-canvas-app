import * as PIXI from "pixi.js-legacy";
import type {
  CanvasKit,
  Canvas as SkCanvas,
  Path as SkPath,
} from "canvaskit-wasm";
import { toCKColor, mapCap, mapJoin } from "./paintHelpers";

export function drawGraphics(
  g: PIXI.Graphics,
  canvas: SkCanvas,
  CK: CanvasKit,
): void {
  // Pixi 7 parses every drawShape / drawRect / moveTo+lineTo call into a
  // GraphicsData entry on `geometry.graphicsData`. Each entry carries its
  // own fill + line style, so we walk the list and emit one SkPath per entry.
  for (const data of g.geometry.graphicsData) {
    const path = buildShapePath(data.shape, CK);
    if (!path) continue;

    // Fill before stroke matches Pixi's draw order — when both styles are set
    // on the same shape, the stroke must paint on top of the fill.
    if (data.fillStyle.visible) {
      const paint = new CK.Paint();
      paint.setStyle(CK.PaintStyle.Fill);
      paint.setColor(toCKColor(CK, data.fillStyle.color, data.fillStyle.alpha));
      paint.setAntiAlias(true);
      canvas.drawPath(path, paint);
      paint.delete();
    }

    if (data.lineStyle.visible && data.lineStyle.width > 0) {
      const paint = new CK.Paint();
      paint.setStyle(CK.PaintStyle.Stroke);
      paint.setStrokeWidth(data.lineStyle.width);
      paint.setColor(toCKColor(CK, data.lineStyle.color, data.lineStyle.alpha));
      paint.setStrokeCap(mapCap(CK, data.lineStyle.cap));
      paint.setStrokeJoin(mapJoin(CK, data.lineStyle.join));
      paint.setStrokeMiter(data.lineStyle.miterLimit);
      paint.setAntiAlias(true);
      canvas.drawPath(path, paint);
      paint.delete();
    }

    path.delete();
  }
}

// Map each PIXI shape enum to the equivalent CanvasKit PathBuilder call.
// Polygons preserve `closeStroke=false` so an open moveTo/lineTo path stays
// open in Skia too (matches the spec example's white/yellow line strokes).
export function buildShapePath(
  shape: PIXI.IShape,
  CK: CanvasKit,
): SkPath | null {
  const builder = new CK.PathBuilder();

  switch (shape.type) {
    case PIXI.SHAPES.RECT: {
      const r = shape as PIXI.Rectangle;
      builder.addRect(CK.LTRBRect(r.x, r.y, r.x + r.width, r.y + r.height));
      break;
    }
    case PIXI.SHAPES.ELIP: {
      // Pixi Ellipse: (x, y) is the centre; width/height are semi-axes.
      const e = shape as PIXI.Ellipse;
      builder.addOval(
        CK.LTRBRect(e.x - e.width, e.y - e.height, e.x + e.width, e.y + e.height),
      );
      break;
    }
    case PIXI.SHAPES.CIRC: {
      const c = shape as PIXI.Circle;
      builder.addCircle(c.x, c.y, c.radius);
      break;
    }
    case PIXI.SHAPES.RREC: {
      const rr = shape as PIXI.RoundedRectangle;
      const rrect = [
        rr.x, rr.y, rr.x + rr.width, rr.y + rr.height,
        rr.radius, rr.radius,
        rr.radius, rr.radius,
        rr.radius, rr.radius,
        rr.radius, rr.radius,
      ];
      builder.addRRect(rrect);
      break;
    }
    case PIXI.SHAPES.POLY: {
      const p = shape as PIXI.Polygon;
      // <4 numbers = fewer than 2 points = not drawable.
      if (p.points.length < 4) {
        builder.detachAndDelete().delete();
        return null;
      }
      builder.addPolygon(p.points, !!p.closeStroke);
      break;
    }
    default:
      builder.detachAndDelete().delete();
      return null;
  }

  return builder.detachAndDelete();
}
