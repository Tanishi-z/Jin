import type { RoleOutput } from '../types/index.js';

/** 角（Kaku）— 品質・影響範囲・リスク */
export const kakuOutput: Record<'ja' | 'global', RoleOutput> = {
  ja: {
    roleId: 'kaku',
    sections: [
      {
        label: 'リスク',
        body: 'ロール判定をフロントエンドのみで行うと、APIへの直接アクセスで権限を迂回できる。バックエンド側でも必ず検証すること。',
      },
      {
        label: '回帰確認',
        body: '既存の一般ユーザー向け機能が影響を受けていないか確認する。CSV出力以外の機能が正常に動作することを検証する。',
      },
      {
        label: 'テスト観点',
        body: '① 管理者: CSV出力成功\n② 一般ユーザー: ボタン非表示\n③ 一般ユーザー: API直接アクセス → 403\n④ 未ログインユーザー: API直接アクセス → 401',
      },
      {
        label: '非機能要件',
        body: 'ロール取得の失敗時はデフォルトで非管理者として扱う（フェイルセーフ）。',
      },
    ],
  },
  global: {
    roleId: 'kaku',
    sections: [
      {
        label: 'Risks',
        body: 'If role checks are frontend-only, direct API calls can bypass permissions. Always enforce checks on the backend as well.',
      },
      {
        label: 'Regression',
        body: 'Verify that existing features for regular users are unaffected. Confirm all non-export functionality works normally.',
      },
      {
        label: 'Test cases',
        body: '① Admin: CSV export succeeds\n② Regular user: button not shown\n③ Regular user: direct API call → 403\n④ Unauthenticated user: direct API call → 401',
      },
      {
        label: 'Non-functional',
        body: 'On role-fetch failure, default to non-admin (fail-safe behavior).',
      },
    ],
  },
};
