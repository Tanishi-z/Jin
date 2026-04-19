import { select, note } from '@clack/prompts';
import chalk from 'chalk';
import { getLocale } from '../locale/index.js';
import { isDemoMode } from '../demo/state.js';
import { updateProjectContext } from '../context/index.js';
import { writeProposalFiles } from '../activity/fileWriter.js';
import type { Mode, Proposal, NextScreen } from '../types/index.js';

/** 提案から仕様差分のプレビューテキストを生成する（モック） */
function buildSpecPreview(proposal: Proposal, isJa: boolean): string {
  const path = isJa ? 'specs/features/' : 'specs/features/';
  const header = isJa
    ? `${path}（構想に関連するファイル）に追記:\n`
    : `Append to ${path}(related feature file):\n`;

  const lines = proposal.summary.map((line) => `  + ${line}`).join('\n');
  return chalk.dim(header) + lines;
}

/** 提案から手順一覧のプレビューテキストを生成する（モック） */
function buildTaskPreview(proposal: Proposal, isJa: boolean): string {
  const path = 'tasks/backlog.md';
  const header = isJa
    ? `${path} に追記:\n`
    : `Append to ${path}:\n`;

  // 飛車・歩の手順セクションを抽出、なければサマリーから生成
  const hishaOutput = proposal.roles['hisha'];
  const fuOutput    = proposal.roles['fu'];

  let tasks: string[] = [];

  if (fuOutput) {
    const taskSection = fuOutput.sections.find((s) =>
      s.label.includes('手順') || s.label.toLowerCase().includes('step'),
    );
    if (taskSection) {
      tasks = taskSection.body.split('\n').map((line) => `  - [ ] ${line.replace(/^[①-⑦]\s*/, '')}`);
    }
  } else if (hishaOutput) {
    const taskSection = hishaOutput.sections.find((s) =>
      s.label.includes('手順') || s.label.toLowerCase().includes('step'),
    );
    if (taskSection) {
      tasks = taskSection.body.split('\n').map((line) => `  - [ ] ${line.replace(/^[①-⑦]\s*/, '')}`);
    }
  }

  if (tasks.length === 0) {
    tasks = proposal.summary.map((line) => `  - [ ] ${line}`);
  }

  return chalk.dim(header) + tasks.join('\n');
}

/** 提案から決定事項のプレビューテキストを生成する（モック） */
function buildDecisionPreview(proposal: Proposal, isJa: boolean): string {
  const today = new Date().toISOString().split('T')[0];
  const path  = `decisions/${today}.md`;
  const header = isJa
    ? `${path} に記録:\n`
    : `Record in ${path}:\n`;

  const kinOutput = proposal.roles['kin'];
  const goalText  = kinOutput?.sections[0]?.body ?? proposal.summary[0] ?? '';

  const content = isJa
    ? `  ## ${proposal.requestText}\n  決定: ${goalText}`
    : `  ## ${proposal.requestText}\n  Decision: ${goalText}`;

  return chalk.dim(header) + content;
}

export async function docPreview(mode: Mode, proposal: Proposal): Promise<NextScreen> {
  const t    = getLocale(mode);
  const isJa = mode === 'ja';

  console.log('');
  console.log(chalk.bold(t.docPreview.title));
  console.log('');

  // 3種のドキュメントプレビューを順番に表示
  note(buildSpecPreview(proposal, isJa),   t.docPreview.specTitle);
  note(buildTaskPreview(proposal, isJa),   t.docPreview.taskTitle);
  note(buildDecisionPreview(proposal, isJa), t.docPreview.decisionTitle);

  const action = await select({
    message: '',
    options: [
      { value: 'apply',  label: t.docPreview.actions.apply },
      { value: 'revise', label: t.docPreview.actions.revise },
      { value: 'later',  label: t.docPreview.actions.later },
    ],
  });

  if (typeof action === 'symbol') return { screen: 'proposalReady', proposal };

  switch (action) {
    case 'apply': {
      if (isDemoMode()) {
        console.log('');
        console.log(chalk.dim(
          isJa
            ? 'デモモードのため、ドキュメントの保存はスキップされました。'
            : 'Demo mode: document saves are skipped.',
        ));
      } else {
        try {
          const written = writeProposalFiles(proposal, isJa);
          updateProjectContext(proposal, isJa);
          console.log('');
          for (const p of written.specs) {
            console.log(chalk.dim(`  ✓ ${p}`));
          }
          if (written.tasks)    console.log(chalk.dim(`  ✓ ${written.tasks}`));
          if (written.decision) console.log(chalk.dim(`  ✓ ${written.decision}`));
          console.log(chalk.dim(`  ✓ .jin/context.md`));
        } catch (err) {
          console.log(chalk.yellow(
            isJa
              ? `  ⚠ ファイル書き出しに失敗しました: ${String(err)}`
              : `  ⚠ Failed to write files: ${String(err)}`,
          ));
        }
      }
      return { screen: 'applied' };
    }
    case 'revise':
      return { screen: 'requestInput', requestType: proposal.requestType };
    default:
      return { screen: 'requestTypeSelect' };
  }
}
