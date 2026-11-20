export type PortKind = "f" | "h";

export interface Port {
  i: string;
  k: PortKind;
  n: string;
  p: string;
  pc: string;
  r: string;
  t: string;
  tc: number;
  a: string;
  la: number;
  lo: number;
  code: string;
  ol?: number;
  ml?: number;
  d?: string;
  fy?: number;
}

export interface PortDataset {
  generatedAt: string;
  source: {
    name: string;
    fishingPort: string;
    portAndHarbor: string;
    license: string;
  };
  counts: { fishing: number; harbor: number; total: number };
  prefectures: { code: string; name: string }[];
  ports: Port[];
}

export interface FishRegion {
  id: string;
  name: string;
  prefectures: string[];
}

export interface Species {
  id: string;
  name: string;
  kana: string;
  aliases: string[];
  group: string;
  size: string;
  methods: string[];
  baits: string[];
  tackle: string;
  tip: string;
  caution?: string;
  season: Record<string, number[]>;
  peak?: Record<string, number[]>;
  rating: number;
}

export interface FishDataset {
  schemaVersion: number;
  updatedAt: string;
  description: string;
  regions: FishRegion[];
  groups: string[];
  ratingGuide: Record<string, string>;
  species: Species[];
}

export interface SeasonMatch {
  species: Species;
  rating: number;
  isPeak: boolean;
}

export interface TideExtreme {
  t: string;
  hours: number;
  h: number;
  type: "high" | "low";
}

export interface TidePoint {
  t: string;
  h: number;
}

export interface TideInfo {
  points: TidePoint[];
  extremes: TideExtreme[];
  todayRange: number | null;
  moonAge: number;
  moonPhase: string;
  moonIllum: number;
  tideName: string;
  tideScore: number;
}

export interface WeatherHour {
  t: string;
  temp: number | null;
  wind: number | null;
  windDir: number | null;
  gust: number | null;
  precipProb: number | null;
  wave: number | null;
  seaLevel: number | null;
  code: number | null;
}

export interface WeatherDay {
  date: string;
  code: number | null;
  tempMax: number | null;
  tempMin: number | null;
  precipProb: number | null;
  windMax: number | null;
  windDir: number | null;
  waveMax: number | null;
  sunrise: string | null;
  sunset: string | null;
}

export interface WeatherResponse {
  location: { lat: number; lon: number };
  updatedAt: string;
  current: {
    temp: number | null;
    apparent: number | null;
    humidity: number | null;
    pressure: number | null;
    wind: number | null;
    windDir: number | null;
    gust: number | null;
    code: number | null;
    precip: number | null;
    wave: number | null;
    seaTemp: number | null;
  };
  hourly: WeatherHour[];
  daily: WeatherDay[];
  tide: TideInfo;
  tideAvailable: boolean;
}

export interface RouteResponse {
  mode: string;
  distanceKm: number;
  durationMin: number;
  geometry: [number, number][];
  source: "osrm" | "straight";
  message?: string;
}

export interface LatLon {
  lat: number;
  lon: number;
}
