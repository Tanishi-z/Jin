import type { RoleOutput } from '../types/index.js';

/** 銀（Gin）— 体験と導線の設計 */
export const ginOutput: Record<'ja' | 'global', RoleOutput> = {
  ja: {
    roleId: 'gin',
    sections: [
      {
        label: 'UI方針',
        body: '非管理者にはCSV出力ボタン自体を表示しない。エラーメッセージではなく、ボタンの非表示で自然に制御する。',
      },
      {
        label: '管理者の操作フロー',
        body: '一覧画面にCSV出力ボタンが表示される → クリックでダウンロード開始 → 完了トーストを表示する。',
      },
      {
        label: 'エッジケース',
        body: 'APIに直接アクセスした場合は403エラーを返す。ユーザーにはわかりやすいエラーページを表示する。',
      },
      {
        label: '変更対象画面',
        body: '一覧画面のツールバー。ボタンの表示・非表示条件をロールで切り替える。',
      },
    ],
  },
  global: {
    roleId: 'gin',
    sections: [
      {
        label: 'UI approach',
        body: 'Hide the CSV export button entirely for non-admin users. Use absence of the control rather than an error message.',
      },
      {
        label: 'Admin flow',
        body: 'Export button appears in the list toolbar → click starts the download → success toast shown on completion.',
      },
      {
        label: 'Edge cases',
        body: 'Direct API calls return a 403 error. A clear error page is shown to the user.',
      },
      {
        label: 'Affected screens',
        body: 'List screen toolbar. Toggle button visibility based on the user role.',
      },
    ],
  },
};
