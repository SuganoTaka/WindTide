import type { FishDataset, FishRegion, Species } from "./types";

/**
 * Google スプレッドシート（CSV）から魚データを組み立てるためのユーティリティ。
 *
 * 1行 = 1魚種。列は headers を参照。
 * 地域列の書き方:
 *   「7,8,9」      … 7〜9月が釣り期
 *   「5-9」        … 範囲指定（5〜9月）
 *   「7,8*,9」     … 8月が最盛期（* を付けた月）
 * 空欄ならその地域では釣れない扱い（一覧に出ません）。
 */

export const REGION_COLUMN_ALIASES: Record<string, string[]> = {
  hokkaido: ["北海道", "hokkaido"],
  tohoku: ["東北", "tohoku"],
  kanto: ["関東", "kanto"],
  chubu: ["中部", "中部・北陸", "北陸", "chubu"],
  kinki: ["近畿", "kinki"],
  chushikoku: ["中国四国", "中国・四国", "中国", "四国", "chushikoku"],
  kyushu: ["九州", "kyushu"],
  okinawa: ["沖縄", "okinawa"],
};

const META_KEYS: Record<string, string[]> = {
  id: ["id", "ID", "コード"],
  name: ["名前", "魚種", "和名", "name"],
  kana: ["よみ", "ヨミ", "かな", "kana"],
  aliases: ["別名", "地方名", "aliases"],
  group: ["グループ", "分類", "group"],
  size: ["サイズ", "大きさ", "size"],
  methods: ["釣り方", "仕掛け・釣り方", "methods"],
  baits: ["エサ", "餌", "baits"],
  tackle: ["仕掛け", "タックル", "tackle"],
  tip: ["コツ", "ワンポイント", "tip"],
  caution: ["注意", "caution"],
  rating: ["評価", "期待度", "rating"],
};

/** RFC4180 準拠の最小CSVパーサ（引用符・改行・カンマ対応） */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  const src = text.replace(/^\uFEFF/, "");

  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (inQuotes) {
      if (ch === '"') {
        if (src[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
      continue;
    }
    if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      row.push(field);
      field = "";
    } else if (ch === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else if (ch === "\r") {
      // 改行は \n 側で処理
    } else {
      field += ch;
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.some((c) => c.trim() !== ""));
}

function norm(v: string): string {
  return (v ?? "").trim().replace(/\s+/g, "").replace(/（/g, "(").replace(/）/g, ")");
}

function findColumn(header: string[], keys: string[]): number {
  const normalized = header.map(norm);
  for (const key of keys) {
    const idx = normalized.indexOf(norm(key));
    if (idx >= 0) return idx;
  }
  return -1;
}

function regionColumn(header: string[], region: FishRegion): number {
  const aliases = REGION_COLUMN_ALIASES[region.id] ?? [region.name, region.id];
  const normalized = header.map(norm);
  for (const alias of aliases) {
    const idx = normalized.indexOf(norm(alias));
    if (idx >= 0) return idx;
  }
  return -1;
}

export interface SeasonCell {
  months: number[];
  peak: number[];
}

/** 「7,8*,9」「5-9」などを解釈する */
export function parseSeasonCell(raw: string): SeasonCell {
  const months = new Set<number>();
  const peak = new Set<number>();
  const text = (raw ?? "").trim();
  if (!text) return { months: [], peak: [] };

  for (const rawToken of text.split(/[,、\s]+/)) {
    const token = rawToken.trim();
    if (!token) continue;
    const isPeak = token.endsWith("*") || token.endsWith("＊");
    const body = isPeak ? token.slice(0, -1) : token;

    const range = body.match(/^(\d{1,2})\s*[-〜~]\s*(\d{1,2})$/);
    if (range) {
      let a = Number(range[1]);
      let b = Number(range[2]);
      if (a < 1 || a > 12 || b < 1 || b > 12) continue;
      for (let i = 0; i < 12; i++) {
        const m = a;
        if (m >= 1 && m <= 12) {
          months.add(m);
          if (isPeak) peak.add(m);
        }
        if (a === b) break;
        a = a === 12 ? 1 : a + 1;
      }
      continue;
    }

    const num = Number(body);
    if (Number.isInteger(num) && num >= 1 && num <= 12) {
      months.add(num);
      if (isPeak) peak.add(num);
    }
  }
  return {
    months: [...months].sort((x, y) => x - y),
    peak: [...peak].sort((x, y) => x - y),
  };
}

export function splitList(raw: string): string[] {
  return (raw ?? "")
    .split(/\s*[\/／|｜]\s*/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export function splitAliases(raw: string): string[] {
  return (raw ?? "")
    .split(/\s*[・,、\/]\s*/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export interface SheetParseResult {
  species: Species[];
  warnings: string[];
}

/** CSV の行（1行目ヘッダー）から species 配列を作る */
export function sheetRowsToSpecies(
  rows: string[][],
  regions: FishRegion[]
): SheetParseResult {
  const warnings: string[] = [];
  if (rows.length < 2) {
    return { species: [], warnings: ["シートにヘッダー行と1件以上のデータ行が必要です"] };
  }
  const header = rows[0];
  const col = {
    id: findColumn(header, META_KEYS.id),
    name: findColumn(header, META_KEYS.name),
    kana: findColumn(header, META_KEYS.kana),
    aliases: findColumn(header, META_KEYS.aliases),
    group: findColumn(header, META_KEYS.group),
    size: findColumn(header, META_KEYS.size),
    methods: findColumn(header, META_KEYS.methods),
    baits: findColumn(header, META_KEYS.baits),
    tackle: findColumn(header, META_KEYS.tackle),
    tip: findColumn(header, META_KEYS.tip),
    caution: findColumn(header, META_KEYS.caution),
    rating: findColumn(header, META_KEYS.rating),
  };

  if (col.name < 0) {
    return {
      species: [],
      warnings: ["「名前」列が見つかりません（1行目の見出しを確認してください）"],
    };
  }

  const regionCols = regions.map((r) => ({ region: r, idx: regionColumn(header, r) }));
  const missing = regionCols.filter((r) => r.idx < 0).map((r) => r.region.name);
  if (missing.length) {
    warnings.push(`地域の列が見つかりません: ${missing.join("、")}`);
  }

  const species: Species[] = [];
  const seen = new Set<string>();

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const name = (row[col.name] ?? "").trim();
    if (!name) continue;

    const id = (col.id >= 0 ? row[col.id] : "")?.trim() || `sheet-${i}`;
    if (seen.has(id)) {
      warnings.push(`${i + 1}行目: ID「${id}」が重複しています（スキップしました）`);
      continue;
    }
    seen.add(id);

    const season: Record<string, number[]> = {};
    const peak: Record<string, number[]> = {};
    for (const { region, idx } of regionCols) {
      if (idx < 0) continue;
      const cell = parseSeasonCell(row[idx] ?? "");
      if (cell.months.length === 0) continue;
      season[region.id] = cell.months;
      if (cell.peak.length) peak[region.id] = cell.peak;
    }

    if (Object.keys(season).length === 0) {
      warnings.push(`${i + 1}行目「${name}」: 釣り期が1つも入っていないため一覧に出ません`);
    }

    const ratingRaw = Number((col.rating >= 0 ? row[col.rating] : "")?.trim());
    const rating = Number.isFinite(ratingRaw) && ratingRaw >= 1 && ratingRaw <= 5 ? Math.round(ratingRaw) : 3;

    const caution = col.caution >= 0 ? (row[col.caution] ?? "").trim() : "";

    species.push({
      id,
      name,
      kana: (col.kana >= 0 ? row[col.kana] : "")?.trim() || name,
      aliases: splitAliases(col.aliases >= 0 ? row[col.aliases] ?? "" : ""),
      group: (col.group >= 0 ? row[col.group] : "")?.trim() || "その他",
      size: (col.size >= 0 ? row[col.size] : "")?.trim() || "—",
      methods: splitList(col.methods >= 0 ? row[col.methods] ?? "" : ""),
      baits: splitList(col.baits >= 0 ? row[col.baits] ?? "" : ""),
      tackle: (col.tackle >= 0 ? row[col.tackle] : "")?.trim() || "",
      tip: (col.tip >= 0 ? row[col.tip] : "")?.trim() || "",
      ...(caution ? { caution } : {}),
      season,
      ...(Object.keys(peak).length ? { peak } : {}),
      rating,
    });
  }

  return { species, warnings };
}

/** JSON → シート用の行（テンプレート生成に使用） */
export function datasetToSheetRows(dataset: FishDataset): string[][] {
  const header = [
    "ID",
    "名前",
    "よみ",
    "別名",
    "グループ",
    "サイズ",
    "釣り方",
    "エサ",
    "仕掛け",
    "コツ",
    "注意",
    "評価",
    ...dataset.regions.map((r) => r.name),
  ];

  const rows = dataset.species.map((s) => {
    const regionCells = dataset.regions.map((r) => {
      const months = s.season?.[r.id] ?? [];
      if (!months.length) return "";
      const peak = new Set(s.peak?.[r.id] ?? []);
      return months.map((m) => (peak.has(m) ? `${m}*` : `${m}`)).join(",");
    });
    return [
      s.id,
      s.name,
      s.kana,
      s.aliases.join("・"),
      s.group,
      s.size,
      s.methods.join(" / "),
      s.baits.join(" / "),
      s.tackle,
      s.tip,
      s.caution ?? "",
      String(s.rating),
      ...regionCells,
    ];
  });

  return [header, ...rows];
}

export function toCsv(rows: string[][]): string {
  const esc = (v: string) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
  return rows.map((r) => r.map(esc).join(",")).join("\r\n") + "\r\n";
}
