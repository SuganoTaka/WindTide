import type { FishDataset, SeasonMatch, Species } from "./types";

export const MONTH_LABEL = [
  "1月", "2月", "3月", "4月", "5月", "6月",
  "7月", "8月", "9月", "10月", "11月", "12月",
];

export const GROUP_ORDER = [
  "回遊魚",
  "根魚",
  "チヌ・スズキ",
  "底物",
  "磯・堤防",
  "頭足類",
  "その他",
];

export function regionName(dataset: FishDataset | null, regionId: string): string {
  return dataset?.regions.find((r) => r.id === regionId)?.name ?? "全国";
}

export function ratingFor(
  species: Species,
  regionId: string,
  month: number
): { rating: number; isPeak: boolean } {
  const months = species.season?.[regionId] ?? [];
  if (!months.includes(month)) return { rating: 0, isPeak: false };
  const peak = species.peak?.[regionId] ?? [];
  const isPeak = peak.includes(month);
  const base = species.rating ?? 3;
  return { rating: Math.min(5, isPeak ? base + 1 : base), isPeak };
}

export function seasonMatches(
  dataset: FishDataset | null,
  regionId: string,
  month: number
): SeasonMatch[] {
  if (!dataset) return [];
  const out: SeasonMatch[] = [];
  for (const species of dataset.species) {
    const { rating, isPeak } = ratingFor(species, regionId, month);
    if (rating > 0) out.push({ species, rating, isPeak });
  }
  out.sort((a, b) => {
    if (b.rating !== a.rating) return b.rating - a.rating;
    if (a.isPeak !== b.isPeak) return a.isPeak ? -1 : 1;
    const ga = GROUP_ORDER.indexOf(a.species.group);
    const gb = GROUP_ORDER.indexOf(b.species.group);
    if (ga !== gb) return ga - gb;
    return a.species.kana.localeCompare(b.species.kana, "ja");
  });
  return out;
}

export function groupMatches(matches: SeasonMatch[]): [string, SeasonMatch[]][] {
  const map = new Map<string, SeasonMatch[]>();
  for (const m of matches) {
    const g = m.species.group;
    if (!map.has(g)) map.set(g, []);
    map.get(g)!.push(m);
  }
  return [...map.entries()].sort(
    (a, b) => GROUP_ORDER.indexOf(a[0]) - GROUP_ORDER.indexOf(b[0])
  );
}

export function speciesMonths(species: Species, regionId: string): number[] {
  return [...(species.season?.[regionId] ?? [])].sort((a, b) => a - b);
}
