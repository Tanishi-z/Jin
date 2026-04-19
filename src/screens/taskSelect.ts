import { select, note } from '@clack/prompts';
import chalk from 'chalk';
import { getLocale } from '../locale/index.js';
import { loadPendingFeatures } from '../tasks/parser.js';
import type { Mode, Feature, NextScreen } from '../types/index.js';

export async function taskSelect(mode: Mode, preselected?: Feature): Promise<NextScreen> {
  const t        = getLocale(mode);
  const features = loadPendingFeatures();

  if (features.length === 0) {
    note(chalk.yellow(t.taskSelect.empty), mode === 'ja' ? '構想なし' : 'No features');
    return { screen: 'requestTypeSelect' };
  }

  // ── Step 1: 構想を選ぶ ──
  let feature = preselected;
  if (!feature) {
    const featureOptions = [
      ...features.map((f) => ({
        value: f.title,
        label: f.title,
        hint:  `${t.taskSelect.pending(f.pendingCount)}${f.description ? `  ${f.description}` : ''}`,
      })),
      { value: '__back__', label: t.taskSelect.back },
    ];

    const featureChoice = await select({
      message: t.taskSelect.featurePrompt,
      options: featureOptions,
    });

    if (typeof featureChoice === 'symbol' || featureChoice === '__back__') {
      return { screen: 'requestTypeSelect' };
    }

    feature = features.find((f) => f.title === featureChoice);
    if (!feature) return { screen: 'requestTypeSelect' };
  }

  // ── Step 2: 手順を選ぶ ──
  const pending = feature.tasks.filter((t) => !t.completed);

  const taskOptions = [
    ...pending.map((task) => ({
      value: String(task.lineIndex),
      label: task.title,
      hint:  task.detail,
    })),
    { value: '__back__', label: t.taskSelect.back },
  ];

  const taskChoice = await select({
    message: `[${feature.title}]  ${t.taskSelect.taskPrompt}`,
    options: taskOptions,
  });

  if (typeof taskChoice === 'symbol' || taskChoice === '__back__') {
    // 構想選択に戻る
    return { screen: 'taskSelect' };
  }

  const task = pending.find((t) => String(t.lineIndex) === taskChoice);
  if (!task) return { screen: 'taskSelect' };

  return { screen: 'implementing', task, feature };
}
