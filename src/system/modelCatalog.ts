import { MODEL_META } from './modelMeta.js';
import type { ScrapedModel } from './catalogTypes.js';
import type { SystemSpecs, ModelRecommendation, ModelStrength } from './specs.js';
import { MODEL_CATALOG } from './modelCatalog.generated.js';
import { isUsableLocally } from './ollamaScrape.js';

// ── サイズ→RAM推定・強み分類 ─────────────────────────────────────────────────

/** パラメータ数（B）から必要RAM（GB）の目安を推定する（Q4量子化＋KVキャッシュ想定） */
export function estimateRamGB(sizeB: number): number {
  const table: Array<[number, number]> = [
    [1, 2], [2, 3], [4, 4], [8, 8], [9, 12], [14, 16], [24, 24], [32, 32], [40, 40], [70, 64], [120, 96],
  ];
  for (const [maxB, ram] of table) {
    if (sizeB <= maxB) return ram;
  }
  return 128;
}

/**
 * 名前・説明・採用サイズから強みを分類する（先勝ち）。
 * 説明文は「reasoning, coding, multimodal...」のような全部載せの宣伝文が多いため、
 * 単語の含有ではなく「その用途を主目的と明言する表現」のみをシグナルとして使う。
 */
export function classifyStrength(m: ScrapedModel, selectedSizeB: number | null): ModelStrength {
  const name = m.name.toLowerCase();
  const desc = m.description.toLowerCase();

  if (/code|coder/.test(name)) return 'coding';
  if (/agentic coding|coding[- ]focused|code generation|for coding|coding &|model for coding/.test(desc)) return 'coding';

  if (/(^|[-_.])r1\b/.test(name) || /\bqwq\b/.test(name)) return 'reasoning';
  if (/reasoning[- ](model|specialized|focused)|built for [^.]*reasoning|strong reasoning/.test(desc)) return 'reasoning';

  if (selectedSizeB !== null && selectedSizeB <= 4) return 'light';
  if (selectedSizeB !== null && selectedSizeB >= 27) return 'large';
  return 'balanced';
}

/**
 * インストール済みモデル名（例 'qwen3.5:35B-A3B'）から強みを解決する。
 * modelCatalog.generated.ts / MODEL_META に情報があればそれを使い、無ければ
 * classifyStrength() のヒューリスティックを名前のみで適用する。
 * 駒別推奨のtier2（strengthベースマッチング）で使用する。
 */
export function strengthOfModelName(name: string): ModelStrength | null {
  const normalized = name.toLowerCase();
  const [base, ...tagParts] = normalized.split(':');
  const tag = tagParts.join(':');
  const taggedName = tag ? `${base}:${tag}` : base;

  // 1. MODEL_META（手書き）を最優先
  if (MODEL_META[taggedName]?.strength) return MODEL_META[taggedName].strength!;
  if (MODEL_META[base]?.strength) return MODEL_META[base].strength!;

  // 2. 生成カタログ（modelCatalog.generated.ts）を参照
  const scraped = MODEL_CATALOG.find((m) => m.name.toLowerCase() === base);
  if (scraped) {
    const sizeMatch = tag.match(/(\d+(?:\.\d+)?)/);
    const selectedSizeB = sizeMatch ? Number(sizeMatch[1]) : null;
    return classifyStrength(scraped, selectedSizeB);
  }

  // 3. カタログ未収録: 名前だけのヒューリスティック
  const sizeMatch = tag.match(/(\d+(?:\.\d+)?)/);
  const selectedSizeB = sizeMatch ? Number(sizeMatch[1]) : null;
  return classifyStrength({ name: base, description: '', sizesB: [], sizeTags: [], capabilities: [], pulls: '', cloud: false }, selectedSizeB);
}

// ── 公開 API ──────────────────────────────────────────────────────────────────

/**
 * スクレイプ結果（featured or 検索結果）をスペックでフィルタし、ModelRecommendation[] に変換する。
 * 各モデルは effectiveRam に収まる最大パラメータサイズを選び `name:27b` 形式にする。
 */
export function buildRecommendations(scraped: ScrapedModel[], specs: SystemSpecs): ModelRecommendation[] {
  // Apple SiliconはGPU統合メモリのため1段階上のモデルまで推奨
  const effectiveRam = specs.isAppleSilicon ? specs.ramGB * 1.2 : specs.ramGB;
  const models: ModelRecommendation[] = [];

  for (const m of scraped) {
    if (!isUsableLocally(m)) continue;

    // RAMに収まる最大サイズを採用
    let selectedSizeB: number | null = null;
    let selectedTag: string | null = null;
    for (let i = m.sizesB.length - 1; i >= 0; i--) {
      if (estimateRamGB(m.sizesB[i]) <= effectiveRam) {
        selectedSizeB = m.sizesB[i];
        selectedTag   = m.sizeTags[i];
        break;
      }
    }

    let name: string;
    let requiredRamGB: number;
    if (selectedTag !== null && selectedSizeB !== null) {
      name          = `${m.name}:${selectedTag}`;
      requiredRamGB = estimateRamGB(selectedSizeB);
    } else if (m.sizesB.length === 0 && MODEL_META[m.name]) {
      // サイズ非公開だがMETAにRAM目安がある既知モデルはタグなし名で救済
      // （isUsableLocally が cloud専用を既に弾いているため、ここに来るのは
      //  qwen3-coder-next のような正当なローカルモデルのみ）
      if (MODEL_META[m.name].requiredRamGB > effectiveRam) continue;
      name          = m.name;
      requiredRamGB = MODEL_META[m.name].requiredRamGB;
    } else {
      // サイズ不明・RAMに収まるサイズなし → 除外
      continue;
    }

    // メタ上書き: タグ付き名 → ベース名（説明・強みのみ） → スクレイプ値
    const tagMeta  = MODEL_META[name];
    const baseMeta = MODEL_META[m.name];
    models.push({
      name,
      label:         tagMeta?.label ?? (selectedTag ? `${m.name} ${selectedTag.toUpperCase()}` : baseMeta?.label ?? m.name),
      requiredRamGB: tagMeta?.requiredRamGB ?? requiredRamGB,
      description:   tagMeta?.description ?? baseMeta?.description ?? m.description,
      strength:      tagMeta?.strength ?? baseMeta?.strength ?? classifyStrength(m, selectedSizeB),
      capabilities:  m.capabilities,
      pulls:         m.pulls || undefined,
    });
  }

  return models;
}

/** 内蔵スナップショット（modelCatalog.generated.ts）から推奨モデルを組み立てる */
export function builtinRecommendations(specs: SystemSpecs): ModelRecommendation[] {
  return buildRecommendations(MODEL_CATALOG, specs);
}
