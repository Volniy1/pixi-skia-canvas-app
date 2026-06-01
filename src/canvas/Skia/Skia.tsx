import { useEffect, useRef, useState } from "react";
import type * as PIXI from "pixi.js-legacy";
import type { CanvasKit, Surface } from "canvaskit-wasm";
import { loadCanvasKit, createSurface } from "../../skia/canvasKit";
import { renderPixiToSkia } from "../../skia/renderPixiToSkia";
import { hitTest } from "../../skia/hitTest";
import "./Skia.css";

// Re-emit a native PointerEvent through Pixi's EventEmitter so the same
// `.on("pointerdown", ...)` handlers attached in App.tsx fire on the Skia
// canvas too. We build a *fresh plain object* rather than cloning the
// PointerEvent: `Event.prototype.target` is a read-only getter, so any
// approach that inherits PointerEvent's prototype (Object.create / spread
// into a copy) throws TypeError when we try to set `target` to the
// DisplayObject. The fields below are the ones Pixi consumers actually read.
function toFederatedPointerEvent(
  e: PointerEvent,
  target: PIXI.DisplayObject,
): PIXI.FederatedPointerEvent {
  const synthetic = {
    type: e.type,
    clientX: e.clientX,
    clientY: e.clientY,
    screenX: e.screenX,
    screenY: e.screenY,
    button: e.button,
    buttons: e.buttons,
    pointerType: e.pointerType,
    pointerId: e.pointerId,
    target,
    currentTarget: target,
    nativeEvent: e,
    preventDefault: () => e.preventDefault(),
    stopPropagation: () => e.stopPropagation(),
  };
  return synthetic as unknown as PIXI.FederatedPointerEvent;
}

type Props = {
  dimmed: boolean;
  container: PIXI.Container | null;
  sceneVersion: number;
};

export function Skia({ dimmed, container, sceneVersion }: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const surfaceRef = useRef<Surface | null>(null);
  const [ck, setCK] = useState<CanvasKit | null>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });

  useEffect(() => {
    let cancelled = false;
    loadCanvasKit().then((c) => {
      if (!cancelled) setCK(c);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setSize({ w: Math.max(1, Math.floor(width)), h: Math.max(1, Math.floor(height)) });
    });
    ro.observe(host);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    if (!ck || !canvasRef.current || size.w === 0 || size.h === 0) return;
    surfaceRef.current?.delete();
    surfaceRef.current = createSurface(ck, canvasRef.current, size.w, size.h);
    return () => {
      surfaceRef.current?.delete();
      surfaceRef.current = null;
    };
  }, [ck, size.w, size.h]);

  useEffect(() => {
    if (!ck || !container) return;
    const surface = surfaceRef.current;
    if (!surface) return;
    const skCanvas = surface.getCanvas();
    skCanvas.clear(ck.WHITE);
    renderPixiToSkia(container, skCanvas, ck);
    surface.flush();
  }, [ck, container, sceneVersion, size.w, size.h]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !container) return;

    const dispatch = (type: "pointerdown" | "pointerup") => (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      const target = hitTest(container, e.clientX - rect.left, e.clientY - rect.top);
      if (target) target.emit(type, toFederatedPointerEvent(e, target));
    };

    const onDown = dispatch("pointerdown");
    const onUp = dispatch("pointerup");
    canvas.addEventListener("pointerdown", onDown);
    canvas.addEventListener("pointerup", onUp);
    return () => {
      canvas.removeEventListener("pointerdown", onDown);
      canvas.removeEventListener("pointerup", onUp);
    };
  }, [container]);

  return (
    <div ref={hostRef} className={`skia${dimmed ? " skia--dimmed" : ""}`}>
      <canvas ref={canvasRef} className="skia__canvas" />
    </div>
  );
}
