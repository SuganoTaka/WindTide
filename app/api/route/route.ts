import { NextResponse } from "next/server";
import { cacheGet, cacheSet, fetchJson } from "@/lib/api-cache";
import { haversineKm } from "@/lib/geo";
import type { RouteResponse } from "@/lib/types";

export const dynamic = "force-dynamic";

interface OsrmRoute {
  code: string;
  routes?: {
    distance: number;
    duration: number;
    geometry?: { coordinates: [number, number][] };
  }[];
}

function parsePoint(v: string | null): { lat: number; lon: number } | null {
  if (!v) return null;
  const [a, b] = v.split(",").map(Number);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
  if (Math.abs(a) > 90 || Math.abs(b) > 180) return null;
  return { lat: a, lon: b };
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const from = parsePoint(url.searchParams.get("from"));
  const to = parsePoint(url.searchParams.get("to"));
  if (!from || !to) {
    return NextResponse.json({ error: "from / to が不正です" }, { status: 400 });
  }

  const key = `r:${from.lat.toFixed(3)},${from.lon.toFixed(3)}:${to.lat.toFixed(3)},${to.lon.toFixed(3)}`;
  const cached = cacheGet<RouteResponse>(key);
  if (cached) return NextResponse.json(cached);

  const straightKm = haversineKm(from, to);

  const osrmUrl =
    `https://router.project-osrm.org/route/v1/driving/` +
    `${from.lon},${from.lat};${to.lon},${to.lat}` +
    `?overview=full&geometries=geojson&alternatives=false&steps=false`;

  try {
    const data = await fetchJson<OsrmRoute>(osrmUrl, 15000);
    const route = data.routes?.[0];
    if (data.code === "Ok" && route) {
      const coords = route.geometry?.coordinates ?? [];
      const payload: RouteResponse = {
        mode: "driving",
        distanceKm: Math.round((route.distance / 1000) * 10) / 10,
        durationMin: Math.round(route.duration / 60),
        geometry: coords.map(([lon, lat]) => [lat, lon] as [number, number]),
        source: "osrm",
      };
      cacheSet(key, payload);
      return NextResponse.json(payload);
    }
    throw new Error(`osrm code: ${data.code}`);
  } catch (err) {
    const payload: RouteResponse = {
      mode: "driving",
      distanceKm: Math.round(straightKm * 1.3 * 10) / 10,
      durationMin: Math.round((straightKm * 1.3) / 40 * 60),
      geometry: [
        [from.lat, from.lon],
        [to.lat, to.lon],
      ],
      source: "straight",
      message: `経路サービスに接続できなかったため直線距離からの概算です (${String(err).slice(0, 80)})`,
    };
    cacheSet(key, payload);
    return NextResponse.json(payload);
  }
}
