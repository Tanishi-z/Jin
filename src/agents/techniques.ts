/**
 * プロンプトエンジニアリングテクニック
 *
 * A: Chain-of-Thought (CoT) — 全モデル対象
 * A: Few-Shot             — 小型モデル（〜14B）で特に効果的
 * B: Structured Output    — セクション形式の厳密化 + JSON フォールバック
 * B: Context Compression  — 小型モデル向けに分析出力を圧縮して渡す
 * C: Self-Consistency     — 角専用: 3視点で生成 → マージ
 * ReAct                   — 大型モデル（30B〜35B以上）向け推論ループ
 */

import type { JinConfig, RoleId } from '../types/index.js';

// ── モデルサイズ判定 ──────────────────────────────────────────────────────────

/** 大型モデルキーワード（ReAct を有効にするしきい値） */
const LARGE_MODEL_KEYWORDS = ['35b', '30b', '32b', '70b', '72b'];

export function isLargeModel(modelName: string): boolean {
  const lower = modelName.toLowerCase();
  return LARGE_MODEL_KEYWORDS.some((k) => lower.includes(k));
}

/** 駒に割り当てられたモデル名を取得（未設定はデフォルトモデル） */
export function getModelForRole(roleId: RoleId, config: JinConfig): string {
  return config.roleModels?.[roleId] ?? config.localModel ?? '';
}

// ── A: Chain-of-Thought ───────────────────────────────────────────────────────

const COT_PREFIX_JA = `【思考手順】回答前に以下の順で考えてください：
1. 構想の核心と目的を把握する
2. 自分の専門領域から何が重要かを特定する
3. 見落としやすい観点・エッジケースを意識する
4. 上記を踏まえて各セクションを回答する

`;

const COT_PREFIX_EN = `【Thinking process】Before answering, work through:
1. Understand the core intent of the vision
2. Identify what matters most from your domain
3. Consider overlooked angles and edge cases
4. Then write each section based on the above

`;

/** システムプロンプトに CoT 前置きを追加する */
export function withCoT(systemPrompt: string, isJa: boolean): string {
  return (isJa ? COT_PREFIX_JA : COT_PREFIX_EN) + systemPrompt;
}

// ── A: Few-Shot ───────────────────────────────────────────────────────────────

/**
 * ユーザープロンプトに Few-Shot 出力例を付加する。
 * 小型モデルはフォーマット指示を守りにくいため、具体例を見せることで大幅に改善する。
 */
export function withFewShot(userPrompt: string, example: string, isJa: boolean): string {
  const header = isJa
    ? '---\n# 出力例（参考）\n'
    : '---\n# Output example (reference)\n';
  const footer = isJa
    ? '\n---\n# あなたが回答する構想\n'
    : '\n---\n# Vision for your response\n';
  return `${header}${example}${footer}${userPrompt}`;
}

// ── ReAct ─────────────────────────────────────────────────────────────────────

const REACT_INSTRUCTION_JA = `

【推論プロセス（ReAct）】
回答前に <thinking> タグ内で段階的に推論してください。
推論が終わったら <thinking> を閉じ、通常フォーマットで最終回答を出力してください。

例：
<thinking>
まず構想を分解すると…
考慮すべきリスクは…
実装順序は…
</thinking>

## セクション名
最終的な回答内容`;

const REACT_INSTRUCTION_EN = `

【Reasoning Process (ReAct)】
Before answering, reason step by step inside <thinking> tags.
Close the tag, then output your final answer in the standard format.

Example:
<thinking>
Breaking down the vision...
Key risks to consider...
Implementation order...
</thinking>

## Section name
Final answer content`;

/** システムプロンプトに ReAct 指示を追加する（大型モデル向け） */
export function withReAct(systemPrompt: string, isJa: boolean): string {
  return systemPrompt + (isJa ? REACT_INSTRUCTION_JA : REACT_INSTRUCTION_EN);
}

/** ReAct 出力から <thinking>...</thinking> ブロックを除去する */
export function stripThinking(text: string): string {
  return text.replace(/<thinking>[\s\S]*?<\/thinking>/gi, '').trim();
}

// ── B: Context Compression ────────────────────────────────────────────────────

/** 小型モデルの文脈窓に収まるよう分析出力を圧縮するしきい値（文字数） */
const COMPRESS_THRESHOLD = 2500;

/**
 * 分析フェーズの出力を実装フェーズへ渡す際、小型モデル向けに圧縮する。
 * 各セクションを最大 200 文字に切り詰め、重要な先頭部分を保持する。
 */
export function compressContext(text: string): string {
  if (text.length <= COMPRESS_THRESHOLD) return text;

  const parts = text.split(/^## /m).filter(Boolean);
  return parts.map((part) => {
    const lines     = part.split('\n');
    const label     = lines[0]?.trim() ?? '';
    const body      = lines.slice(1).join('\n').trim();
    const truncated = body.length > 200
      ? body.slice(0, 200) + '\n…（省略）'
      : body;
    return `## ${label}\n${truncated}`;
  }).join('\n\n');
}

// ── B: Structured Output Parser ───────────────────────────────────────────────

export interface ParsedSection {
  label: string;
  body:  string;
}

/**
 * LLM 出力をセクション配列にパースする。
 * 1. `## ` 区切りのマークダウン形式（通常）
 * 2. JSON 形式（`{"sections": [...]}` — Structured Output モード）
 * 3. 上記が失敗した場合、テキスト全体を1セクションとして返す
 */
export function parseStructuredOutput(roleId: string, text: string): ParsedSection[] {
  // ① JSON 形式を試みる
  const jsonMatch = text.match(/\{[\s\S]*"sections"[\s\S]*\}/);
  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[0]) as { sections?: ParsedSection[] };
      if (Array.isArray(parsed.sections) && parsed.sections.length > 0) {
        return parsed.sections.filter((s) => s.label && s.body);
      }
    } catch { /* JSON パース失敗 → 次の手順へ */ }
  }

  // ② マークダウン `## ` 区切りでパース
  const parts = text.split(/^## /m).filter(Boolean);
  const sections: ParsedSection[] = [];

  for (const part of parts) {
    const lines = part.split('\n');
    const label = lines[0]?.trim() ?? '';
    const body  = lines.slice(1).join('\n').trim();
    if (label && body) sections.push({ label, body });
  }

  if (sections.length > 0) return sections;

  // ③ フォールバック: テキスト全体を1セクション
  return [{ label: roleId, body: text.trim() }];
}

// ── C: Self-Consistency（角専用） ─────────────────────────────────────────────

/**
 * 3 つの専門視点で角を呼び出し、結果をマージする。
 * 各視点のリスク・テスト項目を Union して網羅性を高める。
 *
 * @param callFn  - (extraContext: string) => Promise<string> の形の呼び出し関数
 * @param isJa    - ロケールフラグ
 */
export async function runSelfConsistency(
  callFn: (extraContext: string) => Promise<string>,
  isJa: boolean,
): Promise<string> {
  const perspectives = isJa
    ? [
        '【視点1: セキュリティ】脅威・認可不備・データ漏洩の観点を中心に分析してください。',
        '【視点2: パフォーマンス】負荷・ボトルネック・スケーラビリティの観点を中心に分析してください。',
        '【視点3: テスト・回帰】テスト漏れ・エッジケース・既存機能への影響を中心に分析してください。',
      ]
    : [
        '[Perspective 1: Security] Focus on threats, authorization gaps, and data exposure.',
        '[Perspective 2: Performance] Focus on load, bottlenecks, and scalability.',
        '[Perspective 3: Testing] Focus on test gaps, edge cases, and regression risks.',
      ];

  // 3視点を並行呼び出し
  const results = await Promise.all(perspectives.map((p) => callFn(p)));

  return mergeConsistencyResults(results, isJa);
}

/** 複数の生成結果をセクションごとにマージ（箇条書き項目の Union） */
function mergeConsistencyResults(results: string[], isJa: boolean): string {
  // セクションラベル → 項目セット
  const sectionMap = new Map<string, Set<string>>();
  // セクションの出現順を保持
  const sectionOrder: string[] = [];

  for (const result of results) {
    const parts = result.split(/^## /m).filter(Boolean);
    for (const part of parts) {
      const lines = part.split('\n');
      const label = lines[0]?.trim() ?? '';
      const body  = lines.slice(1).join('\n').trim();
      if (!label) continue;

      if (!sectionMap.has(label)) {
        sectionMap.set(label, new Set());
        sectionOrder.push(label);
      }

      // 箇条書き行を個別追加（重複は Set が除去）
      const items = body
        .split('\n')
        .map((l) => l.trim())
        .filter((l) => l.startsWith('-') || l.startsWith('*') || l.match(/^\d+\./));

      if (items.length > 0) {
        for (const item of items) sectionMap.get(label)!.add(item);
      } else {
        // 箇条書きでない場合は文章ごと追加
        for (const line of body.split('\n').filter(Boolean)) {
          sectionMap.get(label)!.add(line.trim());
        }
      }
    }
  }

  // マージ結果を構築
  const merged: string[] = [
    isJa
      ? `## マージ情報\n3視点（セキュリティ・パフォーマンス・テスト）の結果をマージしています`
      : `## Merge info\nResults merged from 3 perspectives (security, performance, testing)`,
  ];

  for (const label of sectionOrder) {
    const items = sectionMap.get(label)!;
    if (items.size > 0) {
      merged.push(`## ${label}\n${[...items].join('\n')}`);
    }
  }

  return merged.join('\n\n');
}
