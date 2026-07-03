import { recommendModels } from './specs.js';
import type { SystemSpecs, ModelRecommendation, ModelStrength } from './specs.js';

/**
 * Ollama ライブラリに掲載されているモデルの補足メタデータ。
 * フェッチ結果にこのデータを重ねて ModelRecommendation を生成する。
 * 日本語説明と強み分類の上書きが主な役割（無いモデルはスクレイプ値＋ヒューリスティック）。
 */
const MODEL_META: Record<string, { description: string; requiredRamGB: number; label: string; strength?: ModelStrength }> = {
  // ── Llama ──
  'llama3.2':         { label: 'Llama 3.2 3B',       requiredRamGB: 4,  description: '軽量・高速。RAM 4GB 以上で動作 / Lightweight and fast, 4GB+ RAM', strength: 'light' },
  'llama3.2:1b':      { label: 'Llama 3.2 1B',       requiredRamGB: 2,  description: '超軽量。組み込み用途に / Ultra-lightweight for embedded use', strength: 'light' },
  'llama3.2:3b':      { label: 'Llama 3.2 3B',       requiredRamGB: 4,  description: '軽量・高速 / Lightweight and fast', strength: 'light' },
  'llama3.1':         { label: 'Llama 3.1 8B',       requiredRamGB: 8,  description: 'バランス型 / Best balance of quality and speed', strength: 'balanced' },
  'llama3.1:8b':      { label: 'Llama 3.1 8B',       requiredRamGB: 8,  description: 'バランス型 / Best balance of quality and speed', strength: 'balanced' },
  'llama3.1:70b':     { label: 'Llama 3.1 70B',      requiredRamGB: 40, description: '最高精度 / Highest quality, requires large RAM', strength: 'large' },
  'llama3.3':         { label: 'Llama 3.3 70B',      requiredRamGB: 40, description: '最新大規模モデル / Latest large-scale model', strength: 'large' },
  'llama4':           { label: 'Llama 4 Scout',      requiredRamGB: 20, description: 'Meta最新MoEモデル / Meta\'s latest MoE model', strength: 'large' },
  // ── Phi ──
  'phi4':             { label: 'Phi-4 14B',          requiredRamGB: 8,  description: 'Microsoft製・高品質 / High quality by Microsoft', strength: 'balanced' },
  'phi4-mini':        { label: 'Phi-4 Mini',         requiredRamGB: 4,  description: 'Microsoft製・小型高精度 / Small but high quality by Microsoft', strength: 'light' },
  'phi3':             { label: 'Phi-3 Medium',       requiredRamGB: 8,  description: 'Microsoft製バランス型 / Balanced by Microsoft', strength: 'balanced' },
  'phi3.5':           { label: 'Phi-3.5 Mini',       requiredRamGB: 4,  description: 'Microsoft製軽量 / Lightweight by Microsoft', strength: 'light' },
  // ── Gemma ──
  'gemma3':           { label: 'Gemma 3 4B',         requiredRamGB: 8,  description: 'Google製・高精度 / High quality by Google', strength: 'balanced' },
  'gemma3:4b':        { label: 'Gemma 3 4B',         requiredRamGB: 8,  description: 'Google製・高精度 / High quality by Google', strength: 'balanced' },
  'gemma3:12b':       { label: 'Gemma 3 12B',        requiredRamGB: 16, description: 'Google製・上位精度 / Premium quality by Google', strength: 'balanced' },
  'gemma3:27b':       { label: 'Gemma 3 27B',        requiredRamGB: 24, description: 'Google製・最高精度 / Highest quality by Google', strength: 'large' },
  'gemma2':           { label: 'Gemma 2 9B',         requiredRamGB: 8,  description: 'Google製 / By Google', strength: 'balanced' },
  // ── Qwen ──
  'qwen2.5':          { label: 'Qwen 2.5 7B',        requiredRamGB: 8,  description: 'Alibaba製・日本語良好 / Good Japanese support by Alibaba', strength: 'balanced' },
  'qwen2.5:7b':       { label: 'Qwen 2.5 7B',        requiredRamGB: 8,  description: 'Alibaba製・日本語良好 / Good Japanese support by Alibaba', strength: 'balanced' },
  'qwen2.5:14b':      { label: 'Qwen 2.5 14B',       requiredRamGB: 16, description: 'Alibaba製・高精度 / High quality by Alibaba', strength: 'balanced' },
  'qwen2.5:32b':      { label: 'Qwen 2.5 32B',       requiredRamGB: 20, description: 'Alibaba製・大規模 / Large model by Alibaba', strength: 'large' },
  'qwen2.5:72b':      { label: 'Qwen 2.5 72B',       requiredRamGB: 48, description: 'Alibaba製・最大 / Largest by Alibaba', strength: 'large' },
  'qwen2.5-coder':    { label: 'Qwen 2.5 Coder 7B',  requiredRamGB: 8,  description: 'コード特化 / Code-specialized', strength: 'coding' },
  'qwen3':            { label: 'Qwen 3 8B',          requiredRamGB: 8,  description: 'Alibaba最新・思考モード対応 / Alibaba latest with thinking mode', strength: 'reasoning' },
  'qwen3:8b':         { label: 'Qwen 3 8B',          requiredRamGB: 8,  description: 'Alibaba最新・思考モード対応 / Latest Alibaba with thinking mode', strength: 'reasoning' },
  'qwen3:14b':        { label: 'Qwen 3 14B',         requiredRamGB: 16, description: 'Alibaba最新・高精度 / Latest Alibaba, high quality', strength: 'reasoning' },
  'qwen3:30b-a3b':    { label: 'Qwen 3 30B-A3B MoE', requiredRamGB: 16, description: 'MoEで高効率 / High efficiency with MoE', strength: 'reasoning' },
  'qwen3:32b':        { label: 'Qwen 3 32B',         requiredRamGB: 20, description: 'Alibaba最新・大規模 / Latest Alibaba, large', strength: 'large' },
  // ── DeepSeek ──
  'deepseek-r1':      { label: 'DeepSeek-R1 7B',     requiredRamGB: 8,  description: '推論特化 / Reasoning-specialized', strength: 'reasoning' },
  'deepseek-r1:7b':   { label: 'DeepSeek-R1 7B',     requiredRamGB: 8,  description: '推論特化 / Reasoning-specialized', strength: 'reasoning' },
  'deepseek-r1:14b':  { label: 'DeepSeek-R1 14B',    requiredRamGB: 16, description: '推論特化・高精度 / High-quality reasoning', strength: 'reasoning' },
  'deepseek-r1:32b':  { label: 'DeepSeek-R1 32B',    requiredRamGB: 20, description: '大規模推論モデル / Large reasoning model', strength: 'reasoning' },
  'deepseek-v3':      { label: 'DeepSeek V3 671B',   requiredRamGB: 80, description: '超大規模推論 / Massive reasoning model', strength: 'large' },
  // ── Mistral ──
  'mistral':          { label: 'Mistral 7B',          requiredRamGB: 8,  description: '高速・高精度 / Fast and high quality', strength: 'balanced' },
  'mistral-small3.1': { label: 'Mistral Small 3.1',   requiredRamGB: 16, description: 'Mistral最新小型 / Latest small Mistral', strength: 'balanced' },
  'mistral-nemo':     { label: 'Mistral Nemo 12B',    requiredRamGB: 16, description: '多言語対応 / Multilingual support', strength: 'balanced' },
  // ── その他 ──
  'nomic-embed-text': { label: 'Nomic Embed Text',    requiredRamGB: 2,  description: 'テキスト埋め込み / Text embedding' },
  'mxbai-embed-large':{ label: 'mxbai-embed-large',   requiredRamGB: 2,  description: 'テキスト埋め込み・高品質 / High-quality text embedding' },
  'command-r':        { label: 'Command R 35B',        requiredRamGB: 20, description: 'RAG特化 / Optimized for RAG', strength: 'large' },
  'aya':              { label: 'Aya 35B',              requiredRamGB: 20, description: '多言語特化 / Multilingual specialized', strength: 'large' },
};

// ── スクレイパー ──────────────────────────────────────────────────────────────

/** ollama.com 検索ページの1モデル分の抽出結果 */
interface ScrapedModel {
  name: string;
  description: string;
  /** パラメータサイズ（B単位の数値、昇順。例 [0.8, 2, 4, 9, 27]） */
  sizesB: number[];
  /** サイズタグの原文（数値と同順。例 ['0.8b', '2b', ...]） */
  sizeTags: string[];
  capabilities: string[];
  pulls: string;
}

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
 * ollama.com/search（featured）からモデル情報を構造化して抽出する。
 * 抽出0件（HTML構造変化）の場合は throw し、呼び出し側でフォールバックさせる。
 */
async function fetchFeaturedModels(): Promise<ScrapedModel[]> {
  const res = await fetch('https://ollama.com/search?sort=featured', {
    signal: AbortSignal.timeout(6000),
    headers: { 'User-Agent': 'jin-cli/0.1.0' },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);

  const html = await res.text();
  const chunks = html.split(/<li\s+x-test-model/).slice(1);
  const models: ScrapedModel[] = [];

  for (const chunk of chunks) {
    const name = chunk.match(/href="\/library\/([a-z0-9._-]+)"/)?.[1];
    if (!name) continue;

    const description = decodeEntities(
      chunk.match(/<p class="max-w-lg break-words[^"]*">\s*([^<]*?)\s*<\/p>/)?.[1] ?? '',
    );

    // サイズタグ: '9b' '0.8b' '335m' 等のみ採用（'e2b' 等の変則は除外）
    const sizesB: number[] = [];
    const sizeTags: string[] = [];
    for (const m of chunk.matchAll(/<span[^>]*x-test-size[^>]*>\s*([^<]+?)\s*<\/span>/g)) {
      const tag = m[1].toLowerCase();
      const sm = tag.match(/^(\d+(?:\.\d+)?)([bm])$/);
      if (!sm) continue;
      const value = sm[2] === 'm' ? Number(sm[1]) / 1000 : Number(sm[1]);
      sizesB.push(value);
      sizeTags.push(tag);
    }
    // 昇順に整列（タグも同順を維持）
    const order = sizesB.map((_, i) => i).sort((a, b) => sizesB[a] - sizesB[b]);
    const sortedSizes = order.map((i) => sizesB[i]);
    const sortedTags  = order.map((i) => sizeTags[i]);

    const capabilities = [...chunk.matchAll(/<span[^>]*x-test-capability[^>]*>\s*([^<]+?)\s*<\/span>/g)]
      .map((m) => m[1].toLowerCase());

    const pulls = chunk.match(/<span[^>]*x-test-pull-count[^>]*>\s*([^<]+?)\s*<\/span>/)?.[1] ?? '';

    models.push({ name, description, sizesB: sortedSizes, sizeTags: sortedTags, capabilities, pulls });
  }

  if (models.length === 0) throw new Error('モデル情報を抽出できませんでした');
  return models;
}

// ── サイズ→RAM推定・強み分類 ─────────────────────────────────────────────────

/** パラメータ数（B）から必要RAM（GB）の目安を推定する（Q4量子化＋KVキャッシュ想定） */
export function estimateRamGB(sizeB: number): number {
  const table: Array<[number, number]> = [
    [1, 2], [4, 8], [9, 12], [14, 16], [32, 32], [40, 40], [70, 64], [120, 96],
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
function classifyStrength(m: ScrapedModel, selectedSizeB: number | null): ModelStrength {
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

/** チャット用途に使えないモデル（埋め込み等）を除外する */
function isUsableForChat(m: ScrapedModel): boolean {
  if (m.capabilities.includes('embedding')) return false;
  if (/\bembed(ding)?\b/i.test(`${m.name} ${m.description}`)) return false;
  return true;
}

// ── 公開 API ──────────────────────────────────────────────────────────────────

/**
 * Ollama ライブラリから最新の注目モデルを取得し、スペックでフィルタして返す。
 * 各モデルは effectiveRam に収まる最大パラメータサイズを選び `name:27b` 形式にする。
 * ネットワークエラー・抽出失敗時は静的リストにフォールバックする。
 *
 * @returns フェッチ成功かどうかと推奨モデルリスト
 */
export async function fetchOllamaModels(
  specs: SystemSpecs,
): Promise<{ fromWeb: boolean; models: ModelRecommendation[] }> {
  // Apple SiliconはGPU統合メモリのため1段階上のモデルまで推奨（現行ロジック維持）
  const effectiveRam = specs.isAppleSilicon ? specs.ramGB * 1.2 : specs.ramGB;

  try {
    const scraped = await fetchFeaturedModels();
    const models: ModelRecommendation[] = [];

    for (const m of scraped) {
      if (!isUsableForChat(m)) continue;

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

    if (models.length === 0) throw new Error('RAM要件を満たすモデルがありません');

    // featured は約20件のキュレーションのみで、RAMフィルタ後は候補が痩せやすい。
    // 実績のある静的推奨リスト（日本語説明付き）をマージして選択肢を補う。
    const seenBases = new Set(models.map((m) => m.name.split(':')[0]));
    for (const s of recommendModels(specs)) {
      if (seenBases.has(s.name.split(':')[0])) continue;
      models.push(s);
    }

    return { fromWeb: true, models };
  } catch {
    // フォールバック：静的推奨リスト
    return { fromWeb: false, models: recommendModels(specs) };
  }
}
