import type { RoleId } from '../types/index.js';

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
  /** 優先順位順の推奨モデルキーワード一覧 */
  models:  RoleModelEntry[];
}

/**
 * 各駒の推奨モデル。
 * keyword は installed model 名との前方一致・部分一致で照合する。
 */
export const ROLE_RECOMMENDATIONS: Record<RoleId, RoleRecommendation> = {

  kin: {
    roleId: 'kin',
    nameJa: '金', nameEn: 'Kin',
    descJa: '構想を分析し布陣を決めるオーケストレーター',
    descEn: 'Orchestrator — analyzes vision and decides the formation',
    models: [
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
    models: [
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
    models: [
      { keyword: 'qwen3-coder-30',   reasonJa: 'コード特化30Bで最も詳細な実装計画',    reasonEn: 'Code-specialized 30B for the most detailed plans' },
      { keyword: 'qwen2.5-coder-14', reasonJa: '速度と精度のベストバランス',            reasonEn: 'Best balance of speed and accuracy' },
      { keyword: 'qwen2.5-coder-7',  reasonJa: '高速・軽量で手順分解に十分',           reasonEn: 'Fast and lightweight, sufficient for step breakdown' },
    ],
  },

  kaku: {
    roleId: 'kaku',
    nameJa: '角', nameEn: 'Kaku',
    descJa: 'リスク分析とテスト設計を担う',
    descEn: 'Analyzes risks and designs test coverage',
    models: [
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
    models: [
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
    models: [
      { keyword: 'qwen3.5-9',        reasonJa: '文章整理は軽量モデルで高速に',          reasonEn: 'Fast documentation with lightweight model' },
      { keyword: 'qwen3.5-27',       reasonJa: 'より詳細・正確なドキュメント生成',       reasonEn: 'More detailed and accurate documentation' },
      { keyword: 'gpt-oss-20',       reasonJa: '汎用モデルで読みやすい文書を生成',       reasonEn: 'Readable documentation with general model' },
    ],
  },
};

/**
 * インストール済みモデルの中から、指定した駒への推奨順位を計算する。
 * keyword との前方一致・部分一致でスコアリングする。
 *
 * @returns 推奨スコア付きのインストール済みモデル名リスト（降順）
 */
export function rankModelsForRole(
  roleId:         RoleId,
  installedNames: string[],
): Array<{ name: string; reason: { ja: string; en: string } | null; rank: number }> {
  const rec = ROLE_RECOMMENDATIONS[roleId];

  return installedNames.map((name) => {
    // keyword は 'qwen3.5-27' 形式なので、'qwen3.5:27b' のようなタグ区切りも
    // マッチするようコロンをハイフンに正規化して照合する
    const normalized = name.toLowerCase().replace(/:/g, '-');
    const idx = rec.models.findIndex((m) =>
      normalized.includes(m.keyword.toLowerCase()),
    );
    const entry = idx >= 0 ? rec.models[idx]! : null;
    return {
      name,
      reason: entry ? { ja: entry.reasonJa, en: entry.reasonEn } : null,
      rank:   idx >= 0 ? idx : 999,
    };
  }).sort((a, b) => a.rank - b.rank);
}

/** 駒への推奨割り当て1件（理由付き） */
export interface RecommendedAssignment {
  name:   string;
  reason: { ja: string; en: string } | null;
}

/**
 * インストール済みモデルから各駒への推奨割り当てを計算する。
 * 推奨キーワードにマッチするモデルがあり、かつデフォルトモデルと異なる場合のみ割り当てる。
 */
export function computeRecommendedRoleModels(
  installedNames: string[],
  defaultModel:   string,
): Partial<Record<RoleId, RecommendedAssignment>> {
  const result: Partial<Record<RoleId, RecommendedAssignment>> = {};

  for (const roleId of ROLE_ORDER) {
    const ranked = rankModelsForRole(roleId, installedNames);
    const best   = ranked.find((r) => r.reason !== null);
    if (best && best.name !== defaultModel) {
      result[roleId] = { name: best.name, reason: best.reason };
    }
  }

  return result;
}
