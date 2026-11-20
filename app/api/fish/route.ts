import { NextResponse } from "next/server";
import fs from "node:fs/promises";
import path from "node:path";
import { cacheGet, cacheSet, fetchText } from "@/lib/api-cache";
import { parseCsv, sheetRowsToSpecies } from "@/lib/fish-sheet";
import type { FishDataset } from "@/lib/types";

export const dynamic = "force-dynamic";

const FILE = path.join(process.cwd(), "public", "data", "fish-species.json");
const CACHE_KEY = "fish:dataset";

async function loadBase(): Promise<FishDataset> {
  const raw = await fs.readFile(FILE, "utf8");
  return JSON.parse(raw) as FishDataset;
}

function sheetUrl(id: string): string {
  const params = new URLSearchParams({ tqx: "out:csv" });
  const sheet = process.env.FISH_SHEET_NAME;
  const gid = process.env.FISH_SHEET_GID;
  if (sheet) params.set("sheet", sheet);
  else if (gid) params.set("gid", gid);
  return `https://docs.google.com/spreadsheets/d/${id}/gviz/tq?${params.toString()}`;
}

export async function GET() {
  const cached = cacheGet<FishDataset>(CACHE_KEY);
  if (cached) return NextResponse.json(cached);

  let base: FishDataset;
  try {
    base = await loadBase();
  } catch (err) {
    return NextResponse.json(
      { error: "魚データ（JSON）を読み込めませんでした", detail: String(err) },
      { status: 500 }
    );
  }

  const sheetId = (process.env.FISH_SHEET_ID ?? "").trim();
  if (!sheetId) {
    cacheSet(CACHE_KEY, base);
    return NextResponse.json({ ...base, source: "json" });
  }

  try {
    const csv = await fetchText(sheetUrl(sheetId), 15000);
    const { species, warnings } = sheetRowsToSpecies(parseCsv(csv), base.regions);
    if (species.length === 0) throw new Error(warnings[0] ?? "シートに有効な行がありません");

    const merged: FishDataset & { source?: string; warnings?: string[] } = {
      ...base,
      updatedAt: new Date().toISOString(),
      species,
      source: "sheet",
      warnings: warnings.slice(0, 20),
    };
    cacheSet(CACHE_KEY, merged);
    if (warnings.length) console.warn("[fish] sheet warnings:", warnings.slice(0, 10));
    return NextResponse.json(merged);
  } catch (err) {
    // シートが読めないときは同梱の JSON で動かす（画面が空にならない）
    console.error("[fish] sheet fallback:", String(err).slice(0, 300));
    cacheSet(CACHE_KEY, base);
    return NextResponse.json({
      ...base,
      source: "json-fallback",
      warnings: [`シートを読み込めませんでした: ${String(err).slice(0, 160)}`],
    });
  }
}
