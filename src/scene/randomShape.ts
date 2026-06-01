import * as PIXI from "pixi.js-legacy";

const COLORS = [
  "#ff5252",
  "#ff9800",
  "#ffd600",
  "#66bb6a",
  "#26c6da",
  "#42a5f5",
  "#7e57c2",
  "#ec407a",
];

const KINDS = ["rect", "ellipse", "circle", "line", "sprite"] as const;
type Kind = (typeof KINDS)[number];

function rand(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function makeRandomShape(
  sceneWidth: number,
  sceneHeight: number,
  spriteTexture: PIXI.Texture | null,
): PIXI.DisplayObject {
  const kind: Kind = pick(KINDS);

  if (kind === "sprite") {
    // Fall back to a rect if the texture isn't loaded yet so the user still
    // sees something appear on the button click.
    if (!spriteTexture) return makeRandomGraphics("rect", sceneWidth, sceneHeight);
    return makeRandomSprite(spriteTexture, sceneWidth, sceneHeight);
  }
  return makeRandomGraphics(kind, sceneWidth, sceneHeight);
}

function makeRandomGraphics(
  kind: Exclude<Kind, "sprite">,
  sceneWidth: number,
  sceneHeight: number,
): PIXI.Graphics {
  const g = new PIXI.Graphics();
  const color = pick(COLORS);

  switch (kind) {
    case "rect": {
      const w = rand(40, 140);
      const h = rand(40, 140);
      g.beginFill(color).drawRect(-w / 2, -h / 2, w, h).endFill();
      break;
    }
    case "ellipse": {
      const rx = rand(30, 80);
      const ry = rand(20, 70);
      g.beginFill(color).drawEllipse(0, 0, rx, ry).endFill();
      break;
    }
    case "circle": {
      const r = rand(25, 70);
      g.beginFill(color).drawCircle(0, 0, r).endFill();
      break;
    }
    case "line": {
      const len = rand(60, 200);
      const stroke = rand(4, 10);
      g.lineStyle(stroke, color, 1)
        .moveTo(-len / 2, 0)
        .lineTo(len / 2, 0);
      // Commit the line into graphicsData immediately so the Skia walker sees it
      // on the first render (Pixi only flushes currentPath on its own render pass).
      g.finishPoly();
      // Pixi's containsPoint only hits shapes with a visible *fill*, so a stroked
      // polyline would never register clicks. Give the line an explicit hitArea
      // along the stroke (in local space) so both backends report hits.
      g.hitArea = new PIXI.Rectangle(-len / 2, -stroke / 2, len, stroke);
      break;
    }
  }

  applyRandomTransform(g, sceneWidth, sceneHeight);
  g.eventMode = "static";
  g.on("pointerdown", () => console.log(`random ${kind} pointerdown!`));
  g.on("pointerup", () => console.log(`random ${kind} pointerup!`));
  return g;
}

function makeRandomSprite(
  texture: PIXI.Texture,
  sceneWidth: number,
  sceneHeight: number,
): PIXI.Sprite {
  const sprite = new PIXI.Sprite(texture);
  // Centre the anchor so rotation/scale pivot around the sprite's middle —
  // matches how the random Graphics shapes are drawn (around their origin).
  sprite.anchor.set(0.5);
  applyRandomTransform(sprite, sceneWidth, sceneHeight);
  sprite.eventMode = "static";
  sprite.on("pointerdown", () => console.log("random sprite pointerdown!"));
  sprite.on("pointerup", () => console.log("random sprite pointerup!"));
  return sprite;
}

function applyRandomTransform(
  obj: PIXI.DisplayObject,
  sceneWidth: number,
  sceneHeight: number,
): void {
  obj.position.set(rand(60, sceneWidth - 60), rand(60, sceneHeight - 60));
  obj.angle = rand(0, 360);
  const s = rand(0.7, 1.3);
  obj.scale.set(s, s);
}
