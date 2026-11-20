import type { Port } from "./types";

export interface PortCluster {
  id: string;
  lat: number;
  lon: number;
  count: number;
  ports: Port[];
}

export interface ClusterResult {
  clusters: PortCluster[];
  singles: Port[];
}

const CELL_PX = 46;

/**
 * 画面ピクセル基準のグリッドでクラスタリングする。
 * 依存ライブラリなしで Leaflet / Google Maps どちらでも同じ見た目になる。
 */
export function clusterPorts(ports: Port[], zoom: number): ClusterResult {
  if (zoom >= 14) {
    return { clusters: [], singles: ports };
  }
  const degPerPx = 360 / (256 * Math.pow(2, Math.max(1, zoom)));
  const cell = CELL_PX * degPerPx;

  const buckets = new Map<string, Port[]>();
  for (const p of ports) {
    const key = `${Math.floor((p.lo + 180) / cell)}:${Math.floor((p.la + 90) / cell)}`;
    const list = buckets.get(key);
    if (list) list.push(p);
    else buckets.set(key, [p]);
  }

  const clusters: PortCluster[] = [];
  const singles: Port[] = [];
  for (const [key, list] of buckets) {
    if (list.length === 1) {
      singles.push(list[0]);
      continue;
    }
    let lat = 0;
    let lon = 0;
    for (const p of list) {
      lat += p.la;
      lon += p.lo;
    }
    clusters.push({
      id: key,
      lat: lat / list.length,
      lon: lon / list.length,
      count: list.length,
      ports: list,
    });
  }
  return { clusters, singles };
}

export function portsInBounds(
  ports: Port[],
  bounds: { north: number; south: number; east: number; west: number }
): Port[] {
  return ports.filter(
    (p) =>
      p.la <= bounds.north &&
      p.la >= bounds.south &&
      p.lo <= bounds.east &&
      p.lo >= bounds.west
  );
}
