"use client";

import { useMemo } from "react";
import { dayLabel, hourLabel, localToMs } from "@/lib/tide";
import type { TideExtreme, TidePoint } from "@/lib/types";

interface Props {
  points: TidePoint[];
  extremes: TideExtreme[];
  nowLocal: string;
  height?: number;
}

const W = 448;
const H = 196;
const M = { top: 28, right: 12, bottom: 26, left: 38 };
const HOURS = 48;

export default function TideChart({ points, extremes, nowLocal }: Props) {
  const chart = useMemo(() => {
    const startMs = localToMs(`${nowLocal.slice(0, 10)}T00:00`);
    const endMs = startMs + HOURS * 3600000;
    const win = points
      .map((p) => ({ ...p, ms: localToMs(p.t) }))
      .filter((p) => p.ms >= startMs - 3600000 && p.ms <= endMs + 3600000);
    if (win.length < 4) return null;

    const values = win.map((p) => p.h);
    let min = Math.min(...values);
    let max = Math.max(...values);
    const pad = Math.max(0.08, (max - min) * 0.16);
    min -= pad;
    max += pad;

    const plotW = W - M.left - M.right;
    const plotH = H - M.top - M.bottom;
    const x = (ms: number) => M.left + ((ms - startMs) / (endMs - startMs)) * plotW;
    const y = (h: number) => M.top + (1 - (h - min) / (max - min)) * plotH;

    const line = win.map((p) => `${x(p.ms).toFixed(1)},${y(p.h).toFixed(1)}`).join(" ");
    const area = `${M.left},${M.top + plotH} ${line} ${M.left + plotW},${M.top + plotH}`;

    const nowMs = localToMs(nowLocal);
    const nowX = nowMs >= startMs && nowMs <= endMs ? x(nowMs) : null;

    const marks = extremes
      .map((e) => ({ ...e, ms: localToMs(e.t) }))
      .filter((e) => e.ms >= startMs && e.ms <= endMs)
      .map((e) => ({ ...e, px: x(e.ms), py: y(e.h) }));

    const dayTicks: { x: number; label: string }[] = [];
    for (let d = 0; d <= 2; d++) {
      const ms = startMs + d * 86400000;
      if (ms > endMs) break;
      dayTicks.push({ x: x(ms), label: dayLabel(`${new Date(ms).toISOString().slice(0, 10)}T00:00`) });
    }

    const hourTicks: { x: number; label: string }[] = [];
    for (let h = 0; h <= HOURS; h += 6) {
      const ms = startMs + h * 3600000;
      hourTicks.push({ x: x(ms), label: `${String(new Date(ms).getUTCHours()).padStart(2, "0")}:00` });
    }

    return { line, area, min, max, plotH, plotW, nowX, marks, dayTicks, hourTicks, startMs, endMs, x, y };
  }, [points, extremes, nowLocal]);

  if (!chart) {
    return (
      <div className="h-[120px] flex items-center justify-center text-[12px] text-ink-3">
        潮位データが取得できませんでした
      </div>
    );
  }

  const { line, area, min, max, plotH, nowX, marks, dayTicks, hourTicks } = chart;

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="w-full h-auto"
      role="img"
      aria-label="48時間の潮位グラフ"
    >
      <defs>
        <linearGradient id="tideFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgb(var(--teal-2))" stopOpacity="0.34" />
          <stop offset="70%" stopColor="rgb(var(--teal-2))" stopOpacity="0.08" />
          <stop offset="100%" stopColor="rgb(var(--teal-2))" stopOpacity="0" />
        </linearGradient>
      </defs>

      {[0.25, 0.5, 0.75].map((r) => (
        <line
          key={r}
          x1={M.left}
          x2={W - M.right}
          y1={M.top + plotH * r}
          y2={M.top + plotH * r}
          stroke="rgb(var(--rule))"
          strokeWidth="0.8"
          strokeDasharray="1 4"
        />
      ))}

      {hourTicks.map((t, i) => (
        <line
          key={i}
          x1={t.x}
          x2={t.x}
          y1={M.top + plotH}
          y2={M.top + plotH + 4}
          stroke="rgb(var(--rule))"
          strokeWidth="0.8"
        />
      ))}

      {dayTicks.slice(1).map((t, i) => (
        <line
          key={i}
          x1={t.x}
          x2={t.x}
          y1={M.top - 6}
          y2={M.top + plotH}
          stroke="rgb(var(--rule))"
          strokeWidth="0.8"
          strokeDasharray="3 3"
        />
      ))}

      <polygon points={area} fill="url(#tideFill)" />
      <polyline
        points={line}
        fill="none"
        stroke="rgb(var(--teal))"
        strokeWidth="1.7"
        strokeLinejoin="round"
        strokeLinecap="round"
        className="tide-path"
      />

      {nowX != null && (
        <g>
          <line
            x1={nowX}
            x2={nowX}
            y1={M.top - 10}
            y2={M.top + plotH}
            stroke="rgb(var(--signal))"
            strokeWidth="1.1"
            strokeDasharray="4 3"
          />
          <rect
            x={nowX - 11}
            y={M.top - 22}
            width="22"
            height="13"
            fill="rgb(var(--signal))"
            rx="1.5"
          />
          <text
            x={nowX}
            y={M.top - 12.5}
            textAnchor="middle"
            fontSize="9"
            fill="rgb(var(--paper-2))"
            fontFamily="var(--font-mono)"
          >
            今
          </text>
        </g>
      )}

      {marks.map((m, i) => {
        const isHigh = m.type === "high";
        const label = isHigh ? "満" : "干";
        const ly = isHigh ? m.py - 9 : m.py + 15;
        const lx = Math.min(W - M.right - 18, Math.max(M.left + 18, m.px));
        return (
          <g key={`${m.t}-${i}`}>
            <circle cx={m.px} cy={m.py} r="2.6" fill="rgb(var(--paper-2))" stroke={isHigh ? "rgb(var(--gold))" : "rgb(var(--ink-3))"} strokeWidth="1.3" />
            <text
              x={lx}
              y={ly}
              textAnchor="middle"
              fontSize="9"
              fill={isHigh ? "rgb(var(--gold))" : "rgb(var(--ink-3))"}
              fontFamily="var(--font-mono)"
            >
              {label} {hourLabel(m.t)}
            </text>
          </g>
        );
      })}

      <text
        x={M.left - 4}
        y={M.top + 4}
        fontSize="9"
        textAnchor="end"
        fill="rgb(var(--ink-3))"
        fontFamily="var(--font-mono)"
      >
        {max.toFixed(2)}
      </text>
      <text
        x={M.left - 4}
        y={M.top + plotH + 3}
        fontSize="9"
        textAnchor="end"
        fill="rgb(var(--ink-3))"
        fontFamily="var(--font-mono)"
      >
        {min.toFixed(2)}
      </text>

      {dayTicks.map((t, i) => (
        <text
          key={i}
          x={t.x + 4}
          y={H - 8}
          fontSize="9"
          fill={i === 0 ? "rgb(var(--ink))" : "rgb(var(--ink-3))"}
          fontFamily="var(--font-body)"
        >
          {t.label}
        </text>
      ))}
      <text x={W - M.right} y={H - 8} fontSize="9" fill="rgb(var(--ink-3))" textAnchor="end" fontFamily="var(--font-mono)">
        m
      </text>
    </svg>
  );
}
