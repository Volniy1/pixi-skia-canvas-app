import * as PIXI from "pixi.js-legacy";

type Hittable = PIXI.DisplayObject & {
  containsPoint?: (point: PIXI.IPointData) => boolean;
};

export function hitTest(
  container: PIXI.Container,
  globalX: number,
  globalY: number,
): PIXI.DisplayObject | null {
  return hitTestNode(container, { x: globalX, y: globalY });
}

function hitTestNode(
  obj: PIXI.DisplayObject,
  global: PIXI.IPointData,
): PIXI.DisplayObject | null {
  if (!obj.visible || !obj.renderable) return null;

  // Walk children in reverse so we hit-test top-of-z-stack first. Pixi paints
  // children in index order, so the last-painted (topmost) child should be the
  // first one we consider for a click.
  if (obj instanceof PIXI.Container) {
    for (let i = obj.children.length - 1; i >= 0; i--) {
      const hit = hitTestNode(obj.children[i], global);
      if (hit) return hit;
    }
  }

  const interactive =
    obj.eventMode === "static" || obj.eventMode === "dynamic";
  if (!interactive) return null;

  // Pixi's Graphics.containsPoint and Sprite.containsPoint both apply
  // `worldTransform.applyInverse` internally, so they expect a STAGE-space
  // (global) point. `hitArea.contains`, on the other hand, is in the object's
  // local frame — for that path we hand-roll the inverse here.
  if (obj.hitArea) {
    const local = obj.worldTransform.applyInverse(global);
    return obj.hitArea.contains(local.x, local.y) ? obj : null;
  }

  const h = obj as Hittable;
  if (typeof h.containsPoint === "function" && h.containsPoint(global)) {
    return obj;
  }
  return null;
}
