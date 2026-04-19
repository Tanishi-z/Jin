import type { Feature } from '../types/index.js';

/**
 * デモモード用の構想・手順データ。
 * 実際の backlog.md の代わりにメモリ上で提供する。
 */

/** デモ用構想データ（日本語モード） */
const demoFeaturesJa: Feature[] = [
  {
    title: '管理者向けCSV出力',
    description: '管理者のみがデータをCSVでエクスポートできる機能',
    tasks: [
      {
        lineIndex: 0,
        title: 'requireRole ミドルウェアを作成する',
        completed: false,
        featureTitle: '管理者向けCSV出力',
        detail: 'src/middleware/requireRole.ts に実装',
      },
      {
        lineIndex: 1,
        title: 'CSV出力ルートに認可チェックを追加する',
        completed: false,
        featureTitle: '管理者向けCSV出力',
        detail: 'src/routes/export.ts を修正',
      },
      {
        lineIndex: 2,
        title: '非管理者にはボタンを非表示にする',
        completed: false,
        featureTitle: '管理者向けCSV出力',
        detail: 'フロントエンドの条件分岐を追加',
      },
    ],
    pendingCount: 3,
  },
  {
    title: 'ユーザー通知機能',
    description: '操作完了時にメール・プッシュ通知を送る',
    tasks: [
      {
        lineIndex: 10,
        title: '通知サービスのインターフェースを定義する',
        completed: false,
        featureTitle: 'ユーザー通知機能',
        detail: 'src/services/notification.ts',
      },
      {
        lineIndex: 11,
        title: 'メール送信アダプターを実装する',
        completed: false,
        featureTitle: 'ユーザー通知機能',
      },
      {
        lineIndex: 12,
        title: 'プッシュ通知アダプターを実装する',
        completed: false,
        featureTitle: 'ユーザー通知機能',
      },
      {
        lineIndex: 13,
        title: '通知の送信タイミングをテストする',
        completed: false,
        featureTitle: 'ユーザー通知機能',
      },
    ],
    pendingCount: 4,
  },
];

/** デモ用構想データ（グローバルモード） */
const demoFeaturesGlobal: Feature[] = [
  {
    title: 'Admin CSV Export',
    description: 'Allow only admin users to export data as CSV',
    tasks: [
      {
        lineIndex: 0,
        title: 'Create requireRole middleware',
        completed: false,
        featureTitle: 'Admin CSV Export',
        detail: 'Implement in src/middleware/requireRole.ts',
      },
      {
        lineIndex: 1,
        title: 'Add authorization check to CSV export route',
        completed: false,
        featureTitle: 'Admin CSV Export',
        detail: 'Modify src/routes/export.ts',
      },
      {
        lineIndex: 2,
        title: 'Hide export button for non-admin users',
        completed: false,
        featureTitle: 'Admin CSV Export',
        detail: 'Add conditional rendering in the frontend',
      },
    ],
    pendingCount: 3,
  },
  {
    title: 'User Notifications',
    description: 'Send email and push notifications on user actions',
    tasks: [
      {
        lineIndex: 10,
        title: 'Define notification service interface',
        completed: false,
        featureTitle: 'User Notifications',
        detail: 'src/services/notification.ts',
      },
      {
        lineIndex: 11,
        title: 'Implement email adapter',
        completed: false,
        featureTitle: 'User Notifications',
      },
      {
        lineIndex: 12,
        title: 'Implement push notification adapter',
        completed: false,
        featureTitle: 'User Notifications',
      },
      {
        lineIndex: 13,
        title: 'Test notification timing and delivery',
        completed: false,
        featureTitle: 'User Notifications',
      },
    ],
    pendingCount: 4,
  },
];

/** デモ用の完了済み手順を追跡する（メモリ上で管理） */
const completedIndexes = new Set<number>();

export function getDemoFeatures(mode: 'ja' | 'global'): Feature[] {
  const features = mode === 'ja' ? demoFeaturesJa : demoFeaturesGlobal;

  // 完了状態を反映して再構築
  return features.map((f) => {
    const tasks = f.tasks.map((t) => ({
      ...t,
      completed: completedIndexes.has(t.lineIndex),
    }));
    const pendingCount = tasks.filter((t) => !t.completed).length;
    return { ...f, tasks, pendingCount };
  });
}

/** デモモードでの手順完了をメモリ上に記録する */
export function markDemoTaskCompleted(lineIndex: number): void {
  completedIndexes.add(lineIndex);
}

/** デモデータをリセットする（テスト用） */
export function resetDemoData(): void {
  completedIndexes.clear();
}
