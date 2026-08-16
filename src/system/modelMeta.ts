import type { ModelStrength } from './specs.js';

/**
 * Ollama ライブラリに掲載されているモデルの補足メタデータ。
 * フェッチ結果にこのデータを重ねて ModelRecommendation を生成する。
 * 日本語説明と強み分類の上書きが主な役割（無いモデルはスクレイプ値＋ヒューリスティック）。
 *
 * 手書き専用ファイル。CI（scripts/updateModelCatalog.ts）はこのファイルを一切変更しない。
 * 新しいモデル世代が出た際は、下部に追記する（旧世代のエントリは既にpull済みのユーザーの
 * 表示が壊れるため削除しない）。
 */
export const MODEL_META: Record<string, { description: string; requiredRamGB: number; label: string; strength?: ModelStrength }> = {
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
  // ── その他（旧世代） ──
  'nomic-embed-text': { label: 'Nomic Embed Text',    requiredRamGB: 2,  description: 'テキスト埋め込み / Text embedding' },
  'mxbai-embed-large':{ label: 'mxbai-embed-large',   requiredRamGB: 2,  description: 'テキスト埋め込み・高品質 / High-quality text embedding' },
  'command-r':        { label: 'Command R 35B',        requiredRamGB: 20, description: 'RAG特化 / Optimized for RAG', strength: 'large' },
  'aya':              { label: 'Aya 35B',              requiredRamGB: 20, description: '多言語特化 / Multilingual specialized', strength: 'large' },

  // ── Gemma 4（現行世代） ──
  'gemma4':           { label: 'Gemma 4',            requiredRamGB: 16, description: 'Google製最新・高精度 / Latest high quality by Google', strength: 'balanced' },
  'gemma4:e2b':       { label: 'Gemma 4 E2B',         requiredRamGB: 3,  description: '超軽量・組み込み向け / Ultra-lightweight, embedded use', strength: 'light' },
  'gemma4:e4b':       { label: 'Gemma 4 E4B',         requiredRamGB: 4,  description: '軽量・高速 / Lightweight and fast', strength: 'light' },
  'gemma4:12b':       { label: 'Gemma 4 12B',         requiredRamGB: 16, description: 'Google製・高精度 / High quality by Google', strength: 'balanced' },
  'gemma4:26b':       { label: 'Gemma 4 26B',         requiredRamGB: 32, description: 'Google製・上位精度 / Premium quality by Google', strength: 'large' },
  'gemma4:31b':       { label: 'Gemma 4 31B',         requiredRamGB: 32, description: 'Google製・最高精度 / Highest quality by Google', strength: 'large' },
  // ── Qwen 3.5 / 3.6 / 3.8（現行世代） ──
  'qwen3.5':          { label: 'Qwen 3.5',            requiredRamGB: 12, description: 'Alibaba最新・日本語良好 / Latest Alibaba, good Japanese support', strength: 'balanced' },
  'qwen3.5:0.8b':     { label: 'Qwen 3.5 0.8B',       requiredRamGB: 2,  description: '超軽量 / Ultra-lightweight', strength: 'light' },
  'qwen3.5:2b':       { label: 'Qwen 3.5 2B',         requiredRamGB: 3,  description: '軽量・高速 / Lightweight and fast', strength: 'light' },
  'qwen3.5:4b':       { label: 'Qwen 3.5 4B',         requiredRamGB: 4,  description: '軽量・高速 / Lightweight and fast', strength: 'light' },
  'qwen3.5:9b':       { label: 'Qwen 3.5 9B',         requiredRamGB: 12, description: 'バランス型・日本語良好 / Balanced, good Japanese support', strength: 'balanced' },
  'qwen3.5:27b':      { label: 'Qwen 3.5 27B',        requiredRamGB: 32, description: '高い論理推論力 / Strong logical reasoning', strength: 'reasoning' },
  'qwen3.5:35b':      { label: 'Qwen 3.5 35B (MoE)',  requiredRamGB: 32, description: 'MoEで高効率・幅広い知識 / Efficient MoE with broad knowledge', strength: 'reasoning' },
  'qwen3.6:27b':      { label: 'Qwen 3.6 27B',        requiredRamGB: 32, description: 'Alibaba最新・高精度推論 / Latest Alibaba, high-precision reasoning', strength: 'reasoning' },
  'qwen3.6:35b':      { label: 'Qwen 3.6 35B (MoE)',  requiredRamGB: 32, description: 'Alibaba最新・MoEで高効率 / Latest Alibaba, efficient MoE', strength: 'large' },
  'qwen3.8:27b':      { label: 'Qwen 3.8 27B',        requiredRamGB: 32, description: 'コード・推論で大幅強化 / Substantial gains in coding and reasoning', strength: 'reasoning' },
  // ── Qwen Coder（現行世代） ──
  'qwen3-coder':      { label: 'Qwen 3 Coder',        requiredRamGB: 32, description: 'コード特化・最も詳細な実装計画 / Code-specialized, most detailed plans', strength: 'coding' },
  'qwen3-coder:30b':  { label: 'Qwen 3 Coder 30B',    requiredRamGB: 32, description: 'コード特化30B / Code-specialized 30B', strength: 'coding' },
  'qwen3-coder-next': { label: 'Qwen 3 Coder Next',   requiredRamGB: 16, description: 'コード特化・軽量版 / Code-specialized, lightweight', strength: 'coding' },
  // ── GPT-OSS ──
  'gpt-oss':          { label: 'GPT-OSS',             requiredRamGB: 24, description: '汎用モデルで安定した要件整理 / Solid general-purpose model', strength: 'reasoning' },
  'gpt-oss:20b':      { label: 'GPT-OSS 20B',         requiredRamGB: 24, description: '汎用20Bで安定した要件整理 / Solid general-purpose 20B model', strength: 'reasoning' },
  'gpt-oss:120b':     { label: 'GPT-OSS 120B',        requiredRamGB: 96, description: '汎用大型・高精度 / Large general-purpose, high quality', strength: 'large' },
  // ── Granite（軽量帯を埋める重要枠） ──
  'granite4.1':        { label: 'Granite 4.1',        requiredRamGB: 4,  description: 'IBM製・軽量 / Lightweight by IBM', strength: 'light' },
  'granite4.1:3b':      { label: 'Granite 4.1 3B',     requiredRamGB: 4,  description: 'IBM製・軽量・高速 / Lightweight and fast by IBM', strength: 'light' },
  'granite4.1:8b':      { label: 'Granite 4.1 8B',     requiredRamGB: 8,  description: 'IBM製・バランス型 / Balanced by IBM', strength: 'balanced' },
  'granite4.1:30b':     { label: 'Granite 4.1 30B',    requiredRamGB: 32, description: 'IBM製・大規模 / Large model by IBM', strength: 'large' },
  // ── その他の現行世代 ──
  'ornith:9b':         { label: 'Ornith 9B',           requiredRamGB: 12, description: 'バランス型 / Balanced', strength: 'balanced' },
  'ornith:35b':        { label: 'Ornith 35B',          requiredRamGB: 40, description: '大規模・高精度 / Large, high quality', strength: 'large' },
  'nemotron3:33b':               { label: 'Nemotron 3 33B',                requiredRamGB: 32, description: 'NVIDIA製・推論特化 / Reasoning-focused by NVIDIA', strength: 'reasoning' },
  'nemotron-3.5-lightning:30b':  { label: 'Nemotron 3.5 Lightning 30B',    requiredRamGB: 32, description: 'NVIDIA製30Bミクスチャ / NVIDIA 30B mixture model', strength: 'balanced' },
  'nemotron-3-super:120b':       { label: 'Nemotron 3 Super 120B',         requiredRamGB: 96, description: 'NVIDIA製・超大規模 / Massive model by NVIDIA', strength: 'large' },
  'muse-glimmer:30b':  { label: 'Muse Glimmer 30B',    requiredRamGB: 32, description: '常時稼働向け軽量運用モデル / Always-on lightweight-operation model', strength: 'balanced' },
  'lfm2:24b':          { label: 'LFM2 24B',            requiredRamGB: 24, description: 'バランス型 / Balanced', strength: 'balanced' },
  'mistral-medium-3.5:128b': { label: 'Mistral Medium 3.5 128B', requiredRamGB: 128, description: '大規模・高精度 / Large, high quality', strength: 'large' },
};
