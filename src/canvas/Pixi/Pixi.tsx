import { useEffect, useRef } from "react";
import * as PIXI from "pixi.js-legacy";
import "./Pixi.css";

type Props = {
  dimmed: boolean;
  container: PIXI.Container | null;
};

export function Pixi({ dimmed, container }: Props) {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!container) return;
    const host = hostRef.current!;

    const app = new PIXI.Application({
      forceCanvas: true,
      resizeTo: host,
      backgroundColor: 0xffffff,
      antialias: true,
    });

    host.appendChild(app.view as HTMLCanvasElement);
    app.stage.eventMode = "static";
    app.stage.addChild(container);

    return () => {
      app.stage.removeChild(container);
      app.destroy(true);
    };
  }, [container]);

  return (
    <div ref={hostRef} className={`pixi${dimmed ? " pixi--dimmed" : ""}`}></div>
  );
}
