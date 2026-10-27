"use client";

import { useEffect, useRef, useState } from "react";
import type { SnapshotSummary } from "@/lib/analysis";
import { dotDate, num } from "@/lib/format";

const H = 220;
const PAD = { top: 16, right: 64, bottom: 28, left: 44 };

const SERIES = [
  { key: "followers", label: "팔로워", color: "var(--series-1)" },
  { key: "following", label: "팔로잉", color: "var(--series-2)" },
] as const;

function niceTicks(min: number, max: number, count = 4) {
  if (min === max) {
    min = Math.max(0, min - 5);
    max = max + 5;
  }
  const raw = (max - min) / count;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw) ?? raw;
  const lo = Math.floor(min / step) * step;
  const hi = Math.ceil(max / step) * step;
  const ticks = [];
  for (let v = lo; v <= hi + step / 2; v += step) ticks.push(Math.round(v));
  return ticks;
}

const dayNumber = (d: string) => Date.parse(`${d}T00:00:00Z`) / 86400_000;

function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    if (!ref.current) return;
    const ro = new ResizeObserver(([e]) => setWidth(e.contentRect.width));
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, []);
  return [ref, width] as const;
}

export function TrendChart({ data, selectedId }: { data: SnapshotSummary[]; selectedId: number }) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);

  const values = data.flatMap((d) => [d.followers, d.following]);
  const ticks = niceTicks(Math.min(...values), Math.max(...values));
  const yMin = ticks[0];
  const yMax = ticks.at(-1)!;
  const x0 = dayNumber(data[0].date);
  const x1 = dayNumber(data.at(-1)!.date);
  const innerW = Math.max(0, width - PAD.left - PAD.right);
  const innerH = H - PAD.top - PAD.bottom;
  const x = (d: string) => PAD.left + (x1 === x0 ? innerW / 2 : ((dayNumber(d) - x0) / (x1 - x0)) * innerW);
  const y = (v: number) => PAD.top + innerH - ((v - yMin) / (yMax - yMin || 1)) * innerH;

  const active = hover ?? null;
  const last = data.at(-1)!;

  function onMove(e: React.PointerEvent<SVGRectElement>) {
    const box = e.currentTarget.getBoundingClientRect();
    const px = e.clientX - box.left + PAD.left;
    let best = 0;
    data.forEach((d, i) => {
      if (Math.abs(x(d.date) - px) < Math.abs(x(data[best].date) - px)) best = i;
    });
    setHover(best);
  }

  // 날짜 라벨은 겹치지 않을 만큼만
  const maxLabels = Math.max(2, Math.floor(innerW / 80));
  const every = Math.ceil(data.length / maxLabels);

  return (
    <div>
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-[13px] text-muted" aria-hidden>
        {SERIES.map((s) => (
          <span key={s.key} className="inline-flex items-center gap-1.5">
            <span className="h-0.5 w-4 rounded" style={{ background: s.color }} />
            {s.label}
          </span>
        ))}
      </div>
      <div ref={ref} className="relative mt-3">
        {width > 0 && (
          <svg width={width} height={H} role="img" aria-label="날짜별 팔로워·팔로잉 수 추이">
            {ticks.map((t) => (
              <g key={t}>
                <line x1={PAD.left} x2={width - PAD.right} y1={y(t)} y2={y(t)} stroke="var(--border)" />
                <text x={PAD.left - 8} y={y(t)} dy="0.32em" textAnchor="end" fontSize={11} fill="var(--faint)">
                  {num(t)}
                </text>
              </g>
            ))}
            {data.map((d, i) =>
              i % every === 0 || i === data.length - 1 ? (
                <text
                  key={d.id}
                  x={x(d.date)}
                  y={H - 8}
                  textAnchor={i === 0 && data.length > 1 ? "start" : i === data.length - 1 && data.length > 1 ? "end" : "middle"}
                  fontSize={11}
                  fill="var(--faint)"
                >
                  {d.date.slice(2).replaceAll("-", ".")}
                </text>
              ) : null,
            )}

            {active !== null && (
              <line
                x1={x(data[active].date)}
                x2={x(data[active].date)}
                y1={PAD.top}
                y2={PAD.top + innerH}
                stroke="var(--faint)"
                strokeDasharray="3 3"
              />
            )}

            {SERIES.map((s) => (
              <g key={s.key}>
                <polyline
                  fill="none"
                  stroke={s.color}
                  strokeWidth={2}
                  strokeLinejoin="round"
                  strokeLinecap="round"
                  points={data.map((d) => `${x(d.date)},${y(d[s.key])}`).join(" ")}
                />
                {data.map((d, i) => (
                  <circle
                    key={d.id}
                    cx={x(d.date)}
                    cy={y(d[s.key])}
                    r={active === i || d.id === selectedId ? 4.5 : 3}
                    fill={s.color}
                    stroke="var(--surface)"
                    strokeWidth={2}
                  />
                ))}
                <text
                  x={width - PAD.right + 8}
                  y={y(last[s.key])}
                  dy="0.32em"
                  fontSize={12}
                  fontWeight={600}
                  fill="var(--text)"
                >
                  {num(last[s.key])}
                </text>
              </g>
            ))}

            <rect
              x={PAD.left}
              y={PAD.top}
              width={innerW}
              height={innerH}
              fill="transparent"
              onPointerMove={onMove}
              onPointerLeave={() => setHover(null)}
            />
          </svg>
        )}

        {active !== null && (
          <div
            className="pointer-events-none absolute top-0 z-10 rounded-lg border border-line bg-surface px-3 py-2 text-[12px] shadow-lg"
            style={{
              left: Math.min(Math.max(x(data[active].date) - 70, 0), Math.max(0, width - 150)),
            }}
          >
            <p className="font-semibold">{dotDate(data[active].date)}</p>
            {SERIES.map((s) => (
              <p key={s.key} className="tabular mt-0.5 flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full" style={{ background: s.color }} />
                {s.label} <b className="ml-auto pl-3">{num(data[active][s.key])}</b>
              </p>
            ))}
            <p className="tabular mt-0.5 text-muted">
              맞팔 안 함 <b className="text-ink">{num(data[active].notFollowingBack)}</b>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
