import { select, note } from '@clack/prompts';
import chalk from 'chalk';
import { getLocale } from '../locale/index.js';
import type { Mode, NextScreen } from '../types/index.js';

export async function applied(mode: Mode): Promise<NextScreen> {
  const t = getLocale(mode);

  const detailText = t.applied.details.map((line) => `✓ ${line}`).join('\n');
  note(detailText, chalk.green(t.applied.title));

  const action = await select({
    message: '',
    options: [
      { value: 'addAnother',  label: t.applied.actions.addAnother },
      { value: 'changeAgent', label: t.applied.actions.changeAgent },
      { value: 'exit',        label: t.applied.actions.exit },
    ],
  });

  if (typeof action === 'symbol') return { screen: 'exit' };

  switch (action) {
    case 'addAnother':
      return { screen: 'requestTypeSelect' };
    case 'changeAgent':
      return { screen: 'localLLMSetup' };
    default:
      return { screen: 'exit' };
  }
}
