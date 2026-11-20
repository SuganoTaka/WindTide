"use client";

import TideChart from "./TideChart";
import WeatherIcon, { weatherLabel } from "./WeatherIcon";
import { tideNameHint, jstNowLocal } from "@/lib/tide";
import { windArrowDeg, windDir16, windLevel, windTone } from "@/lib/wind";
import type { WeatherResponse } from "@/lib/types";

interface Props {
  data: WeatherResponse | null;
  loading: boolean;
  error: string | null;
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <>
      <span className="text-ink-3">{label}</span>
      <span className="text-right">{children}</span>
    </>
  );
}

function toneClass(tone: "calm" | "ok" | "warn" | "bad") {
  if (tone === "calm") return "text-teal";
  if (tone === "ok") return "text-ink";
  if (tone === "warn") return "text-gold";
  return "text-signal";
}

function WindArrow({ deg, className }: { deg: number; className?: string }) {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 12 12"
      style={{ transform: `rotate(${windArrowDeg(deg)}deg)` }}
      className={className}
      aria-hidden="true"
    >
      <path d="M6 1.2v9.6M6 1.2L3.4 4M6 1.2L8.6 4" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}

export default function WeatherSection({ data, loading, error }: Props) {
  if (loading) {
    return (
      <section aria-labelledby="weather-heading">
        <h3 id="weather-heading" className="eyebrow">潮と天気</h3>
        <div className="mt-3 h-[120px] border border-rule bg-paper-2/60 animate-pulse" />
        <p className="mt-2 text-[11px] text-ink-3">気象・潮位を取得しています…</p>
      </section>
    );
  }

  if (error || !data) {
    return (
      <section aria-labelledby="weather-heading">
        <h3 id="weather-heading" className="eyebrow">潮と天気</h3>
        <div className="mt-2 border border-signal/40 bg-signal/5 p-3 text-[11.5px] text-ink">
          <p className="font-semibold text-signal">気象データを取得できませんでした</p>
          <p className="mt-1 text-ink-2">{error ?? "時間をおいて再度お試しください。"}</p>
        </div>
      </section>
    );
  }

  const nowLocal = jstNowLocal();
  const { tide, current, daily } = data;
  const extremeRow = tide.extremes.filter((e) => e.t.slice(0, 10) >= nowLocal.slice(0, 10)).slice(0, 4);

  return (
    <section aria-labelledby="weather-heading">
      <div className="flex items-baseline justify-between">
        <h3 id="weather-heading" className="eyebrow">潮と天気</h3>
        <span className="text-[10px] text-ink-3">Open-Meteo / 気象庁モデル</span>
      </div>

      {data.tideAvailable ? (
        <>
          <div className="mt-2 flex items-center gap-2 flex-wrap">
            <span className="px-1.5 py-0.5 bg-ink text-paper-2 text-[11px] font-semibold rounded-[1px]">
              {tide.tideName}
            </span>
            <span className="text-[11px] text-ink-2">
              {tide.moonPhase}・月齢 <span className="num">{tide.moonAge.toFixed(1)}</span>
            </span>
            <span className="ml-auto text-[10px] text-ink-3">
              潮位差 <span className="num">{(tide.todayRange ?? 0).toFixed(2)}m</span>
            </span>
          </div>
          <p className="mt-1 text-[10.5px] text-ink-3">{tideNameHint(tide.tideName)}</p>

          <div className="mt-2 border border-rule bg-paper-2/70 px-2 pt-1 pb-0.5">
            <TideChart points={tide.points} extremes={tide.extremes} nowLocal={nowLocal} />
          </div>

          {extremeRow.length > 0 && (
            <div className="mt-2 grid grid-cols-4 gap-px bg-rule border border-rule">
              {extremeRow.map((e, i) => (
                <div key={i} className="bg-paper-2 px-1.5 py-1.5 text-center">
                  <div className={`text-[9px] ${e.type === "high" ? "text-gold" : "text-ink-3"}`}>
                    {e.type === "high" ? "満潮" : "干潮"}
                  </div>
                  <div className="num text-[12px] leading-tight">{e.t.slice(11, 16)}</div>
                  <div className="num text-[9px] text-ink-3">{e.h.toFixed(2)}m</div>
                </div>
              ))}
            </div>
          )}
        </>
      ) : (
        <div className="mt-2 border border-dashed border-rule p-3 text-[11.5px] text-ink-2">
          この地点の潮位推算データがありません（外洋モデルの対象外）。天気・風は下記のとおりです。
        </div>
      )}

      <div className="mt-4 flex items-center gap-2">
        <span className="text-[10px] font-semibold tracking-wider text-ink-2">現在のコンディション</span>
        <span className="flex-1 h-px bg-rule" />
        <span className="text-[9px] text-ink-3 num">{nowLocal.slice(11, 16)} JST</span>
      </div>

      <div className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-2 items-center">
        <div className="flex items-center gap-2">
          <WeatherIcon code={current.code} size={34} className="text-teal" />
          <div>
            <div className="num text-[26px] leading-none">
              {current.temp != null ? Math.round(current.temp) : "—"}
              <span className="text-[12px] align-top">°C</span>
            </div>
            <div className="text-[10px] text-ink-2 mt-0.5">{weatherLabel(current.code)}</div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-[11px]">
          <Row label="風">
            <span className={`inline-flex items-center gap-1 ${toneClass(windTone(current.wind))}`}>
              <WindArrow deg={current.windDir ?? 0} />
              <span>{windDir16(current.windDir)}</span>
              <span className="num">{current.wind?.toFixed(1) ?? "—"}m/s</span>
            </span>
          </Row>
          <Row label="波">
            <span className="num">{current.wave != null ? `${current.wave.toFixed(1)}m` : "—"}</span>
          </Row>
          <Row label="突風">
            <span className={`num ${toneClass(windTone(current.gust))}`}>
              {current.gust?.toFixed(1) ?? "—"}m/s
            </span>
          </Row>
          <Row label="水温">
            <span className="num">{current.seaTemp != null ? `${current.seaTemp.toFixed(1)}℃` : "—"}</span>
          </Row>
          <Row label="気圧">
            <span className="num">{current.pressure != null ? `${Math.round(current.pressure)}hPa` : "—"}</span>
          </Row>
          <Row label="湿度">
            <span className="num">{current.humidity != null ? `${Math.round(current.humidity)}%` : "—"}</span>
          </Row>
        </div>
      </div>
      <p className="mt-1.5 text-[10px] text-ink-3">
        風は「風が吹いてくる向き」。{windLevel(current.wind)}（{current.wind?.toFixed(1) ?? "—"}m/s）
      </p>

      <div className="mt-4 flex items-center gap-2">
        <span className="text-[10px] font-semibold tracking-wider text-ink-2">週間</span>
        <span className="flex-1 h-px bg-rule" />
      </div>

      <div className="mt-1.5 grid grid-cols-[46px_24px_1fr_auto] gap-2 text-[9px] text-ink-3">
        <span>日付</span>
        <span>天気</span>
        <span>風 m/s ・ 波 ・ 降水</span>
        <span className="text-right">最高 / 最低</span>
      </div>
      <ul className="divide-y divide-rule/70">
        {daily.slice(0, 7).map((d, idx) => {
          const dt = new Date(`${d.date}T00:00:00Z`);
          const wd = ["日", "月", "火", "水", "木", "金", "土"][dt.getUTCDay()];
          return (
            <li key={d.date} className="py-1.5 grid grid-cols-[46px_24px_1fr_auto] items-center gap-2 text-[11px]">
              <span className="num text-ink-2">
                {dt.getUTCMonth() + 1}/{dt.getUTCDate()}
                <span className={`ml-0.5 text-[9px] ${wd === "日" ? "text-signal" : wd === "土" ? "text-teal" : "text-ink-3"}`}>
                  {wd}
                </span>
                {idx === 0 && <span className="ml-1 text-[9px] text-ink-3">今日</span>}
              </span>
              <WeatherIcon code={d.code} size={18} className="text-ink-2" />
              <span className="flex items-center gap-1.5 min-w-0">
                <span className={`num ${toneClass(windTone(d.windMax))}`}>
                  <WindArrow deg={d.windDir ?? 0} className="inline" /> {d.windMax?.toFixed(0) ?? "—"}
                </span>
                <span className="text-ink-3 text-[10px] truncate">
                  {d.waveMax != null ? `波${d.waveMax.toFixed(1)}m` : ""}
                </span>
                <span className="text-ink-3 text-[10px]">
                  {d.precipProb != null ? `${d.precipProb}%` : ""}
                </span>
              </span>
              <span className="num text-right">
                <span className="text-signal">{d.tempMax != null ? Math.round(d.tempMax) : "—"}</span>
                <span className="text-ink-3"> / </span>
                <span className="text-teal">{d.tempMin != null ? Math.round(d.tempMin) : "—"}</span>
              </span>
            </li>
          );
        })}
      </ul>
      {daily[0]?.sunrise && (
        <p className="mt-1.5 text-[10px] text-ink-3">
          日の出 <span className="num">{daily[0].sunrise.slice(11, 16)}</span> ／ 日の入り{" "}
          <span className="num">{daily[0].sunset?.slice(11, 16) ?? "—"}</span>
          {daily[0].waveMax != null && (
            <>
              {" "}／ 最大波 <span className="num">{daily[0].waveMax.toFixed(1)}m</span>
            </>
          )}
        </p>
      )}
    </section>
  );
}
