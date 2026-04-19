import { select, note } from '@clack/prompts';
import chalk from 'chalk';
import { getLocale } from '../locale/index.js';
import type { Mode, Proposal, NextScreen } from '../types/index.js';

export async function fullProposal(mode: Mode, proposal: Proposal): Promise<NextScreen> {
  const t = getLocale(mode);

  const summaryText = proposal.summary.map((line) => `• ${line}`).join('\n');
  note(summaryText, t.fullProposal.title);

  const action = await select({
    message: '',
    options: [
      { value: 'apply',  label: t.fullProposal.actions.apply },
      { value: 'revise', label: t.fullProposal.actions.revise },
      { value: 'back',   label: t.fullProposal.actions.back },
    ],
  });

  if (typeof action === 'symbol') return { screen: 'proposalReady', proposal };

  switch (action) {
    case 'apply':
      return { screen: 'docPreview', proposal };
    case 'revise':
      return { screen: 'requestInput', requestType: proposal.requestType };
    default:
      return { screen: 'proposalReady', proposal };
  }
}
