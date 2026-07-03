import { select, note, text } from '@clack/prompts';
import chalk from 'chalk';
import { getLocale } from '../locale/index.js';
import { isDemoMode } from '../demo/state.js';
import type { Mode, ImplResult, FileChange, Feature, NextScreen } from '../types/index.js';

/** ファイル変更をターミナルで見やすく整形する */
function formatFileChange(change: FileChange): string {
  const header = change.type === 'create'
    ? chalk.green(`+ ${change.path}  [新規作成 / new file]`)
    : change.type === 'delete'
      ? chalk.red(`- ${change.path}  [削除 / deleted]`)
      : chalk.yellow(`~ ${change.path}  [変更 / modified]`);

  if (change.type === 'create') {
    const lines = change.content.split('\n')
      .map((line) => chalk.green(`  + ${line}`))
      .join('\n');
    return `${header}\n${lines}`;
  }

  if (change.type === 'modify' && change.originalContent) {
    const before = change.originalContent.split('\n');
    const after  = change.content.split('\n');
    const diff: string[] = [];

    // 簡易差分（行ベース）
    const maxLen = Math.max(before.length, after.length);
    for (let i = 0; i < maxLen; i++) {
      const bLine = before[i];
      const aLine = after[i];

      if (bLine === aLine) {
        diff.push(chalk.dim(`    ${aLine ?? ''}`));
      } else {
        if (bLine !== undefined) diff.push(chalk.red(`  - ${bLine}`));
        if (aLine !== undefined) diff.push(chalk.green(`  + ${aLine}`));
      }
    }
    return `${header}\n${diff.join('\n')}`;
  }

  return header;
}

export async function diffReview(mode: Mode, result: ImplResult, feature: Feature): Promise<NextScreen> {
  const t    = getLocale(mode);
  const isJa = mode === 'ja';

  console.log('');
  console.log(chalk.bold(t.diffReview.title));
  console.log('');

  // 説明
  note(result.explanation, t.diffReview.explanation);

  // ファイルごとの差分を表示
  for (const change of result.files) {
    note(formatFileChange(change), change.path);
  }

  const action = await select({
    message: '',
    options: [
      { value: 'apply',   label: t.diffReview.actions.apply },
      { value: 'reorder', label: t.diffReview.actions.reorder },
      { value: 'discard', label: t.diffReview.actions.discard },
    ],
  });

  if (typeof action === 'symbol') return { screen: 'taskSelect' };

  switch (action) {
    case 'apply':
      return applyFiles(result, mode);
    case 'reorder': {
      const instruction = await text({
        message: isJa ? '追加の指示を入力してください' : 'Enter additional instructions',
        placeholder: isJa ? '例：エラーメッセージを日本語にしてください' : 'e.g. Add error logging',
      });
      if (typeof instruction === 'symbol' || !instruction.trim()) {
        return { screen: 'diffReview', result, feature };
      }
      // 追加指示付きで再実装する
      return { screen: 'implementing', task: result.task, feature, instruction: instruction.trim() };
    }
    default:
      return { screen: 'taskSelect' };
  }
}

/** ファイルをディスクに書き出す */
async function applyFiles(result: ImplResult, mode: Mode): Promise<NextScreen> {
  // デモモードは実際のファイルを書き込まずにスキップ
  if (isDemoMode()) {
    const msg = mode === 'ja'
      ? chalk.dim('デモモードのため、ファイルへの書き込みはスキップされました。')
      : chalk.dim('Demo mode: file writes are skipped.');
    console.log('');
    console.log(msg);
    return { screen: 'implemented', task: result.task };
  }

  const fs   = await import('fs');
  const path = await import('path');

  for (const change of result.files) {
    const fullPath = path.join(process.cwd(), change.path);
    const dir      = path.dirname(fullPath);

    fs.mkdirSync(dir, { recursive: true });

    if (change.type === 'delete') {
      if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath);
    } else {
      fs.writeFileSync(fullPath, change.content, 'utf-8');
    }
  }

  return { screen: 'implemented', task: result.task };
}
