"use client";

import dynamic from "next/dynamic";
import type { LatLon, Port } from "@/lib/types";

const LeafletMap = dynamic(() => import("./LeafletMap"), {
  ssr: false,
  loading: () => <MapSkeleton />,
});
const GoogleMap = dynamic(() => import("./GoogleMap"), {
  ssr: false,
  loading: () => <MapSkeleton />,
});

function MapSkeleton() {
  return (
    <div className="w-full h-full chart-paper flex items-center justify-center">
      <span className="text-[11px] text-ink-3 tracking-widest">地図を読み込み中…</span>
    </div>
  );
}

interface Props {
  ports: Port[];
  selectedId: string | null;
  onSelect: (p: Port) => void;
  me: LatLon | null;
  routeGeometry: [number, number][] | null;
  focusPort: Port | null;
  focusToken: number;
  googleApiKey?: string;
  googleMapId?: string;
}

export default function MapView({
  ports,
  selectedId,
  onSelect,
  me,
  routeGeometry,
  focusPort,
  focusToken,
  googleApiKey,
  googleMapId,
}: Props) {
  if (googleApiKey) {
    return (
      <GoogleMap
        ports={ports}
        selectedId={selectedId}
        onSelect={onSelect}
        me={me}
        routeGeometry={routeGeometry}
        focusPort={focusPort}
        focusToken={focusToken}
        apiKey={googleApiKey}
        mapId={googleMapId}
      />
    );
  }
  return (
    <LeafletMap
      ports={ports}
      selectedId={selectedId}
      onSelect={onSelect}
      me={me}
      routeGeometry={routeGeometry}
      focusPort={focusPort}
      focusToken={focusToken}
    />
  );
}
