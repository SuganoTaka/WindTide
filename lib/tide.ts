import type { TideExtreme, TideInfo, TidePoint } from "./types";

const SYNODIC = 29.530588853;
const NEW_MOON_REF = Date.UTC(2000, 0, 6, 18, 14, 0);

export function moonAge(nowMs: number): number {
  const days = (nowMs - NEW_MOON_REF) / 86400000;
  const age = ((days % SYNODIC) + SYNODIC) % SYNODIC;
  return age;
}

export function moonPhaseName(age: number): string {
  if (age < 1.8 || age >= 28.2) return "新月";
  if (age < 5.5) return "三日月";
  if (age < 9.5) return "上弦の月";
  if (age < 13.5) return "十三夜";
  if (age < 16.6) return "満月";
  if (age < 20.5) return "十八夜";
  if (age < 24.0) return "下弦の月";
  if (age < 27.0) return "有明月";
  return "晦日月";
}

export function moonIllumination(age: number): number {
  return (1 - Math.cos((2 * Math.PI * age) / SYNODIC)) / 2;
}

/** ローカル時刻文字列(YYYY-MM-DDTHH:mm)を、時刻計算用のミリ秒に変換 */
export function localToMs(local: string): number {
  return Date.parse(`${local.length === 16 ? local : local.slice(0, 16)}:00Z`);
}

export function msToLocal(ms: number): string {
  const d = new Date(ms);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getUTCFullYear()}-${p(d.getUTCMonth() + 1)}-${p(d.getUTCDate())}T${p(
    d.getUTCHours()
  )}:${p(d.getUTCMinutes())}`;
}

export function findExtremes(points: TidePoint[]): TideExtreme[] {
  const out: TideExtreme[] = [];
  for (let i = 1; i < points.length - 1; i++) {
    const y0 = points[i - 1].h;
    const y1 = points[i].h;
    const y2 = points[i + 1].h;
    const isHigh = y1 >= y0 && y1 > y2;
    const isLow = y1 <= y0 && y1 < y2;
    if (!isHigh && !isLow) continue;
    const denom = y0 - 2 * y1 + y2;
    let shiftHours = 0;
    if (Math.abs(denom) > 1e-6) {
      shiftHours = (0.5 * (y0 - y2)) / denom;
      shiftHours = Math.max(-0.5, Math.min(0.5, shiftHours));
    }
    shiftHours = isHigh ? -Math.abs(shiftHours) : Math.abs(shiftHours);
    const baseMs = localToMs(points[i].t);
    const tMs = baseMs + shiftHours * 3600000;
    const t = msToLocal(Math.round(tMs / 60000) * 60000);
    out.push({
      t,
      hours: new Date(tMs).getUTCHours() + new Date(tMs).getUTCMinutes() / 60,
      h: Math.round(y1 * 100) / 100,
      type: isHigh ? "high" : "low",
    });
  }
  return out;
}

export function dailyRanges(points: TidePoint[]): Map<string, number> {
  const map = new Map<string, { min: number; max: number }>();
  for (const p of points) {
    const day = p.t.slice(0, 10);
    const cur = map.get(day);
    if (!cur) map.set(day, { min: p.h, max: p.h });
    else {
      cur.min = Math.min(cur.min, p.h);
      cur.max = Math.max(cur.max, p.h);
    }
  }
  const out = new Map<string, number>();
  for (const [k, v] of map) out.set(k, Math.round((v.max - v.min) * 100) / 100);
  return out;
}

/**
 * 潮回りは月齢で判定する（日本の潮汐表と同じ考え方）。
 * 大潮 = 朔・望の前後、小潮 = 上弦・下弦の前後。
 */
export function classifyTide(moonAgeDays: number) {
  const a = moonAgeDays % 29.530588853;
  if (a < 3 || (a >= 14 && a < 17)) return { name: "大潮", score: 5 };
  if (a < 8 || (a >= 11 && a < 14) || (a >= 17 && a < 21) || a >= 29)
    return { name: "中潮", score: 4 };
  if (a < 11 || (a >= 21 && a < 25)) return { name: "小潮", score: 3 };
  if (a < 27) return { name: "長潮", score: 2 };
  return { name: "若潮", score: 2 };
}

export function tideNameHint(name: string): string {
  switch (name) {
    case "大潮":
      return "潮がよく動く。回遊魚の食いが立つ日。";
    case "中潮":
      return "釣りやすく、1日を通して狙いやすい。";
    case "小潮":
      return "潮の動きは緩やか。朝マズメ・夕マズメ重視で。";
    case "長潮":
      return "潮が動かず厳しめ。時合は短時間に集中する。";
    case "若潮":
      return "潮止まりが長い。根魚狙いに切り替えたい。";
    default:
      return "";
  }
}

export function buildTideInfo(
  points: TidePoint[],
  nowLocal: string,
  offsetSeconds: number
): TideInfo {
  const nowMs = localToMs(nowLocal) - offsetSeconds * 1000;
  const age = moonAge(nowMs);
  const extremes = findExtremes(points);
  const ranges = dailyRanges(points);
  const today = nowLocal.slice(0, 10);
  const todayRange = ranges.get(today) ?? null;
  const cls = classifyTide(age);
  return {
    points,
    extremes,
    todayRange,
    moonAge: Math.round(age * 10) / 10,
    moonPhase: moonPhaseName(age),
    moonIllum: moonIllumination(age),
    tideName: cls.name,
    tideScore: cls.score,
  };
}

const JST_OFFSET_MS = 9 * 3600 * 1000;

/** 日本時間(Asia/Tokyo)の現在時刻をローカル時刻文字列で返す */
export function jstNowLocal(d = new Date()): string {
  return msToLocal(d.getTime() + JST_OFFSET_MS);
}

export function hourLabel(local: string): string {
  return local.slice(11, 16);
}

export function dayLabel(local: string, todayLocal = jstNowLocal()): string {
  const day = local.slice(0, 10);
  const today = todayLocal.slice(0, 10);
  const t = Date.parse(`${day}T00:00:00Z`);
  const t0 = Date.parse(`${today}T00:00:00Z`);
  const diff = Math.round((t - t0) / 86400000);
  if (diff === 0) return "今日";
  if (diff === 1) return "明日";
  if (diff === 2) return "明後日";
  const d = new Date(`${day}T00:00:00Z`);
  return `${d.getUTCMonth() + 1}/${d.getUTCDate()}`;
}

export function weekdayJa(local: string): string {
  const d = new Date(`${local.slice(0, 10)}T00:00:00Z`);
  return ["日", "月", "火", "水", "木", "金", "土"][d.getUTCDay()];
}
