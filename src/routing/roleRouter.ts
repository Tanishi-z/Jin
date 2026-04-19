import type { RequestType, RoleId } from '../types/index.js';

/**
 * 構想の種類に応じて関与するロールを返す（静的フォールバック）。
 *
 * 通常は金（Kin）がオーケストレーターとして動的にルーティングを決定する。
 * LLM未使用時・デモ時・パース失敗時のフォールバックとして使用する。
 * 金は常にオーケストレーターとして最初に動くため、このリストには含まない。
 */
export const ROLE_ROUTING: Record<RequestType, RoleId[]> = {
  // 新規プロジェクト: 全駒が揃って基盤を作る
  new_project: ['gin', 'hisha', 'kaku', 'keima', 'kyosha', 'fu'],

  // 機能追加: UX・実装・品質・データ・ドキュメントが必要
  new_feature: ['gin', 'hisha', 'kaku', 'keima', 'fu'],

  // 既存機能の改善: 実装・品質・ドキュメントを中心に
  improvement: ['hisha', 'kaku', 'fu'],

  // その他: 実装と品質で対応
  other: ['hisha', 'kaku'],
};

/** 静的ルーティングで関与するロールを返す */
export function getRolesForRequest(requestType: RequestType): RoleId[] {
  return ROLE_ROUTING[requestType];
}
