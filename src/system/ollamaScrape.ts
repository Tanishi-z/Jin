import type { ScrapedModel } from './catalogTypes.js';

/**
 * ollama.com/search の HTML パーサ。副作用を持たない純粋関数として、
 * 実行時（ollamaRegistry.ts）と CI 生成スクリプト（scripts/updateModelCatalog.ts）の
 * 両方から共有する。HTML構造が変わったときに両者が同時に壊れることで、
 * CI の週次実行が先に気付ける関係を作っている。
 */

/** HTMLエンティティの簡易デコード */
function decodeEntities(s: string): string {
  return s
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');
}

/**
 * サイズタグ文字列（'27b' '0.8b' '335m' 'e2b' '8x7b' 等）をB単位の数値に変換する。
 * 判定できない記法は null を返し、呼び出し側で除外する。
 */
export function parseSizeTag(tagRaw: string): number | null {
  const tag = tagRaw.toLowerCase();

  // 通常表記: '27b' '0.8b' '335m'
  const plain = tag.match(/^(\d+(?:\.\d+)?)([bm])$/);
  if (plain) {
    return plain[2] === 'm' ? Number(plain[1]) / 1000 : Number(plain[1]);
  }

  // Gemma系のエフェクティブパラメータ表記: 'e2b' 'e4b'
  const effective = tag.match(/^e(\d+(?:\.\d+)?)b$/);
  if (effective) return Number(effective[1]);

  // MoE表記: '8x7b' '16x17b'（RAM見積り用に総パラメータ数を採用。pull名にはタグ原文を使う）
  const moe = tag.match(/^(\d+(?:\.\d+)?)x(\d+(?:\.\d+)?)b$/);
  if (moe) return Number(moe[1]) * Number(moe[2]);

  // その他の記法（意図的に除外）
  return null;
}

/**
 * HTML構造の前提が崩れていないか検査する。
 * セレクタが1件も見つからない場合はどのセレクタが壊れたか分かるメッセージで throw する。
 */
export function assertHtmlShape(html: string): void {
  const checks: Array<[string, RegExp]> = [
    ['サイズタグ (bg-[#ddf4ff])', /bg-\[#ddf4ff\]/],
    ['能力タグ (bg-indigo-50)', /bg-indigo-50/],
    ['Pullsラベル (&nbsp;Pulls)', /&nbsp;Pulls/],
  ];
  const missing = checks.filter(([, re]) => !re.test(html)).map(([label]) => label);
  if (missing.length > 0) {
    throw new Error(`ollama.com のHTML構造が変化した可能性があります。見つからないセレクタ: ${missing.join(', ')}`);
  }
}

/**
 * ollama.com/search の HTML 文字列からモデル情報を構造化して抽出する。
 * 抽出0件（HTML構造変化）の場合は throw し、呼び出し側でフォールバックさせる。
 */
export function parseSearchHtml(html: string): ScrapedModel[] {
  assertHtmlShape(html);

  const chunks = html.split(/<li\s+class="flex items-baseline border-b border-neutral-200 py-6">/).slice(1);
  const models: ScrapedModel[] = [];

  for (const chunk of chunks) {
    // ユーザー名前空間モデル（/JXW67/TGAI_NB 等）は /library/ を持たないため除外
    const name = chunk.match(/href="\/library\/([a-z0-9._-]+)" class="group w-full"/)?.[1];
    if (!name) continue;

    const description = decodeEntities(
      chunk.match(/<p class="max-w-lg break-words[^"]*">\s*([^<]*?)\s*<\/p>/)?.[1] ?? '',
    );

    // サイズタグ: 必ずクラス bg-[#ddf4ff] で特定する。
    // クラスを見ずに全spanを走査すると Pulls の '5.7M' が '5.7m' と誤認される。
    const sizesB: number[] = [];
    const sizeTags: string[] = [];
    for (const m of chunk.matchAll(/<span[^>]*bg-\[#ddf4ff\][^>]*>\s*([^<]+?)\s*<\/span>/g)) {
      const tag = m[1].toLowerCase();
      const value = parseSizeTag(tag);
      if (value === null) continue;
      sizesB.push(value);
      sizeTags.push(tag);
    }
    // 昇順に整列（タグも同順を維持）
    const order = sizesB.map((_, i) => i).sort((a, b) => sizesB[a] - sizesB[b]);
    const sortedSizes = order.map((i) => sizesB[i]);
    const sortedTags  = order.map((i) => sizeTags[i]);

    const capabilities = [...chunk.matchAll(/<span[^>]*bg-indigo-50[^>]*>\s*([^<]+?)\s*<\/span>/g)]
      .map((m) => m[1].toLowerCase());

    const cloud = /<span[^>]*bg-cyan-50[^>]*>\s*cloud\s*<\/span>/.test(chunk);

    const pulls = chunk.match(/<span\s*>\s*([^<]+?)\s*<\/span>\s*<span class="hidden sm:flex">&nbsp;Pulls<\/span>/)?.[1] ?? '';

    models.push({ name, description, sizesB: sortedSizes, sizeTags: sortedTags, capabilities, pulls, cloud });
  }

  if (models.length === 0) throw new Error('モデル情報を抽出できませんでした');
  return models;
}

/**
 * ollama.com/search を取得してパースする。
 * query 省略時は featured（注目モデル）、指定時はキーワード検索。
 * featured / popular は同一結果を返すため sort パラメータは featured 固定にしている。
 */
export async function fetchSearch(query?: string): Promise<ScrapedModel[]> {
  const url = query
    ? `https://ollama.com/search?q=${encodeURIComponent(query)}`
    : 'https://ollama.com/search?sort=featured';

  const res = await fetch(url, {
    signal: AbortSignal.timeout(6000),
    headers: { 'User-Agent': 'jin-cli' },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);

  const html = await res.text();
  return parseSearchHtml(html);
}

/** チャット用途に使えない、またはローカル実行できないモデルを除外する */
export function isUsableLocally(m: ScrapedModel): boolean {
  if (m.capabilities.includes('embedding')) return false;
  if (/\bembed(ding)?\b/i.test(`${m.name} ${m.description}`)) return false;
  // クラウド専用モデル: cloudタグがあり、かつローカル実行可能なサイズが1件も無いもの。
  // cloudタグ単体は「ローカル不可」を意味しない（gemma4 等は cloud+サイズタグを両方持つ）。
  if (m.cloud && m.sizeTags.length === 0) return false;
  return true;
}
