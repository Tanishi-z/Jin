import type { Feature, RoleId, Task } from '../types/index.js';

/** 実装フェーズを担当できる駒（金はオーケストレーターのため除く） */
export type ImplRoleId = Exclude<RoleId, 'kin'>;

/** キーワード → 担当駒のルーティング表（上から順に評価） */
const KEYWORD_ROUTING: Array<{ pattern: RegExp; roleId: ImplRoleId }> = [
  // 銀: UI / フロントエンド
  { pattern: /UI|画面|コンポーネント|フォーム|ボタン|表示|スタイル|css|フロント|component|form|screen|view|frontend/i, roleId: 'gin' },
  // 桂馬: データモデル / スキーマ
  { pattern: /スキーマ|マイグレーション|テーブル|データモデル|DB|データベース|schema|migration|database|model/i, roleId: 'keima' },
  // 香車: セキュリティ / 認可
  { pattern: /認証|認可|権限|セキュリティ|ログイン|トークン|auth|permission|security|role|login|token/i, roleId: 'kyosha' },
  // 角: テスト / 品質
  { pattern: /テスト|リファクタ|品質|カバレッジ|test|refactor|quality|coverage/i, roleId: 'kaku' },
  // 歩: ドキュメント
  { pattern: /ドキュメント|README|仕様書|手引き|チュートリアル|doc|readme|spec|guide|tutorial/i, roleId: 'fu' },
  // 飛車: API / バックエンド（デフォルト前の明示マッチ）
  { pattern: /API|ルート|エンドポイント|サービス|バックエンド|route|endpoint|service|backend|server/i, roleId: 'hisha' },
];

/**
 * 手順の内容から担当する駒（成り駒として実装する駒）を決定する。
 * タイトル・詳細・構想名のキーワードで判定し、該当なしは飛車が受け持つ。
 */
export function routeTaskToRole(task: Task, feature: Feature): ImplRoleId {
  const haystack = [task.title, task.detail ?? '', feature.title, feature.description ?? ''].join('\n');
  for (const { pattern, roleId } of KEYWORD_ROUTING) {
    if (pattern.test(haystack)) return roleId;
  }
  return 'hisha';
}
