import { useEffect, useState } from "react";
import * as PIXI from "pixi.js-legacy";
import { Card } from "./ui/Card/Card";
import { Pixi } from "./canvas/Pixi/Pixi";
import { Skia } from "./canvas/Skia/Skia";
import { exportContainerToPdf } from "./skia/pdfExport";
import { makeRandomShape } from "./scene/randomShape";
import "./App.css";

const SCENE_WIDTH = 800;
const SCENE_HEIGHT = 600;
const SPRITE_URL = "/sprite.png";

function buildInitialScene(spriteTexture: PIXI.Texture): PIXI.Container {
  const mainContainer = new PIXI.Container();
  const subContainer = new PIXI.Container();
  const g1 = new PIXI.Graphics();
  const g2 = new PIXI.Graphics();
  const g3 = new PIXI.Graphics();
  const g4 = new PIXI.Graphics();

  g1.beginFill("#ff0000").drawEllipse(230, 60, 100, 100).endFill();
  g1.position.set(120, 200);
  g1.angle = 0;
  g1.eventMode = "static";
  g1.on("pointerdown", () => console.log("g1 pointerdown!"));
  g1.on("pointerup", () => console.log("g1 pointerup!"));

  g2.beginFill("#0000ff").drawRect(50, 75, 100, 150).endFill();
  g2.position.set(300, 90);
  g2.angle = 45;
  g2.scale.set(1.5, 1.7);
  g2.eventMode = "static";
  g2.on("pointerdown", () => console.log("g2 pointerdown!"));
  g2.on("pointerup", () => console.log("g2 pointerup!"));

  // finishPoly() commits the in-progress `currentPath` (built up by moveTo/lineTo)
  // into `geometry.graphicsData`. Pixi auto-calls it on its first render, but the
  // Skia walker reads `graphicsData` directly — without this, the line is invisible
  // on Skia until Pixi has had a chance to render and re-mutate the container.

  g3.lineStyle(10, "#ffffff", 1).moveTo(0, 0).lineTo(0, 100);
  g3.finishPoly();
  g3.angle = -20;

  g4.lineStyle(10, "#ffff00", 1).moveTo(0, 0).lineTo(500, 0);
  g4.finishPoly();
  g4.angle = 20;

  // A PIXI.Sprite (bitmap PNG) demonstrates the spec-required Sprite path:
  // both backends render it from the same texture, and pointer events hit it
  // on either canvas via the shared EventEmitter.
  const sprite = new PIXI.Sprite(spriteTexture);
  sprite.anchor.set(0.5);
  sprite.position.set(650, 100);
  sprite.angle = 15;
  sprite.eventMode = "static";
  sprite.on("pointerdown", () => console.log("sprite pointerdown!"));
  sprite.on("pointerup", () => console.log("sprite pointerup!"));

  subContainer.position.set(150, 100);
  subContainer.addChild(g3, g4);
  mainContainer.addChild(subContainer, g1, g2, sprite);

  return mainContainer;
}

function App() {
  const [dimmed, setDimmed] = useState(false);
  const [container, setContainer] = useState<PIXI.Container | null>(null);
  const [spriteTexture, setSpriteTexture] = useState<PIXI.Texture | null>(null);
  const [sceneVersion, setSceneVersion] = useState(0);

  // Preload the sprite texture once. PIXI.Assets caches per-URL, so a second
  // load (e.g. after a StrictMode remount) is effectively free.
  useEffect(() => {
    let cancelled = false;
    PIXI.Assets.load<PIXI.Texture>(SPRITE_URL).then((tex) => {
      if (!cancelled) setSpriteTexture(tex);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Build the scene once the sprite texture is ready, so the initial render on
  // both backends already shows the sprite. The setState-in-effect pattern is
  // intentional: each effect cycle owns exactly one PIXI.Container which is
  // destroyed in cleanup; using a useState lazy initialiser instead would
  // crash under StrictMode (destroyed container reused on remount).
  useEffect(() => {
    if (!spriteTexture) return;
    const c = buildInitialScene(spriteTexture);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setContainer(c);
    return () => {
      setContainer(null);
      c.destroy({ children: true, texture: false });
    };
  }, [spriteTexture]);

  const handleGenerate = () => {
    if (!container) return;
    container.addChild(
      makeRandomShape(SCENE_WIDTH, SCENE_HEIGHT, spriteTexture)
    );
    setSceneVersion((n) => n + 1);
    setDimmed(true);
    window.setTimeout(() => setDimmed(false), 100);
  };

  const handleExport = async () => {
    if (!container) return;
    try {
      await exportContainerToPdf(container, SCENE_WIDTH, SCENE_HEIGHT);
    } catch (err) {
      console.error(err);
      window.alert(
        err instanceof Error ? err.message : "PDF export failed (see console)"
      );
    }
  };

  return (
    <main className="page">
      <header className="page__header">
        <h1 className="page__title">PIXI VS SKIA APP</h1>
      </header>

      <div className="page__grid">
        <Card title="Pixi.js">
          <Pixi dimmed={dimmed} container={container} />
        </Card>
        <Card title="Skia">
          <Skia
            dimmed={dimmed}
            container={container}
            sceneVersion={sceneVersion}
          />
        </Card>
      </div>

      <div className="page__actions">
        <button
          type="button"
          className="btn btn--primary"
          onClick={handleGenerate}
        >
          Generate Random Shape
        </button>
        <button
          type="button"
          className="btn btn--secondary"
          onClick={handleExport}
        >
          Export to PDF
        </button>
      </div>
    </main>
  );
}

export default App;
