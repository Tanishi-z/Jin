import { recommendModels } from './specs.js';
import type { SystemSpecs, ModelRecommendation } from './specs.js';

/**
 * Ollama ライブラリに掲載されているモデルの補足メタデータ。
 * フェッチ結果にこのデータを重ねて ModelRecommendation を生成する。
 */
const MODEL_META: Record<string, { description: string; requiredRamGB: number; label: string }> = {
  // ── Llama ──
  'llama3.2':         { label: 'Llama 3.2 3B',       requiredRamGB: 4,  description: '軽量・高速。RAM 4GB 以上で動作 / Lightweight and fast, 4GB+ RAM' },
  'llama3.2:1b':      { label: 'Llama 3.2 1B',       requiredRamGB: 2,  description: '超軽量。組み込み用途に / Ultra-lightweight for embedded use' },
  'llama3.2:3b':      { label: 'Llama 3.2 3B',       requiredRamGB: 4,  description: '軽量・高速 / Lightweight and fast' },
  'llama3.1':         { label: 'Llama 3.1 8B',       requiredRamGB: 8,  description: 'バランス型 / Best balance of quality and speed' },
  'llama3.1:8b':      { label: 'Llama 3.1 8B',       requiredRamGB: 8,  description: 'バランス型 / Best balance of quality and speed' },
  'llama3.1:70b':     { label: 'Llama 3.1 70B',      requiredRamGB: 40, description: '最高精度 / Highest quality, requires large RAM' },
  'llama3.3':         { label: 'Llama 3.3 70B',      requiredRamGB: 40, description: '最新大規模モデル / Latest large-scale model' },
  'llama4':           { label: 'Llama 4 Scout',      requiredRamGB: 20, description: 'Meta最新MoEモデル / Meta\'s latest MoE model' },
  // ── Phi ──
  'phi4':             { label: 'Phi-4 14B',          requiredRamGB: 8,  description: 'Microsoft製・高品質 / High quality by Microsoft' },
  'phi4-mini':        { label: 'Phi-4 Mini',         requiredRamGB: 4,  description: 'Microsoft製・小型高精度 / Small but high quality by Microsoft' },
  'phi3':             { label: 'Phi-3 Medium',       requiredRamGB: 8,  description: 'Microsoft製バランス型 / Balanced by Microsoft' },
  'phi3.5':           { label: 'Phi-3.5 Mini',       requiredRamGB: 4,  description: 'Microsoft製軽量 / Lightweight by Microsoft' },
  // ── Gemma ──
  'gemma3':           { label: 'Gemma 3 4B',         requiredRamGB: 8,  description: 'Google製・高精度 / High quality by Google' },
  'gemma3:4b':        { label: 'Gemma 3 4B',         requiredRamGB: 8,  description: 'Google製・高精度 / High quality by Google' },
  'gemma3:12b':       { label: 'Gemma 3 12B',        requiredRamGB: 16, description: 'Google製・上位精度 / Premium quality by Google' },
  'gemma3:27b':       { label: 'Gemma 3 27B',        requiredRamGB: 24, description: 'Google製・最高精度 / Highest quality by Google' },
  'gemma2':           { label: 'Gemma 2 9B',         requiredRamGB: 8,  description: 'Google製 / By Google' },
  // ── Qwen ──
  'qwen2.5':          { label: 'Qwen 2.5 7B',        requiredRamGB: 8,  description: 'Alibaba製・日本語良好 / Good Japanese support by Alibaba' },
  'qwen2.5:7b':       { label: 'Qwen 2.5 7B',        requiredRamGB: 8,  description: 'Alibaba製・日本語良好 / Good Japanese support by Alibaba' },
  'qwen2.5:14b':      { label: 'Qwen 2.5 14B',       requiredRamGB: 16, description: 'Alibaba製・高精度 / High quality by Alibaba' },
  'qwen2.5:32b':      { label: 'Qwen 2.5 32B',       requiredRamGB: 20, description: 'Alibaba製・大規模 / Large model by Alibaba' },
  'qwen2.5:72b':      { label: 'Qwen 2.5 72B',       requiredRamGB: 48, description: 'Alibaba製・最大 / Largest by Alibaba' },
  'qwen2.5-coder':    { label: 'Qwen 2.5 Coder 7B',  requiredRamGB: 8,  description: 'コード特化 / Code-specialized' },
  'qwen3':            { label: 'Qwen 3 8B',          requiredRamGB: 8,  description: 'Alibaba最新・思考モード対応 / Alibaba latest with thinking mode' },
  'qwen3:8b':         { label: 'Qwen 3 8B',          requiredRamGB: 8,  description: 'Alibaba最新・思考モード対応 / Latest Alibaba with thinking mode' },
  'qwen3:14b':        { label: 'Qwen 3 14B',         requiredRamGB: 16, description: 'Alibaba最新・高精度 / Latest Alibaba, high quality' },
  'qwen3:30b-a3b':    { label: 'Qwen 3 30B-A3B MoE', requiredRamGB: 16, description: 'MoEで高効率 / High efficiency with MoE' },
  'qwen3:32b':        { label: 'Qwen 3 32B',         requiredRamGB: 20, description: 'Alibaba最新・大規模 / Latest Alibaba, large' },
  // ── DeepSeek ──
  'deepseek-r1':      { label: 'DeepSeek-R1 7B',     requiredRamGB: 8,  description: '推論特化 / Reasoning-specialized' },
  'deepseek-r1:7b':   { label: 'DeepSeek-R1 7B',     requiredRamGB: 8,  description: '推論特化 / Reasoning-specialized' },
  'deepseek-r1:14b':  { label: 'DeepSeek-R1 14B',    requiredRamGB: 16, description: '推論特化・高精度 / High-quality reasoning' },
  'deepseek-r1:32b':  { label: 'DeepSeek-R1 32B',    requiredRamGB: 20, description: '大規模推論モデル / Large reasoning model' },
  'deepseek-v3':      { label: 'DeepSeek V3 671B',   requiredRamGB: 80, description: '超大規模推論 / Massive reasoning model' },
  // ── Mistral ──
  'mistral':          { label: 'Mistral 7B',          requiredRamGB: 8,  description: '高速・高精度 / Fast and high quality' },
  'mistral-small3.1': { label: 'Mistral Small 3.1',   requiredRamGB: 16, description: 'Mistral最新小型 / Latest small Mistral' },
  'mistral-nemo':     { label: 'Mistral Nemo 12B',    requiredRamGB: 16, description: '多言語対応 / Multilingual support' },
  // ── その他 ──
  'nomic-embed-text': { label: 'Nomic Embed Text',    requiredRamGB: 2,  description: 'テキスト埋め込み / Text embedding' },
  'mxbai-embed-large':{ label: 'mxbai-embed-large',   requiredRamGB: 2,  description: 'テキスト埋め込み・高品質 / High-quality text embedding' },
  'command-r':        { label: 'Command R 35B',        requiredRamGB: 20, description: 'RAG特化 / Optimized for RAG' },
  'aya':              { label: 'Aya 35B',              requiredRamGB: 20, description: '多言語特化 / Multilingual specialized' },
};

/** ollama.com/search から featured モデル名を抽出する */
async function fetchFeaturedModelNames(): Promise<string[]> {
  const res = await fetch('https://ollama.com/search?q=&sort=featured', {
    signal: AbortSignal.timeout(6000),
    headers: { 'User-Agent': 'jin-cli/0.1.0' },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);

  const html = await res.text();

  // /library/modelname 形式のリンクからモデル名を抽出
  const names = new Set<string>();
  for (const match of html.matchAll(/href="\/library\/([a-z][a-z0-9._-]*)"/g)) {
    names.add(match[1]!);
  }
  // /username/model 形式（コミュニティモデル）は除外し、ライブラリモデルのみ返す
  return [...names].filter((n) => !n.includes('/'));
}

/**
 * Ollama ライブラリから最新の注目モデルを取得し、スペックでフィルタして返す。
 * ネットワークエラー時は静的リストにフォールバックする。
 *
 * @returns フェッチ成功かどうかと推奨モデルリスト
 */
export async function fetchOllamaModels(
  specs: SystemSpecs,
): Promise<{ fromWeb: boolean; models: ModelRecommendation[] }> {
  const effectiveRam = specs.isAppleSilicon ? specs.ramGB * 1.2 : specs.ramGB;

  try {
    const names = await fetchFeaturedModelNames();
    if (names.length === 0) throw new Error('モデルが見つかりません');

    const models: ModelRecommendation[] = [];

    for (const name of names) {
      // タグなし名でメタデータを検索、なければ基本値を生成
      const meta = MODEL_META[name];
      if (!meta) continue;
      if (meta.requiredRamGB > effectiveRam) continue;

      models.push({
        name,
        label:         meta.label,
        requiredRamGB: meta.requiredRamGB,
        description:   meta.description,
      });
    }

    // メタデータにないモデルも追加（RAM不明なので 8GB 以下の場合のみ採用）
    for (const name of names) {
      if (MODEL_META[name]) continue; // 既に追加済み
      if (effectiveRam < 8) continue; // 不明モデルは最低 8GB 必要と見なす
      models.push({
        name,
        label:         name,
        requiredRamGB: 8,
        description:   isJaLocale() ? '（Ollamaライブラリ最新）' : '(Latest from Ollama library)',
      });
    }

    if (models.length === 0) throw new Error('RAM要件を満たすモデルがありません');

    return { fromWeb: true, models };
  } catch {
    // フォールバック：静的推奨リスト
    return { fromWeb: false, models: recommendModels(specs) };
  }
}

/** Node.js の LANG 環境変数などから日本語ロケールかを簡易判定する */
function isJaLocale(): boolean {
  const lang = process.env['LANG'] ?? process.env['LANGUAGE'] ?? '';
  return lang.toLowerCase().startsWith('ja');
}
