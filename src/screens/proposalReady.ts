import { select } from '@clack/prompts';
import chalk from 'chalk';
import { getLocale } from '../locale/index.js';
import type { Mode, Proposal, RoleId, NextScreen } from '../types/index.js';

export async function proposalReady(mode: Mode, proposal: Proposal): Promise<NextScreen> {
  const t = getLocale(mode);

  console.log('');
  console.log(chalk.bold(t.proposalReady.title));
  console.log('');

  // 関与したロールのメニュー項目を動的に生成
  const roleOptions = proposal.activeRoles.map((roleId) => ({
    value: roleId,
    label: t.proposalReady.roleLabels[roleId],
  }));

  const options = [
    { value: 'full',   label: t.proposalReady.full },
    ...roleOptions,
    { value: 'revise', label: t.proposalReady.revise },
    { value: 'apply',  label: t.proposalReady.apply },
    { value: 'later',  label: t.proposalReady.later },
  ];

  const choice = await select({ message: '', options });

  if (typeof choice === 'symbol') return { screen: 'requestTypeSelect' };

  switch (choice) {
    case 'full':
      return { screen: 'fullProposal', proposal };
    case 'revise':
      return { screen: 'requestInput', requestType: proposal.requestType };
    case 'apply':
      return { screen: 'docPreview', proposal };
    case 'later':
      return { screen: 'requestTypeSelect' };
    default:
      return { screen: 'roleReview', roleId: choice as RoleId, proposal };
  }
}
