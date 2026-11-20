"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import FishSection from "./FishSection";
import WeatherSection from "./WeatherSection";
import RouteSection from "./RouteSection";
import { formatCoord, formatKm, haversineKm } from "@/lib/geo";
import { fetchRouteDirect, fetchWeatherDirect } from "@/lib/openmeteo-client";
import { formatDate, meters, portTitle, portTypeLabel } from "@/lib/port";
import { regionName, seasonMatches } from "@/lib/fish";
import type { FishDataset, LatLon, Port, RouteResponse, WeatherResponse } from "@/lib/types";

interface Props {
  port: Port;
  fish: FishDataset | null;
  me: LatLon | null;
  month: number;
  currentMonth: number;
  onMonthChange: (m: number) => void;
  onResetMonth: () => void;
  onClose: () => void;
  onRouteGeometry: (geo: [number, number][] | null) => void;
  locating: boolean;
  locationError: string | null;
  onRequestLocation: () => void;
}

export default function PortDetail({
  port,
  fish,
  me,
  month,
  currentMonth,
  onMonthChange,
  onResetMonth,
  onClose,
  onRouteGeometry,
  locating,
  locationError,
  onRequestLocation,
}: Props) {
  const [weather, setWeather] = useState<WeatherResponse | null>(null);
  const [weatherLoading, setWeatherLoading] = useState(false);
  const [weatherError, setWeatherError] = useState<string | null>(null);
  const [route, setRoute] = useState<RouteResponse | null>(null);
  const [routeLoading, setRouteLoading] = useState(false);
  const [showRoute, setShowRoute] = useState(false);
  const [routeNonce, setRouteNonce] = useState(0);
  const abortRef = useRef<AbortController | null>(null);

  const straightKm = useMemo(() => (me ? haversineKm(me, { lat: port.la, lon: port.lo }) : null), [me, port.la, port.lo]);
  const matches = useMemo(() => seasonMatches(fish, port.r, month), [fish, port.r, month]);

  useEffect(() => {
    setWeather(null);
    setWeatherError(null);
    setWeatherLoading(true);
    setRoute(null);
    setShowRoute(false);
    const ctrl = new AbortController();
    abortRef.current?.abort();
    abortRef.current = ctrl;

    const load = async () => {
      try {
        const r = await fetch(`/api/weather?lat=${port.la}&lon=${port.lo}`, {
          signal: ctrl.signal,
        });
        if (r.ok) {
          const json = (await r.json()) as WeatherResponse;
          if (!ctrl.signal.aborted) {
            setWeather(json);
            setWeatherLoading(false);
          }
          return;
        }
        // サーバーが外向き通信できない環境ではブラウザから直接取得する
        const direct = await fetchWeatherDirect(port.la, port.lo);
        if (!ctrl.signal.aborted) {
          setWeather(direct);
          setWeatherLoading(false);
        }
      } catch (err) {
        if (ctrl.signal.aborted) return;
        try {
          const direct = await fetchWeatherDirect(port.la, port.lo);
          if (!ctrl.signal.aborted) {
            setWeather(direct);
            setWeatherLoading(false);
          }
        } catch (err2) {
          if (ctrl.signal.aborted) return;
          setWeatherError(String((err2 as Error)?.message ?? err));
          setWeatherLoading(false);
        }
      }
    };
    load();

    return () => ctrl.abort();
  }, [port.la, port.lo, port.i]);

  useEffect(() => {
    if (!me) {
      setRoute(null);
      return;
    }
    const ctrl = new AbortController();
    setRouteLoading(true);
    const from = `${me.lat},${me.lon}`;
    const to = `${port.la},${port.lo}`;
    const toPt = { lat: port.la, lon: port.lo };
    const loadRoute = async () => {
      try {
        const r = await fetch(`/api/route?from=${from}&to=${to}`, { signal: ctrl.signal });
        if (r.ok) {
          const json = (await r.json()) as RouteResponse;
          if (!ctrl.signal.aborted) {
            setRoute(json);
            setRouteLoading(false);
          }
          return;
        }
        const direct = await fetchRouteDirect(me, toPt);
        if (!ctrl.signal.aborted) {
          setRoute(direct);
          setRouteLoading(false);
        }
      } catch {
        const direct = await fetchRouteDirect(me, toPt).catch(() => null);
        if (!ctrl.signal.aborted) {
          setRoute(direct);
          setRouteLoading(false);
        }
      }
    };
    loadRoute();
    return () => ctrl.abort();
  }, [me, port.la, port.lo, port.i, routeNonce]);

  const emitGeometry = useCallback(() => {
    if (showRoute && route?.geometry?.length) onRouteGeometry(route.geometry);
    else onRouteGeometry(null);
  }, [showRoute, route, onRouteGeometry]);

  useEffect(() => {
    emitGeometry();
  }, [emitGeometry]);

  useEffect(() => {
    return () => onRouteGeometry(null);
  }, [onRouteGeometry]);

  const distance = route?.distanceKm ?? straightKm;

  return (
    <div className="h-full flex flex-col bg-paper-2">
      <header className="shrink-0 border-b border-ink/15 bg-paper-2 px-4 pt-3 pb-3">
        <div className="flex items-start gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span
                className={[
                  "text-[9.5px] tracking-wider px-1 py-[1px] rounded-[1px] font-semibold",
                  port.k === "f" ? "bg-teal text-paper-2" : "bg-gold text-paper-2",
                ].join(" ")}
              >
                {portTypeLabel(port)}
              </span>
              <span className="text-[10px] text-ink-3">
                {port.p}
                {port.a && port.a !== port.p ? ` ${port.a}` : ""}
              </span>
            </div>
            <h2 className="mt-1 font-display text-[24px] leading-tight tracking-tight break-words">
              {portTitle(port)}
            </h2>
            <div className="mt-1 flex items-center gap-2 flex-wrap text-[10px] text-ink-3">
              <span className="num">{formatCoord(port.la, port.lo)}</span>
              {distance != null && (
                <>
                  <span>·</span>
                  <span className="num text-ink-2">
                    {me ? `${route ? "車 " : "直線 "}${formatKm(distance)}` : formatKm(distance)}
                  </span>
                </>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="閉じる"
            className="shrink-0 -mr-1 -mt-1 p-1.5 text-ink-3 hover:text-ink transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
              <path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto scroll-thin px-4 py-3 space-y-5">
        <FishSection
          matches={matches}
          month={month}
          currentMonth={currentMonth}
          regionLabel={regionName(fish, port.r)}
          onMonthChange={onMonthChange}
          onResetMonth={onResetMonth}
        />

        <WeatherSection data={weather} loading={weatherLoading} error={weatherError} />

        <RouteSection
          port={port}
          me={me}
          straightKm={straightKm}
          route={route}
          loading={routeLoading}
          showRoute={showRoute}
          onToggleRoute={() => setShowRoute((v) => !v)}
          onRetry={() => setRouteNonce((n) => n + 1)}
          onRequestLocation={onRequestLocation}
          locating={locating}
          locationError={locationError}
        />

        <section aria-labelledby="facility-heading">
          <div className="flex items-center gap-2">
            <h3 id="facility-heading" className="eyebrow">
              施設情報
            </h3>
            <span className="flex-1 h-px bg-rule" />
          </div>
          <dl className="mt-2 grid grid-cols-[88px_1fr] gap-x-3 gap-y-1.5 text-[11.5px]">
            <dt className="text-ink-3">{port.k === "f" ? "漁港コード" : "港湾コード"}</dt>
            <dd className="num">{port.code || "—"}</dd>
            <dt className="text-ink-3">管理者</dt>
            <dd>{port.a || "—"}</dd>
            {port.k === "f" ? (
              <>
                <dt className="text-ink-3">指定年月日</dt>
                <dd className="num">{formatDate(port.d)}</dd>
                <dt className="text-ink-3">外郭施設</dt>
                <dd className="num">{meters(port.ol)}</dd>
                <dt className="text-ink-3">係留施設</dt>
                <dd className="num">{meters(port.ml)}</dd>
              </>
            ) : (
              <>
                <dt className="text-ink-3">外郭施設</dt>
                <dd className="num">{meters(port.ol)}</dd>
                <dt className="text-ink-3">係留施設</dt>
                <dd className="num">{meters(port.ml)}</dd>
                <dt className="text-ink-3">定期航路</dt>
                <dd>{port.fy ? "あり" : "なし"}</dd>
              </>
            )}
            <dt className="text-ink-3">出典</dt>
            <dd className="text-[10px] text-ink-3 leading-relaxed">
              国土数値情報（{port.k === "f" ? "漁港 C09-06" : "港湾 C02-14"}）国土交通省
            </dd>
          </dl>
        </section>

        <footer className="pb-6 pt-1 text-[10px] leading-relaxed text-ink-3 border-t border-rule/70">
          天気・風・波: Open-Meteo（気象モデル）／潮位: Open-Meteo Marine の潮位推算。
          現地の海況・立入禁止区域・漁業関係者の指示を必ず確認してください。
        </footer>
      </div>
    </div>
  );
}
