"use client";

import { useMemo, useState } from "react";
import StarRating from "./StarRating";
import { MONTH_LABEL, groupMatches } from "@/lib/fish";
import type { SeasonMatch } from "@/lib/types";

interface Props {
  matches: SeasonMatch[];
  month: number;
  currentMonth: number;
  regionLabel: string;
  onMonthChange: (m: number) => void;
  onResetMonth: () => void;
}

function SpeciesRow({ match }: { match: SeasonMatch }) {
  const [open, setOpen] = useState(false);
  const s = match.species;
  return (
    <li className="border-b border-rule/70 last:border-b-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="w-full text-left px-1 py-2.5 flex items-start gap-2.5 hover:bg-paper/70 transition-colors"
      >
        <span className="flex-1 min-w-0">
          <span className="flex items-baseline gap-1.5 flex-wrap">
            <span className="font-display text-[15px] leading-tight">{s.name}</span>
            {match.isPeak && match.rating >= 4 && (
              <span className="text-[9px] tracking-wider px-1 py-[1px] bg-signal text-paper-2 rounded-[1px] font-semibold">
                最盛期
              </span>
            )}
            {s.aliases.length > 0 && (
              <span className="text-[10px] text-ink-3 truncate">
                {s.aliases.join("・")}
              </span>
            )}
          </span>
          <span className="mt-1 flex items-center gap-1.5 text-[11px] text-ink-2 min-w-0">
            <StarRating rating={match.rating} />
            <span className="text-ink-3 num shrink-0">{s.size}</span>
            <span className="text-ink-3 truncate">
              {s.methods.slice(0, 2).join("・")}
            </span>
          </span>
        </span>
        <span
          className={`mt-1 text-ink-3 transition-transform ${open ? "rotate-90" : ""}`}
          aria-hidden="true"
        >
          <svg width="12" height="12" viewBox="0 0 12 12">
            <path d="M4 2l4 4-4 4" fill="none" stroke="currentColor" strokeWidth="1.4" />
          </svg>
        </span>
      </button>

      {open && (
        <div className="anim-rise pb-3 pl-1 pr-2 space-y-2 text-[11.5px] leading-relaxed">
          <div className="grid grid-cols-[52px_1fr] gap-x-2 gap-y-1">
            <span className="text-ink-3">釣り方</span>
            <span>{s.methods.join(" / ")}</span>
            <span className="text-ink-3">エサ</span>
            <span>{s.baits.join(" / ")}</span>
            <span className="text-ink-3">仕掛け</span>
            <span className="text-ink-2">{s.tackle}</span>
          </div>
          <p className="text-ink-2 border-l-2 border-shoal pl-2">{s.tip}</p>
          {s.caution && (
            <p className="text-signal border-l-2 border-signal/50 pl-2">注意: {s.caution}</p>
          )}
        </div>
      )}
    </li>
  );
}

export default function FishSection({
  matches,
  month,
  currentMonth,
  regionLabel,
  onMonthChange,
  onResetMonth,
}: Props) {
  const grouped = useMemo(() => groupMatches(matches), [matches]);
  const peakCount = matches.filter((m) => m.isPeak).length;

  return (
    <section aria-labelledby="fish-heading">
      <div className="flex items-baseline justify-between gap-2">
        <h3 id="fish-heading" className="eyebrow">
          港内・堤防で釣れる魚
        </h3>
        <span className="text-[10px] text-ink-3">{regionLabel}の目安</span>
      </div>

      <div className="mt-2 flex items-baseline gap-2">
        <span className="font-display text-[22px] leading-none num">{MONTH_LABEL[month - 1]}</span>
        <span className="text-[11px] text-ink-2">
          {matches.length}種
          {peakCount > 0 && <span className="text-signal"> / 最盛期 {peakCount}種</span>}
        </span>
        {month !== currentMonth && (
          <button
            type="button"
            onClick={onResetMonth}
            className="ml-auto text-[10px] px-1.5 py-0.5 border border-rule rounded-[2px] text-ink-2 hover:border-teal hover:text-teal"
          >
            今月に戻す
          </button>
        )}
      </div>

      <div className="mt-2 grid grid-cols-12 gap-[3px]" role="tablist" aria-label="月を選ぶ">
        {MONTH_LABEL.map((label, i) => {
          const m = i + 1;
          const active = m === month;
          const isNow = m === currentMonth;
          return (
            <button
              key={m}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => onMonthChange(m)}
              className={[
                "h-6 text-[10px] num border transition-colors",
                active
                  ? "bg-ink text-paper-2 border-ink"
                  : isNow
                    ? "border-teal text-teal bg-paper-2"
                    : "border-rule text-ink-2 hover:border-ink-2 bg-paper-2/60",
              ].join(" ")}
              title={`${label}${isNow ? "（今月）" : ""}`}
            >
              {m}
            </button>
          );
        })}
      </div>

      {matches.length === 0 ? (
        <div className="mt-4 border border-dashed border-rule p-3 text-[11.5px] text-ink-2">
          この月に港内で狙える魚のデータがありません。月を変えてみてください。
        </div>
      ) : (
        <div className="mt-3 space-y-4">
          {grouped.map(([group, items]) => (
            <div key={group}>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-semibold tracking-wider text-ink-2">{group}</span>
                <span className="flex-1 h-px bg-rule" />
                <span className="text-[10px] text-ink-3 num">{items.length}</span>
              </div>
              <ul className="mt-0.5">
                {items.map((m) => (
                  <SpeciesRow key={m.species.id} match={m} />
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}

      <p className="mt-3 text-[10px] leading-relaxed text-ink-3">
        ※ 船釣りは対象外。季節は地域ごとの目安で、実際の釣果は年・水温・潮によって変わります。
        魚データは <code className="font-mono">public/data/fish-species.json</code> で編集できます。
      </p>
    </section>
  );
}
