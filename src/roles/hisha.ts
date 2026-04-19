import type { RoleOutput } from '../types/index.js';

/** 飛車（Hisha）— 実装計画 */
export const hishaOutput: Record<'ja' | 'global', RoleOutput> = {
  ja: {
    roleId: 'hisha',
    sections: [
      {
        label: 'バックエンド',
        body: 'CSV出力APIエンドポイントに認可ミドルウェアを追加する。管理者ロール以外は403を返す。',
      },
      {
        label: 'フロントエンド',
        body: '一覧画面のツールバーコンポーネントで、現在のユーザーロールを確認し、CSV出力ボタンの表示を切り替える。',
      },
      {
        label: '実装手順',
        body: '① 認可ミドルウェアの実装\n② APIエンドポイントへの適用\n③ フロントエンドのロール取得処理\n④ ボタン表示条件の実装\n⑤ E2Eテストの追加',
      },
      {
        label: '影響範囲',
        body: 'CSV出力APIと一覧画面のみ。既存の認証フローへの変更はなし。',
      },
    ],
  },
  global: {
    roleId: 'hisha',
    sections: [
      {
        label: 'Backend',
        body: 'Add an authorization middleware to the CSV export API endpoint. Return 403 for non-admin roles.',
      },
      {
        label: 'Frontend',
        body: 'In the list screen toolbar component, check the current user role and toggle the export button visibility.',
      },
      {
        label: 'Implementation steps',
        body: '① Implement authorization middleware\n② Apply to the export API endpoint\n③ Add role-fetching logic to frontend\n④ Implement button visibility condition\n⑤ Add E2E tests',
      },
      {
        label: 'Scope',
        body: 'CSV export API and list screen only. No changes to the existing auth flow.',
      },
    ],
  },
};
