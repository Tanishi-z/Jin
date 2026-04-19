import type { RoleOutput } from '../types/index.js';

/** 歩（Fu）— ドキュメント・手順整理 */
export const fuOutput: Record<'ja' | 'global', RoleOutput> = {
  ja: {
    roleId: 'fu',
    sections: [
      {
        label: 'ドキュメント更新',
        body: 'API仕様書にCSV出力エンドポイントの認可要件を追記する。管理者向けユーザーガイドにCSV出力手順を追加する。',
      },
      {
        label: '手順一覧',
        body: '① バックエンド: 認可ミドルウェアの実装\n② バックエンド: エンドポイントへの適用\n③ フロントエンド: ロール判定ロジックの追加\n④ フロントエンド: ボタン表示制御の実装\n⑤ テスト: 単体テスト・E2Eテストの作成\n⑥ ドキュメント: API仕様書の更新\n⑦ ドキュメント: ユーザーガイドの更新',
      },
      {
        label: '完了の定義',
        body: 'すべてのテストがパスし、ドキュメントが更新され、コードレビューが完了した状態。',
      },
    ],
  },
  global: {
    roleId: 'fu',
    sections: [
      {
        label: 'Documentation updates',
        body: 'Add authorization requirements to the API spec for the CSV export endpoint. Add CSV export instructions to the admin user guide.',
      },
      {
        label: 'Step list',
        body: '① Backend: implement authorization middleware\n② Backend: apply to the export endpoint\n③ Frontend: add role check logic\n④ Frontend: implement button visibility\n⑤ Testing: write unit and E2E tests\n⑥ Docs: update API spec\n⑦ Docs: update user guide',
      },
      {
        label: 'Definition of done',
        body: 'All tests pass, documentation is updated, and code review is complete.',
      },
    ],
  },
};
