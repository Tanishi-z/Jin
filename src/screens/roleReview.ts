import { select, note } from '@clack/prompts';
import chalk from 'chalk';
import { getLocale } from '../locale/index.js';
import type { Mode, RoleId, Proposal, NextScreen } from '../types/index.js';

export async function roleReview(
  mode: Mode,
  roleId: RoleId,
  proposal: Proposal,
): Promise<NextScreen> {
  const t = getLocale(mode);
  const roleName = t.roleReview.names[roleId];
  const output = proposal.roles[roleId];
  if (!output) return { screen: 'proposalReady', proposal };

  const body = output.sections
    .map((s) => `${chalk.bold(s.label)}\n${s.body}`)
    .join('\n\n');

  note(body, roleName);

  const action = await select({
    message: '',
    options: [
      { value: 'apply', label: t.roleReview.actions.apply },
      { value: 'back',  label: t.roleReview.actions.back },
    ],
  });

  if (typeof action === 'symbol') return { screen: 'proposalReady', proposal };

  switch (action) {
    case 'apply':
      return { screen: 'docPreview', proposal };
    default:
      return { screen: 'proposalReady', proposal };
  }
}
