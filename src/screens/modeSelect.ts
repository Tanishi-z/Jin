import { select } from '@clack/prompts';
import { printLogo } from '../logo.js';
import type { Mode, NextScreen } from '../types/index.js';

export async function modeSelect(): Promise<Mode> {
  printLogo();
  console.log('');

  const mode = await select<Mode>({
    message: 'モードを選択してください / Select a mode',
    options: [
      { value: 'ja',     label: '日本語向け' },
      { value: 'global', label: 'Global mode' },
    ],
  });

  // Ctrl+C で終了
  if (typeof mode === 'symbol') process.exit(0);

  return mode;
}
