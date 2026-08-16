import type { RoleId } from '../types/index.js';
import type { ModelStrength } from '../system/specs.js';
import { strengthOfModelName } from '../system/modelCatalog.js';

/** 駒の表示順（セットアップ・割り当て画面で共通） */
export const ROLE_ORDER: RoleId[] = ['kin', 'gin', 'hisha', 'kaku', 'keima', 'kyosha', 'fu'];

/** 駒ごとの推奨モデル定義 */
export interface RoleModelEntry {
  /** Ollama モデル名のキーワード（前方一致で照合） */
  keyword: string;
  /** この駒にこのモデルが適している理由 */
  reasonJa: string;
  reasonEn: string;
}

export interface RoleRecommendation {
  roleId:  RoleId;
  nameJa:  string;
  nameEn:  string;
  descJa:  string;
  descEn:  string;
  /** 優先順位順の推奨モデルキーワード一覧（tier1: 名指し） */
  models:  RoleModelEntry[];
  /**
   * 強みベースの優先順位（tier2: 安全網）。
   * keyword に一致しない新モデルでも、strengths[0] に一致すれば駒に推奨される。
   * モデル世代が進んでも keyword の手動追記なしに追随できるようにするための仕組み。
   */
  strengths: ModelStrength[];
}

/** tier2（strengthマッチ）時の汎用理由文。駒 × strength の組み合わせで引く */
const STRENGTH_REASONS: Record<RoleId, Partial<Record<ModelStrength, { ja: string; en: string }>>> = {
  kin: {
    reasoning: { ja: '推論に強く要件整理に向く',       en: 'Strong reasoning, suited for requirement analysis' },
    balanced:  { ja: 'バランス型で安定した要件整理',   en: 'Balanced model for stable requirement analysis' },
    large:     { ja: '大規模モデルで多角的に分析',     en: 'Large model for multi-angle analysis' },
  },
  gin: {
    balanced:  { ja: 'バランス型でUX設計に十分',       en: 'Balanced model, sufficient for UX design' },
    light:     { ja: '軽量モデルでUXフローを高速生成', en: 'Fast UX flow generation with a light model' },
    reasoning: { ja: '推論力でエッジケースに対応',     en: 'Reasoning helps cover edge cases' },
  },
  hisha: {
    coding:    { ja: 'コード特化で実装計画の精度が高い', en: 'Code-specialized, precise implementation plans' },
    reasoning: { ja: '推論力でアーキテクチャ設計に対応', en: 'Reasoning helps with architecture design' },
    balanced:  { ja: 'バランス型で手順分解に十分',       en: 'Balanced model, sufficient for step breakdown' },
  },
  kaku: {
    reasoning: { ja: '推論力でリスクの見落としを防ぐ',   en: 'Reasoning helps avoid overlooked risks' },
    coding:    { ja: 'コード観点からの品質リスクに強い', en: 'Strong on code-level quality risks' },
    large:     { ja: '大規模モデルで幅広くリスク網羅',   en: 'Large model, broad risk coverage' },
  },
  keima: {
    reasoning: { ja: '推論力でデータ設計が正確',         en: 'Reasoning yields precise data design' },
    coding:    { ja: 'DBスキーマ・クエリ観点に強い',     en: 'Strong on DB schema and query perspectives' },
    balanced:  { ja: 'バランス型でメトリクス設計に対応', en: 'Balanced model, handles metric design' },
  },
  kyosha: {
    coding:    { ja: 'コード脆弱性の理解が深く認可設計に最適', en: 'Deep code vulnerability understanding for auth design' },
    reasoning: { ja: '推論力で脅威モデリングに対応',           en: 'Reasoning helps with threat modeling' },
    balanced:  { ja: 'バランス型でセキュリティ観点を網羅',     en: 'Balanced model covers security angles' },
  },
  fu: {
    light:     { ja: '軽量モデルで文章整理を高速に',     en: 'Fast documentation with a light model' },
    balanced:  { ja: 'バランス型で正確なドキュメント生成', en: 'Balanced model, accurate documentation' },
    reasoning: { ja: '推論力で読みやすい文書を構成',       en: 'Reasoning helps structure readable documents' },
  },
};

/**
 * 各駒の推奨モデル。
 * keyword は installed model 名との前方一致・部分一致で照合する（tier1）。
 * keyword に一致しない場合は strengths（tier2）でも推奨対象になる。
 */
export const ROLE_RECOMMENDATIONS: Record<RoleId, RoleRecommendation> = {

  kin: {
    roleId: 'kin',
    nameJa: '金', nameEn: 'Kin',
    descJa: '構想を分析し布陣を決めるオーケストレーター',
    descEn: 'Orchestrator — analyzes vision and decides the formation',
    strengths: ['reasoning', 'balanced', 'large'],
    models: [
      { keyword: 'qwen3.8-27',       reasonJa: 'コード・推論の両面で大幅強化された最新モデル', reasonEn: 'Latest model with major gains in coding and reasoning' },
      { keyword: 'qwen3.6-27',       reasonJa: '最新世代の高精度推論で要件を正確に整理',        reasonEn: 'Latest-gen high-precision reasoning for requirements' },
      { keyword: 'qwen3.5-27',       reasonJa: '高い論理推論で要件を正確に整理',        reasonEn: 'Strong reasoning for precise requirements' },
      { keyword: 'qwen3.5-35',       reasonJa: 'MoEで効率的、幅広い知識で多角的に分析', reasonEn: 'MoE efficiency with broad knowledge' },
      { keyword: 'gpt-oss-20',       reasonJa: '汎用20Bで安定した要件整理',             reasonEn: 'Solid general-purpose 20B model' },
      { keyword: 'qwen3.5-9',        reasonJa: '軽量でも十分な文章理解力',               reasonEn: 'Lightweight but sufficient for language tasks' },
    ],
  },

  gin: {
    roleId: 'gin',
    nameJa: '銀', nameEn: 'Gin',
    descJa: 'UI/UX・ユーザー体験の設計を担う',
    descEn: 'Designs UI/UX and user experience',
    strengths: ['balanced', 'light', 'reasoning'],
    models: [
      { keyword: 'gemma4-e4b',       reasonJa: '軽量モデルでUXフローを高速生成',        reasonEn: 'Fast UX flow generation with a lightweight model' },
      { keyword: 'granite4.1-3',     reasonJa: '軽量・高速でUX設計に十分',              reasonEn: 'Lightweight and fast, sufficient for UX design' },
      { keyword: 'qwen3.5-9',        reasonJa: 'UXフロー生成は軽量モデルで高速に',      reasonEn: 'Fast UX flow generation with lightweight model' },
      { keyword: 'qwen3.5-27',       reasonJa: 'より細かいUX設計・エッジケースに対応',  reasonEn: 'Handles detailed UX design and edge cases' },
      { keyword: 'gpt-oss-20',       reasonJa: '汎用モデルで柔軟な体験設計',            reasonEn: 'Flexible experience design with general model' },
    ],
  },

  hisha: {
    roleId: 'hisha',
    nameJa: '飛車', nameEn: 'Hisha',
    descJa: '技術実装・アーキテクチャ計画を担う',
    descEn: 'Plans technical implementation and architecture',
    strengths: ['coding', 'reasoning', 'balanced'],
    models: [
      { keyword: 'qwen3-coder-30',   reasonJa: 'コード特化30Bで最も詳細な実装計画',    reasonEn: 'Code-specialized 30B for the most detailed plans' },
      { keyword: 'qwen3-coder-next', reasonJa: 'コード特化・軽量版で高速に実装計画',    reasonEn: 'Lightweight code-specialized model for fast planning' },
      { keyword: 'qwen2.5-coder-14', reasonJa: '速度と精度のベストバランス',            reasonEn: 'Best balance of speed and accuracy' },
      { keyword: 'qwen2.5-coder-7',  reasonJa: '高速・軽量で手順分解に十分',           reasonEn: 'Fast and lightweight, sufficient for step breakdown' },
    ],
  },

  kaku: {
    roleId: 'kaku',
    nameJa: '角', nameEn: 'Kaku',
    descJa: 'リスク分析とテスト設計を担う',
    descEn: 'Analyzes risks and designs test coverage',
    strengths: ['reasoning', 'coding', 'large'],
    models: [
      { keyword: 'qwen3.8-27',       reasonJa: '最新世代の高い推論力でリスクを見落とさない', reasonEn: 'Latest-gen strong reasoning avoids overlooked risks' },
      { keyword: 'qwen3.5-27',       reasonJa: '高い推論力でリスクの見落としを防ぐ',   reasonEn: 'Strong reasoning prevents overlooked risks' },
      { keyword: 'qwen3.5-35',       reasonJa: '幅広い知識でセキュリティ観点も網羅',   reasonEn: 'Broad knowledge covers security angles too' },
      { keyword: 'qwen3-coder-30',   reasonJa: 'コード観点からの品質リスクに強い',      reasonEn: 'Strong on code-level quality risks' },
      { keyword: 'gpt-oss-20',       reasonJa: '汎用モデルでバランス良くリスク分析',    reasonEn: 'Balanced risk analysis with general model' },
    ],
  },

  keima: {
    roleId: 'keima',
    nameJa: '桂馬', nameEn: 'Keima',
    descJa: 'データモデル・API設計・メトリクスを担う',
    descEn: 'Handles data model, API design, and metrics',
    strengths: ['reasoning', 'coding', 'balanced'],
    models: [
      { keyword: 'qwen3.6-35',       reasonJa: '最新世代のMoEで幅広くデータ設計を網羅', reasonEn: 'Latest-gen MoE with broad data-design coverage' },
      { keyword: 'qwen3.5-35',       reasonJa: 'MoEの幅広い知識でデータ設計を網羅',   reasonEn: 'MoE broad knowledge covers data design' },
      { keyword: 'qwen3.5-27',       reasonJa: '論理推論でメトリクス設計が正確',        reasonEn: 'Logical reasoning for precise metric design' },
      { keyword: 'qwen3-coder-30',   reasonJa: 'DBスキーマ・クエリ観点に強い',          reasonEn: 'Strong on DB schema and query perspectives' },
    ],
  },

  kyosha: {
    roleId: 'kyosha',
    nameJa: '香車', nameEn: 'Kyosha',
    descJa: 'セキュリティ・認可・権限設計を担う',
    descEn: 'Handles security, authorization, and access control',
    strengths: ['coding', 'reasoning', 'balanced'],
    models: [
      { keyword: 'qwen2.5-coder-14', reasonJa: 'コード脆弱性の理解が深く認可設計に最適', reasonEn: 'Deep code vulnerability understanding for auth design' },
      { keyword: 'qwen3-coder-30',   reasonJa: '最も詳細なセキュリティ観点を提供',       reasonEn: 'Provides the most thorough security perspective' },
      { keyword: 'qwen3.5-27',       reasonJa: '論理推論で脅威モデリングに対応',         reasonEn: 'Logical reasoning for threat modeling' },
    ],
  },

  fu: {
    roleId: 'fu',
    nameJa: '歩', nameEn: 'Fu',
    descJa: 'ドキュメントと手順一覧を整備する',
    descEn: 'Organizes documentation and task lists',
    strengths: ['light', 'balanced', 'reasoning'],
    models: [
      { keyword: 'gemma4-e4b',       reasonJa: '軽量モデルで文章整理を高速に',          reasonEn: 'Fast documentation with a lightweight model' },
      { keyword: 'granite4.1-3',     reasonJa: '軽量・高速でドキュメント整理に十分',    reasonEn: 'Lightweight and fast, sufficient for documentation' },
      { keyword: 'qwen3.5-9',        reasonJa: '文章整理は軽量モデルで高速に',          reasonEn: 'Fast documentation with lightweight model' },
      { keyword: 'qwen3.5-27',       reasonJa: 'より詳細・正確なドキュメント生成',       reasonEn: 'More detailed and accurate documentation' },
      { keyword: 'gpt-oss-20',       reasonJa: '汎用モデルで読みやすい文書を生成',       reasonEn: 'Readable documentation with general model' },
    ],
  },
};

/**
 * インストール済みモデルの中から、指定した駒への推奨順位を計算する。
 * tier1: keyword との前方一致・部分一致でスコアリング（現行挙動を保存）。
 * tier2: keyword に一致しないモデルは、strengths[] に一致すれば安全網として順位付けする。
 *        これにより新しいモデル世代でも keyword の手動追記なしに推奨対象になる。
 *
 * @returns 推奨スコア付きのインストール済みモデル名リスト（降順）
 */
export function rankModelsForRole(
  roleId:         RoleId,
  installedNames: string[],
): Array<{ name: string; reason: { ja: string; en: string } | null; rank: number; matchKind: 'keyword' | 'strength' | null }> {
  const rec = ROLE_RECOMMENDATIONS[roleId];

  return installedNames.map((name) => {
    // keyword は 'qwen3.5-27' 形式なので、'qwen3.5:27b' のようなタグ区切りも
    // マッチするようコロンをハイフンに正規化して照合する
    const normalized = name.toLowerCase().replace(/:/g, '-');
    const idx = rec.models.findIndex((m) =>
      normalized.includes(m.keyword.toLowerCase()),
    );

    if (idx >= 0) {
      const entry = rec.models[idx]!;
      return {
        name,
        reason: { ja: entry.reasonJa, en: entry.reasonEn },
        rank: idx,
        matchKind: 'keyword' as const,
      };
    }

    // tier2: strengthベースの安全網
    const strength = strengthOfModelName(name);
    const strengthIdx = strength ? rec.strengths.indexOf(strength) : -1;
    if (strengthIdx >= 0) {
      const reason = STRENGTH_REASONS[roleId][strength!];
      return {
        name,
        reason: reason ?? null,
        rank: 100 + strengthIdx * 10,
        matchKind: 'strength' as const,
      };
    }

    return { name, reason: null, rank: 999, matchKind: null };
  }).sort((a, b) => a.rank - b.rank);
}

/** 駒への推奨割り当て1件（理由付き） */
export interface RecommendedAssignment {
  name:   string;
  reason: { ja: string; en: string } | null;
}

/**
 * インストール済みモデルから各駒への推奨割り当てを計算する。
 * tier1（keyword一致）は常に採用。tier2（strength一致）は駒の最優先強み（strengths[0]）に
 * 一致した場合のみ採用する（過剰な自動割り当てを避けるため）。
 * いずれもデフォルトモデルと異なる場合のみ割り当てる。
 */
export function computeRecommendedRoleModels(
  installedNames: string[],
  defaultModel:   string,
): Partial<Record<RoleId, RecommendedAssignment>> {
  const result: Partial<Record<RoleId, RecommendedAssignment>> = {};

  for (const roleId of ROLE_ORDER) {
    const ranked = rankModelsForRole(roleId, installedNames);
    const rec    = ROLE_RECOMMENDATIONS[roleId];
    const best   = ranked.find((r) => {
      if (r.matchKind === 'keyword') return true;
      if (r.matchKind === 'strength') {
        const strength = strengthOfModelName(r.name);
        return strength === rec.strengths[0];
      }
      return false;
    });
    if (best && best.name !== defaultModel) {
      result[roleId] = { name: best.name, reason: best.reason };
    }
  }

  return result;
}
