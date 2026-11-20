import { buildWeatherPayload, openMeteoUrls, type OpenMeteoRaw } from "./weather-build";
import type { LatLon, RouteResponse, WeatherResponse } from "./types";

/**
 * サーバー側の /api/weather が使えない環境（サーバーに外向き通信が無い等）でも
 * 表示できるよう、ブラウザから直接 Open-Meteo を叩くフォールバック。
 * Open-Meteo は CORS を許可している。
 */
export async function fetchWeatherDirect(lat: number, lon: number): Promise<WeatherResponse> {
  const { forecast, marine } = openMeteoUrls(lat, lon);
  const [f, m] = await Promise.all([
    fetch(forecast).then((r) => {
      if (!r.ok) throw new Error(`天気の取得に失敗 (${r.status})`);
      return r.json() as Promise<OpenMeteoRaw>;
    }),
    fetch(marine)
      .then((r) => (r.ok ? (r.json() as Promise<OpenMeteoRaw>) : null))
      .catch(() => null),
  ]);
  return buildWeatherPayload(f, m, lat, lon);
}

interface OsrmGeo {
  code?: string;
  routes?: {
    distance: number;
    duration: number;
    geometry?: { coordinates: [number, number][] };
  }[];
}

export async function fetchRouteDirect(
  from: LatLon,
  to: LatLon
): Promise<RouteResponse | null> {
  try {
    const url =
      `https://router.project-osrm.org/route/v1/driving/` +
      `${from.lon},${from.lat};${to.lon},${to.lat}` +
      `?overview=full&geometries=geojson&alternatives=false&steps=false`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = (await res.json()) as OsrmGeo;
    const route = data.routes?.[0];
    if (data.code !== "Ok" || !route) return null;
    return {
      mode: "driving",
      distanceKm: Math.round((route.distance / 1000) * 10) / 10,
      durationMin: Math.round(route.duration / 60),
      geometry: (route.geometry?.coordinates ?? []).map(
        ([lon, lat]) => [lat, lon] as [number, number]
      ),
      source: "osrm",
    };
  } catch {
    return null;
  }
}
