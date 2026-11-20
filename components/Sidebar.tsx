"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { formatKm, haversineKm } from "@/lib/geo";
import { portTitle } from "@/lib/port";
import type { LatLon, Port } from "@/lib/types";

export type KindFilter = "all" | "f" | "h";

interface Props {
  ports: Port[];
  total: number;
  loading: boolean;
  query: string;
  onQuery: (v: string) => void;
  kind: KindFilter;
  onKind: (v: KindFilter) => void;
  pref: string;
  onPref: (v: string) => void;
  typeCode: string;
  onTypeCode: (v: string) => void;
  prefectures: { code: string; name: string }[];
  typeOptions: { code: string; label: string }[];
  byDistance: boolean;
  onToggleDistance: () => void;
  me: LatLon | null;
  onLocate: () => void;
  locating: boolean;
  selectedId: string | null;
  onSelect: (p: Port) => void;
  onClose?: () => void;
}

const PAGE = 70;

export default function Sidebar({
  ports,
  total,
  loading,
  query,
  onQuery,
  kind,
  onKind,
  pref,
  onPref,
  typeCode,
  onTypeCode,
  prefectures,
  typeOptions,
  byDistance,
  onToggleDistance,
  me,
  onLocate,
  locating,
  selectedId,
  onSelect,
  onClose,
}: Props) {
  const [limit, setLimit] = useState(PAGE);
  const listRef = useRef<HTMLUListElement | null>(null);

  useEffect(() => {
    setLimit(PAGE);
    listRef.current?.scrollTo({ top: 0 });
  }, [query, kind, pref, typeCode, byDistance]);

  const shown = useMemo(() => ports.slice(0, limit), [ports, limit]);

  const onScroll = () => {
    const el = listRef.current;
    if (!el) return;
    if (el.scrollTop + el.clientHeight > el.scrollHeight - 400 && limit < ports.length) {
      setLimit((v) => v + PAGE);
    }
  };

  return (
    <div className="h-full flex flex-col bg-paper-2 border-r border-ink/10">
      <div className="shrink-0 px-4 pt-3 pb-2.5 border-b border-rule space-y-2.5">
        <div className="relative">
          <svg
            className="absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-3"
            width="13"
            height="13"
            viewBox="0 0 16 16"
            aria-hidden="true"
          >
            <circle cx="7" cy="7" r="4.6" fill="none" stroke="currentColor" strokeWidth="1.4" />
            <path d="M10.4 10.4L14 14" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
          </svg>
          <input
            type="search"
            value={query}
            onChange={(e) => onQuery(e.target.value)}
            placeholder="港名・都道府県で検索"
            className="w-full pl-8 pr-8 py-2 bg-paper border border-rule rounded-[2px] text-[12.5px] placeholder:text-ink-3/80 focus:border-teal focus:outline-none"
            aria-label="港を検索"
          />
          {query && (
            <button
              type="button"
              onClick={() => onQuery("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-ink-3 hover:text-ink"
              aria-label="検索語を消す"
            >
              <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
                <path d="M2 2l8 8M10 2l-8 8" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
              </svg>
            </button>
          )}
        </div>

        <div className="flex border border-rule rounded-[2px] overflow-hidden" role="group" aria-label="施設の種類">
          {(
            [
              ["all", "すべて"],
              ["f", "漁港"],
              ["h", "港湾"],
            ] as [KindFilter, string][]
          ).map(([v, label]) => (
            <button
              key={v}
              type="button"
              onClick={() => onKind(v)}
              aria-pressed={kind === v}
              className={[
                "flex-1 py-1.5 text-[11.5px] transition-colors",
                kind === v ? "bg-ink text-paper-2" : "text-ink-2 hover:bg-paper",
              ].join(" ")}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-1.5">
          <select
            value={pref}
            onChange={(e) => onPref(e.target.value)}
            className="w-full py-1.5 px-1.5 bg-paper border border-rule rounded-[2px] text-[11.5px]"
            aria-label="都道府県"
          >
            <option value="">全国</option>
            {prefectures.map((p) => (
              <option key={p.code} value={p.code}>
                {p.name}
              </option>
            ))}
          </select>
          <select
            value={typeCode}
            onChange={(e) => onTypeCode(e.target.value)}
            className="w-full py-1.5 px-1.5 bg-paper border border-rule rounded-[2px] text-[11.5px]"
            aria-label="種別"
          >
            <option value="">種別すべて</option>
            {typeOptions.map((t) => (
              <option key={t.code} value={t.code}>
                {t.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2 text-[10.5px]">
          <span className="text-ink-3">
            <span className="num text-ink text-[12px]">{ports.length.toLocaleString("ja-JP")}</span>
            <span className="mx-1">/</span>
            <span className="num">{total.toLocaleString("ja-JP")}</span> 件
          </span>
          <span className="ml-auto flex items-center gap-1">
            <button
              type="button"
              onClick={onToggleDistance}
              disabled={!me}
              className={[
                "px-1.5 py-0.5 border rounded-[2px] transition-colors",
                byDistance
                  ? "border-teal text-teal bg-teal/5"
                  : "border-rule text-ink-2 hover:border-ink-2",
                !me ? "opacity-45 cursor-not-allowed" : "",
              ].join(" ")}
              title={me ? "現在地から近い順" : "現在地を取得すると使えます"}
            >
              近い順
            </button>
            <button
              type="button"
              onClick={onLocate}
              disabled={locating}
              className="px-1.5 py-0.5 border border-rule rounded-[2px] text-ink-2 hover:border-ink-2 disabled:opacity-50"
            >
              {locating ? "取得中" : me ? "現在地更新" : "現在地"}
            </button>
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="px-1.5 py-0.5 border border-rule rounded-[2px] text-ink-2 lg:hidden"
              >
                閉じる
              </button>
            )}
          </span>
        </div>
      </div>

      <ul
        ref={listRef}
        onScroll={onScroll}
        className="flex-1 overflow-y-auto scroll-thin divide-y divide-rule/60"
      >
        {loading && (
          <li className="px-4 py-6 text-[11.5px] text-ink-3">港データを読み込んでいます…</li>
        )}
        {!loading && ports.length === 0 && (
          <li className="px-4 py-6 text-[11.5px] text-ink-2">
            条件に合う港がありません。検索語や絞り込みを変えてください。
          </li>
        )}
        {shown.map((p) => {
          const active = p.i === selectedId;
          const dist = me ? haversineKm(me, { lat: p.la, lon: p.lo }) : null;
          return (
            <li key={p.i}>
              <button
                type="button"
                onClick={() => onSelect(p)}
                aria-current={active}
                className={[
                  "w-full text-left pl-3 pr-3 py-2 border-l-2 transition-colors",
                  active
                    ? "border-signal bg-paper"
                    : "border-transparent hover:bg-paper/80",
                ].join(" ")}
              >
                <div className="flex items-start gap-2">
                  <span
                    className={[
                      "mt-1.5 shrink-0 w-[7px] h-[7px]",
                      p.k === "h" ? "bg-gold rounded-[1px]" : "bg-teal rounded-full",
                    ].join(" ")}
                    aria-hidden="true"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-baseline gap-1.5">
                      <span className="font-display text-[14px] leading-tight truncate">
                        {portTitle(p)}
                      </span>
                      <span className="shrink-0 text-[9px] text-ink-3">{p.t}</span>
                    </span>
                    <span className="mt-0.5 block text-[10px] text-ink-3 truncate">
                      {p.p}
                      {p.a && p.a !== p.p ? ` ${p.a}` : ""}
                    </span>
                  </span>
                  {dist != null && (
                    <span className="shrink-0 num text-[10px] text-ink-3 mt-1">
                      {formatKm(dist)}
                    </span>
                  )}
                </div>
              </button>
            </li>
          );
        })}
        {limit < ports.length && (
          <li className="px-4 py-3 text-[10.5px] text-ink-3">
            さらに {Math.min(PAGE, ports.length - limit)} 件を表示（残り {ports.length - limit} 件）
          </li>
        )}
      </ul>
    </div>
  );
}
