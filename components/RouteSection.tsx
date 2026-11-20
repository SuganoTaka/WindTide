"use client";

import { formatKm, googleMapsDirectionsUrl } from "@/lib/geo";
import type { LatLon, Port, RouteResponse } from "@/lib/types";

interface Props {
  port: Port;
  me: LatLon | null;
  straightKm: number | null;
  route: RouteResponse | null;
  loading: boolean;
  showRoute: boolean;
  onToggleRoute: () => void;
  onRetry: () => void;
  onRequestLocation: () => void;
  locating: boolean;
  locationError: string | null;
}

export default function RouteSection({
  port,
  me,
  straightKm,
  route,
  loading,
  showRoute,
  onToggleRoute,
  onRetry,
  onRequestLocation,
  locating,
  locationError,
}: Props) {
  const dest = { lat: port.la, lon: port.lo };

  return (
    <section aria-labelledby="route-heading">
      <div className="flex items-baseline justify-between">
        <h3 id="route-heading" className="eyebrow">
          現在地からのアクセス
        </h3>
        <span className="text-[10px] text-ink-3">OSRM / 直線距離</span>
      </div>

      {!me ? (
        <div className="mt-2 border border-rule bg-paper-2/70 p-3">
          <p className="text-[11.5px] text-ink-2">
            現在地を取得すると、ここまでの距離とルートが地図に表示されます。
          </p>
          {locationError && <p className="mt-1 text-[10.5px] text-signal">{locationError}</p>}
          <button
            type="button"
            onClick={onRequestLocation}
            disabled={locating}
            className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-teal text-paper-2 text-[11.5px] rounded-[2px] hover:bg-ink transition-colors disabled:opacity-60"
          >
            {locating ? "取得中…" : "現在地を取得"}
          </button>
          <a
            href={googleMapsDirectionsUrl(null, dest)}
            target="_blank"
            rel="noreferrer"
            className="mt-2 ml-2 inline-flex items-center gap-1 px-2.5 py-1.5 border border-ink text-[11.5px] rounded-[2px] hover:bg-ink hover:text-paper-2 transition-colors"
          >
            Google マップで経路
          </a>
        </div>
      ) : (
        <>
          <div className="mt-2 grid grid-cols-2 gap-px bg-rule border border-rule">
            <div className="bg-paper-2 px-2.5 py-2">
              <div className="text-[9.5px] text-ink-3">直線距離</div>
              <div className="num text-[18px] leading-tight">
                {straightKm != null ? formatKm(straightKm) : "—"}
              </div>
            </div>
            <div className="bg-paper-2 px-2.5 py-2">
              <div className="text-[9.5px] text-ink-3">車ルート</div>
              <div className="num text-[18px] leading-tight">
                {loading ? (
                  <span className="text-ink-3 text-[12px]">計算中…</span>
                ) : route ? (
                  <>
                    {formatKm(route.distanceKm)}
                    <span className="text-[11px] text-ink-2 ml-1">約{route.durationMin}分</span>
                  </>
                ) : (
                  "—"
                )}
              </div>
            </div>
          </div>

          {route?.source === "straight" && (
            <p className="mt-1.5 text-[10px] text-gold">
              経路サービスに接続できなかったため、直線距離×1.3 の概算を表示しています。
            </p>
          )}

          <div className="mt-2 flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={onToggleRoute}
              className={[
                "px-2.5 py-1.5 text-[11.5px] border rounded-[2px] transition-colors",
                showRoute
                  ? "bg-ink text-paper-2 border-ink"
                  : "border-ink/40 hover:border-ink text-ink",
              ].join(" ")}
            >
              {showRoute ? "ルート表示を消す" : "ルートを地図に表示"}
            </button>
            <a
              href={googleMapsDirectionsUrl(me, dest)}
              target="_blank"
              rel="noreferrer"
              className="px-2.5 py-1.5 text-[11.5px] border border-ink rounded-[2px] hover:bg-ink hover:text-paper-2 transition-colors"
            >
              Google マップで経路
            </a>
            <button
              type="button"
              onClick={onRetry}
              className="px-2.5 py-1.5 text-[11.5px] border border-rule text-ink-2 rounded-[2px] hover:border-ink-2"
            >
              再計算
            </button>
          </div>
        </>
      )}
    </section>
  );
}
