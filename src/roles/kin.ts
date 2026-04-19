import type { RoleOutput } from '../types/index.js';

/** 金（Kin）— 目的と制約の整理 */
export const kinOutput: Record<'ja' | 'global', RoleOutput> = {
  ja: {
    roleId: 'kin',
    sections: [
      {
        label: '目的',
        body: 'CSV出力機能を管理者のみに制限することで、データの不正な持ち出しを防止する。',
      },
      {
        label: '対象ユーザー',
        body: '管理者ロールを持つユーザーのみ。一般ユーザーはアクセス不可。',
      },
      {
        label: '制約',
        body: '既存の認証・認可の仕組みを活用する。新たな権限モデルの導入は行わない。',
      },
      {
        label: '受け入れ条件',
        body: '管理者はCSV出力ボタンを表示・操作できる。非管理者にはボタンが表示されず、APIへの直接アクセスも拒否される。',
      },
    ],
  },
  global: {
    roleId: 'kin',
    sections: [
      {
        label: 'Goal',
        body: 'Restrict CSV export to admin users only, preventing unauthorized data extraction.',
      },
      {
        label: 'Target users',
        body: 'Users with the admin role only. Regular users will have no access.',
      },
      {
        label: 'Constraints',
        body: 'Leverage the existing auth and authorization system. No new permission model will be introduced.',
      },
      {
        label: 'Acceptance criteria',
        body: 'Admins can see and use the CSV export button. Non-admins cannot see the button, and direct API access is rejected.',
      },
    ],
  },
};
