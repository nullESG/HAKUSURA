/**
 * ピンチズーム・パン対応キャンバス(スキルツリー表示用、仕様 §3)。
 * 1本指ドラッグでパン、2本指ピンチでズーム、ホイールでもズーム(PC)。
 */
import { useRef, useState, type ReactNode } from 'react';

const MIN_SCALE = 0.5;
const MAX_SCALE = 2.5;

interface View {
  x: number;
  y: number;
  scale: number;
}

export function PanZoomCanvas({
  contentWidth,
  contentHeight,
  initialView,
  children,
}: {
  contentWidth: number;
  contentHeight: number;
  initialView?: Partial<View>;
  children: ReactNode;
}) {
  const [view, setView] = useState<View>({ x: 0, y: 0, scale: 1, ...initialView });
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const pinchDist = useRef<number>(0);

  const clampScale = (s: number): number => Math.min(MAX_SCALE, Math.max(MIN_SCALE, s));

  // setPointerCapture は使わない: キャプチャするとノードボタンの click が
  // コンテナに横取りされてタップが効かなくなる。パンはコンテナ内の move で追跡する。
  const onPointerDown = (e: React.PointerEvent): void => {
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      pinchDist.current = Math.hypot(a!.x - b!.x, a!.y - b!.y);
    }
  };

  const onPointerMove = (e: React.PointerEvent): void => {
    const prev = pointers.current.get(e.pointerId);
    if (!prev) return;
    const current = { x: e.clientX, y: e.clientY };
    pointers.current.set(e.pointerId, current);

    if (pointers.current.size === 1) {
      // パン
      setView((v) => ({ ...v, x: v.x + current.x - prev.x, y: v.y + current.y - prev.y }));
    } else if (pointers.current.size === 2) {
      // ピンチズーム(2点間距離の変化率でスケール)
      const [a, b] = [...pointers.current.values()];
      const dist = Math.hypot(a!.x - b!.x, a!.y - b!.y);
      if (pinchDist.current > 0) {
        const ratio = dist / pinchDist.current;
        setView((v) => ({ ...v, scale: clampScale(v.scale * ratio) }));
      }
      pinchDist.current = dist;
    }
  };

  const onPointerEnd = (e: React.PointerEvent): void => {
    pointers.current.delete(e.pointerId);
    pinchDist.current = 0;
  };

  const onWheel = (e: React.WheelEvent): void => {
    setView((v) => ({ ...v, scale: clampScale(v.scale * (e.deltaY < 0 ? 1.1 : 0.9)) }));
  };

  return (
    <div
      className="relative h-[56dvh] touch-none overflow-hidden rounded-xl border border-neutral-800 bg-neutral-950"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerEnd}
      onPointerCancel={onPointerEnd}
      onPointerLeave={onPointerEnd}
      onWheel={onWheel}
    >
      <div
        className="absolute origin-top-left"
        style={{
          width: contentWidth,
          height: contentHeight,
          transform: `translate(${view.x}px, ${view.y}px) scale(${view.scale})`,
        }}
      >
        {children}
      </div>
      <p className="pointer-events-none absolute right-2 bottom-1 text-[9px] text-neutral-600">
        ドラッグで移動 / ピンチで拡縮
      </p>
    </div>
  );
}
