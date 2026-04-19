import { select, note } from '@clack/prompts';
import chalk from 'chalk';
import { getLocale } from '../locale/index.js';
import { markTaskCompleted, loadPendingFeatures } from '../tasks/parser.js';
import type { Mode, Task, Feature, NextScreen } from '../types/index.js';

export async function implemented(mode: Mode, task: Task): Promise<NextScreen> {
  const t = getLocale(mode);

  // 手順を完了済みに更新
  markTaskCompleted(task);

  note(
    chalk.green(`✓ ${task.title}`),
    chalk.green(t.implemented.title),
  );

  // 同じ構想に未完了手順が残っているか確認
  const features    = loadPendingFeatures();
  const sameFeature = features.find((f) => f.title === task.featureTitle);

  const options = [
    ...(sameFeature
      ? [{ value: 'same', label: mode === 'ja'
          ? `同じ構想の次の手順へ（残り ${sameFeature.pendingCount} 件）`
          : `Next step in "${sameFeature.title}" (${sameFeature.pendingCount} remaining)` }]
      : []),
    { value: 'next',   label: t.implemented.actions.next },
    { value: 'exit',   label: t.implemented.actions.exit },
  ];

  const action = await select({ message: '', options });

  if (typeof action === 'symbol') return { screen: 'exit' };

  switch (action) {
    case 'same':
      return { screen: 'taskSelect', feature: sameFeature };
    case 'next':
      return { screen: 'taskSelect' };
    default:
      return { screen: 'exit' };
  }
}
