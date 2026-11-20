"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import MapView from "./MapView";
import Sidebar, { type KindFilter } from "./Sidebar";
import PortDetail from "./PortDetail";
import { haversineKm } from "@/lib/geo";
import { jstNowLocal } from "@/lib/tide";
import { MONTH_LABEL } from "@/lib/fish";
import type { FishDataset, LatLon, Port, PortDataset } from "@/lib/types";


const KIND_TYPE_CODES = {
  f: [
    { code: "1", label: "第1種" },
    { code: "2", label: "第2種" },
    { code: "3", label: "第3種" },
    { code: "4", label: "第4種" },
    { code: "5", label: "第5種" },
  ],
  h: [
    { code: "11", label: "国際戦略港湾" },
    { code: "12", label: "国際拠点港湾" },
    { code: "13", label: "重要港湾" },
    { code: "14", label: "地方港湾" },
    { code: "15", label: "その他港湾" },
  ],
};

function BrandMark() {
  return (
    <svg width="30" height="30" viewBox="0 0 30 30" aria-hidden="true" className="shrink-0">
      <circle cx="15" cy="15" r="13.4" fill="none" stroke="currentColor" strokeWidth="1.1" opacity="0.55" />
      <path
        d="M2.4 17.6c3.1 0 3.1-2.6 6.2-2.6s3.1 2.6 6.2 2.6 3.1-2.6 6.2-2.6 3.1 2.6 6.2 2.6"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path d="M15 6.6v4.2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      <circle cx="15" cy="13" r="1.7" fill="currentColor" />
    </svg>
  );
}

interface AppShellProps {
  googleApiKey?: string;
  googleMapId?: string;
}

export default function AppShell({ googleApiKey = "", googleMapId = "DEMO_MAP_ID" }: AppShellProps) {
  const [dataset, setDataset] = useState<PortDataset | null>(null);
  const [fish, setFish] = useState<FishDataset | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [query, setQuery] = useState("");
  const [kind, setKind] = useState<KindFilter>("all");
  const [pref, setPref] = useState("");
  const [typeCode, setTypeCode] = useState("");

  const [me, setMe] = useState<LatLon | null>(null);
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [byDistance, setByDistance] = useState(false);

  const [selected, setSelected] = useState<Port | null>(null);
  const [focusPort, setFocusPort] = useState<Port | null>(null);
  const [focusToken, setFocusToken] = useState(0);
  const [routeGeometry, setRouteGeometry] = useState<[number, number][] | null>(null);
  const [listOpen, setListOpen] = useState(false);

  const currentMonth = useMemo(() => Number(jstNowLocal().slice(5, 7)), []);
  const [month, setMonth] = useState(currentMonth);

  useEffect(() => {
    let alive = true;
    Promise.all([
      fetch("/data/ports.json").then(async (r) => {
        if (!r.ok) throw new Error(`港データの取得に失敗 (${r.status})`);
        return (await r.json()) as PortDataset;
      }),
      (async () => {
        // スプレッドシート運用なら /api/fish が正。未設定・失敗時は同梱JSONにフォールバック
        try {
          const r = await fetch("/api/fish");
          if (r.ok) return (await r.json()) as FishDataset;
        } catch {
          /* フォールバックへ */
        }
        try {
          const r = await fetch("/data/fish-species.json");
          if (r.ok) return (await r.json()) as FishDataset;
        } catch {
          /* 取得できなければ魚情報なしで動かす */
        }
        return null;
      })(),
    ])
      .then(([ports, fishData]) => {
        if (!alive) return;
        setDataset(ports);
        setFish(fishData);
        setLoading(false);

        const id = new URLSearchParams(window.location.search).get("p");
        if (id) {
          const hit = ports.ports.find((p) => p.i === id);
          if (hit) {
            setSelected(hit);
            setFocusPort(hit);
            setFocusToken(1);
          }
        }
      })
      .catch((err) => {
        if (!alive) return;
        setLoadError(String(err?.message ?? err));
        setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, []);

  const locate = useCallback(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setLocationError("このブラウザは位置情報に対応していません");
      return;
    }
    setLocating(true);
    setLocationError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setMe({ lat: pos.coords.latitude, lon: pos.coords.longitude });
        setLocating(false);
        setByDistance(true);
      },
      (err) => {
        setLocating(false);
        setLocationError(
          err.code === err.PERMISSION_DENIED
            ? "位置情報の利用が許可されていません。ブラウザの設定から許可してください。"
            : "現在地を取得できませんでした。電波状況を確認して再度お試しください。"
        );
      },
      { timeout: 12000, maximumAge: 60000 }
    );
  }, []);

  const selectPort = useCallback((p: Port) => {
    setSelected(p);
    setFocusPort(p);
    setFocusToken((n) => n + 1);
    setListOpen(false);
    try {
      window.history.replaceState(null, "", `${window.location.pathname}?p=${p.i}`);
    } catch {
      /* noop */
    }
  }, []);

  const closeDetail = useCallback(() => {
    setSelected(null);
    setRouteGeometry(null);
    try {
      window.history.replaceState(null, "", window.location.pathname);
    } catch {
      /* noop */
    }
  }, []);

  const ports = useMemo(() => dataset?.ports ?? [], [dataset]);

  const typeOptions = useMemo(() => {
    if (kind === "f") return KIND_TYPE_CODES.f;
    if (kind === "h") return KIND_TYPE_CODES.h;
    return [...KIND_TYPE_CODES.f, ...KIND_TYPE_CODES.h];
  }, [kind]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase().replace(/\s+/g, "");
    let list = ports;
    if (kind !== "all") list = list.filter((p) => p.k === kind);
    if (pref) list = list.filter((p) => p.pc === pref);
    if (typeCode) list = list.filter((p) => String(p.tc) === typeCode);
    if (q) {
      list = list.filter((p) => {
        const hay = `${p.n}${p.p}${p.a}${p.code}`.toLowerCase().replace(/\s+/g, "");
        return hay.includes(q);
      });
    }
    if (byDistance && me) {
      list = [...list].sort(
        (a, b) =>
          haversineKm(me, { lat: a.la, lon: a.lo }) - haversineKm(me, { lat: b.la, lon: b.lo })
      );
    }
    return list;
  }, [ports, query, kind, pref, typeCode, byDistance, me]);

  const onKind = (v: KindFilter) => {
    setKind(v);
    setTypeCode("");
  };

  return (
    <div className="h-dvh flex flex-col overflow-hidden bg-paper">
      <header className="shrink-0 h-[var(--header-h)] border-b border-ink/15 bg-paper-2/95 backdrop-blur-sm z-[950]">
        <div className="h-full px-3 sm:px-4 flex items-center gap-3">
          <div className="flex items-center gap-2 text-ink">
            <BrandMark />
            <div className="leading-none">
              <span className="font-display text-[17px] tracking-[0.02em]">潮見帖</span>
              <span className="ml-2 hidden sm:inline eyebrow align-middle">SHIOMI-CHO</span>
            </div>
          </div>

          <span className="hidden md:block h-6 w-px bg-rule mx-1" />

          <span className="hidden md:flex items-center gap-1.5 text-[10.5px] text-ink-3">
            <span className="inline-flex items-center gap-1">
              <span className="w-[7px] h-[7px] rounded-full bg-teal" /> 漁港
              <span className="num ml-0.5">{dataset?.counts.fishing.toLocaleString("ja-JP") ?? "—"}</span>
            </span>
            <span className="inline-flex items-center gap-1 ml-2">
              <span className="w-[7px] h-[7px] rounded-[1px] bg-gold" /> 港湾
              <span className="num ml-0.5">{dataset?.counts.harbor.toLocaleString("ja-JP") ?? "—"}</span>
            </span>
          </span>

          <div className="ml-auto flex items-center gap-2">
            <span className="hidden sm:inline-flex items-center gap-1 px-2 py-1 border border-rule text-[10.5px] text-ink-2">
              <span className="text-ink-3">今月</span>
              <span className="num">{MONTH_LABEL[currentMonth - 1]}</span>
            </span>
            <button
              type="button"
              onClick={locate}
              disabled={locating}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 border border-ink/30 text-[11.5px] hover:border-ink hover:bg-paper transition-colors disabled:opacity-50"
            >
              <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
                <circle cx="6" cy="6" r="2.2" fill="none" stroke="currentColor" strokeWidth="1.2" />
                <path d="M6 0.8v2M6 9.2v2M0.8 6h2M9.2 6h2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
              </svg>
              {locating ? "取得中…" : "現在地"}
            </button>
            <button
              type="button"
              onClick={() => setListOpen(true)}
              className="lg:hidden px-2.5 py-1.5 bg-ink text-paper-2 text-[11.5px]"
            >
              港一覧
            </button>
          </div>
        </div>
      </header>

      <div className="flex-1 min-h-0 relative flex">
        <aside className="hidden lg:block w-[352px] xl:w-[376px] shrink-0 min-h-0">
          <Sidebar
            ports={filtered}
            total={ports.length}
            loading={loading}
            query={query}
            onQuery={setQuery}
            kind={kind}
            onKind={onKind}
            pref={pref}
            onPref={setPref}
            typeCode={typeCode}
            onTypeCode={setTypeCode}
            prefectures={dataset?.prefectures ?? []}
            typeOptions={typeOptions}
            byDistance={byDistance}
            onToggleDistance={() => setByDistance((v) => !v)}
            me={me}
            onLocate={locate}
            locating={locating}
            selectedId={selected?.i ?? null}
            onSelect={selectPort}
          />
        </aside>

        {listOpen && (
          <div className="lg:hidden fixed inset-0 z-[1000] bg-ink/30" onClick={() => setListOpen(false)}>
            <div
              className="absolute inset-x-0 bottom-0 top-[10vh] bg-paper-2 anim-rise"
              onClick={(e) => e.stopPropagation()}
            >
              <Sidebar
                ports={filtered}
                total={ports.length}
                loading={loading}
                query={query}
                onQuery={setQuery}
                kind={kind}
                onKind={onKind}
                pref={pref}
                onPref={setPref}
                typeCode={typeCode}
                onTypeCode={setTypeCode}
                prefectures={dataset?.prefectures ?? []}
                typeOptions={typeOptions}
                byDistance={byDistance}
                onToggleDistance={() => setByDistance((v) => !v)}
                me={me}
                onLocate={locate}
                locating={locating}
                selectedId={selected?.i ?? null}
                onSelect={selectPort}
                onClose={() => setListOpen(false)}
              />
            </div>
          </div>
        )}

        <main className="relative flex-1 min-w-0 min-h-0">
          {loadError && (
            <div className="absolute inset-0 z-[600] flex items-center justify-center bg-paper chart-paper p-6">
              <div className="border border-signal/40 bg-paper-2 p-4 max-w-md">
                <p className="text-[13px] font-semibold text-signal">データを読み込めませんでした</p>
                <p className="mt-1 text-[11.5px] text-ink-2">{loadError}</p>
              </div>
            </div>
          )}

          <MapView
            ports={filtered}
            selectedId={selected?.i ?? null}
            onSelect={selectPort}
            me={me}
            routeGeometry={routeGeometry}
            focusPort={focusPort}
            focusToken={focusToken}
            googleApiKey={googleApiKey || undefined}
            googleMapId={googleMapId}
          />

          {locationError && !selected && (
            <div className="absolute left-1/2 -translate-x-1/2 top-3 z-[600] max-w-[92%]">
              <div className="flex items-start gap-2 bg-paper-2 border border-signal/40 px-3 py-2 shadow-panel">
                <span className="text-[11px] text-ink-2">{locationError}</span>
                <button
                  type="button"
                  onClick={() => setLocationError(null)}
                  aria-label="閉じる"
                  className="text-ink-3 hover:text-ink shrink-0"
                >
                  <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
                    <path d="M1 1l8 8M9 1L1 9" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
                  </svg>
                </button>
              </div>
            </div>
          )}

          {!selected && !loadError && (
            <div className="pointer-events-none absolute left-1/2 -translate-x-1/2 bottom-6 z-[550] hidden sm:block">
              <div className="bg-paper-2/95 border border-ink/20 px-3 py-1.5 text-[10.5px] text-ink-2 shadow-panel">
                マーカーをタップすると、今月の釣りもの・潮・天気・ルートが見られます
              </div>
            </div>
          )}

          {selected && (
            <div
              className="
                anim-slide z-[900]
                fixed inset-x-0 bottom-0 top-[16vh] border-t border-ink/20 shadow-float
                lg:absolute lg:inset-y-0 lg:top-0 lg:right-0 lg:left-auto lg:w-[430px] xl:w-[456px]
                lg:border-t-0 lg:border-l
              "
            >
              <PortDetail
                port={selected}
                fish={fish}
                me={me}
                month={month}
                currentMonth={currentMonth}
                onMonthChange={setMonth}
                onResetMonth={() => setMonth(currentMonth)}
                onClose={closeDetail}
                onRouteGeometry={setRouteGeometry}
                locating={locating}
                locationError={locationError}
                onRequestLocation={locate}
              />
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
