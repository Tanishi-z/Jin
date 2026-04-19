import type { RoleOutput } from '../types/index.js';

/** 桂馬（Keima）— データ・計測・分析 */
export const keimaOutput: Record<'ja' | 'global', RoleOutput> = {
  ja: {
    roleId: 'keima',
    sections: [
      {
        label: '計測設計',
        body: 'CSV出力の実行回数・実行者・実行タイミングをログとして記録する。管理者ごとのダウンロード頻度を可視化できるようにする。',
      },
      {
        label: '成功指標',
        body: '管理者によるCSV出力成功率 100%。非管理者からの不正アクセス試行数のトラッキング。',
      },
      {
        label: '分析観点',
        body: 'CSV出力が多用される場合は、ダッシュボード上での集計表示も検討する価値がある。',
      },
    ],
  },
  global: {
    roleId: 'keima',
    sections: [
      {
        label: 'Measurement design',
        body: 'Log each CSV export: who ran it, when, and how often per admin. Make download frequency visible.',
      },
      {
        label: 'Success metrics',
        body: 'CSV export success rate for admins: 100%. Track unauthorized access attempts from non-admins.',
      },
      {
        label: 'Analytics note',
        body: 'If CSV exports are frequent, consider adding an in-app aggregated data view as a follow-up.',
      },
    ],
  },
};
