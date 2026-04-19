import fs from 'fs';
import path from 'path';
import type { Proposal } from '../types/index.js';
import { markLastApplied } from './writer.js';
import { runHooks } from '../hooks/runner.js';

const JIN_DIR = path.join(process.cwd(), '.jin');

/**
 * 提案の反映時に仕様・タスク・決定事項を .jin/ 配下に書き出す。
 * デモモードの制御は呼び出し元で行う。
 */
export function writeProposalFiles(proposal: Proposal, isJa: boolean): WrittenFiles {
  const written: WrittenFiles = { specs: [], tasks: null, decision: null };

  // pre-apply フック
  runHooks('pre-apply', {
    JIN_REQUEST_TYPE: proposal.requestType,
    JIN_REQUEST_TEXT: proposal.requestText,
  });

  // ── 仕様ファイル ──────────────────────────────────────────────────────────
  const specsDir = path.join(JIN_DIR, 'specs', 'features');
  fs.mkdirSync(specsDir, { recursive: true });

  const slug      = slugify(proposal.requestText);
  const specPath  = path.join(specsDir, `${slug}.md`);
  const specLines = buildSpecContent(proposal, isJa);
  fs.writeFileSync(specPath, specLines, 'utf-8');
  written.specs.push(specPath);

  // ── タスク（backlog.md に追記） ───────────────────────────────────────────
  const tasksDir  = path.join(JIN_DIR, 'tasks');
  const backlog   = path.join(tasksDir, 'backlog.md');
  fs.mkdirSync(tasksDir, { recursive: true });

  const taskBlock = buildTaskBlock(proposal, isJa);
  fs.appendFileSync(backlog, taskBlock, 'utf-8');
  written.tasks = backlog;

  // ── 決定事項 ──────────────────────────────────────────────────────────────
  const decisionsDir = path.join(JIN_DIR, 'decisions');
  fs.mkdirSync(decisionsDir, { recursive: true });

  const today        = new Date().toISOString().split('T')[0]!;
  const decisionPath = path.join(decisionsDir, `${today}-${slug}.md`);
  const decisionContent = buildDecisionContent(proposal, isJa);
  fs.writeFileSync(decisionPath, decisionContent, 'utf-8');
  written.decision = decisionPath;

  // activity.json の最後のエントリを applied: true に更新
  try { markLastApplied(); } catch { /* 無視 */ }

  // post-apply フック
  runHooks('post-apply', {
    JIN_REQUEST_TYPE: proposal.requestType,
    JIN_REQUEST_TEXT: proposal.requestText,
    JIN_SPEC_PATH:    written.specs[0] ?? '',
    JIN_TASK_PATH:    written.tasks    ?? '',
    JIN_DECISION_PATH: written.decision ?? '',
  });

  return written;
}

export interface WrittenFiles {
  specs:    string[];
  tasks:    string | null;
  decision: string | null;
}

// ── 内部ビルダー ──────────────────────────────────────────────────────────────

function buildSpecContent(proposal: Proposal, isJa: boolean): string {
  const heading = isJa
    ? `# ${proposal.requestText}\n\n`
    : `# ${proposal.requestText}\n\n`;

  const sections = proposal.activeRoles
    .flatMap((roleId) => {
      const output = proposal.roles[roleId];
      if (!output) return [];
      return output.sections.map((s) => `## ${s.label}\n\n${s.body}`);
    })
    .join('\n\n---\n\n');

  const meta = isJa
    ? `\n\n---\n\n*生成日: ${new Date().toISOString()}*\n`
    : `\n\n---\n\n*Generated: ${new Date().toISOString()}*\n`;

  return heading + sections + meta;
}

function buildTaskBlock(proposal: Proposal, isJa: boolean): string {
  const header = isJa
    ? `\n## ${proposal.requestText}\n\n`
    : `\n## ${proposal.requestText}\n\n`;

  // 歩 → 飛車 の順で手順セクションを探す
  let tasks: string[] = [];
  for (const roleId of ['fu', 'hisha'] as const) {
    const output = proposal.roles[roleId];
    if (!output) continue;
    const section = output.sections.find((s) =>
      s.label.includes('手順') ||
      s.label.toLowerCase().includes('step') ||
      s.label.includes('チェックリスト') ||
      s.label.toLowerCase().includes('checklist'),
    );
    if (section) {
      tasks = section.body
        .split('\n')
        .filter((l) => l.trim())
        .map((l) => `- [ ] ${l.replace(/^[-*①-⑦\d.]\s*/, '').trim()}`);
      break;
    }
  }

  // セクションが見つからなければサマリーから生成
  if (tasks.length === 0) {
    tasks = proposal.summary.map((l) => `- [ ] ${l}`);
  }

  return header + tasks.join('\n') + '\n';
}

function buildDecisionContent(proposal: Proposal, isJa: boolean): string {
  const kinOutput = proposal.roles['kin'];
  const goalText  = kinOutput?.sections.find((s) =>
    s.label.includes('目的') || s.label.toLowerCase().includes('goal'),
  )?.body ?? proposal.summary[0] ?? '';

  const lines = [
    `# ${proposal.requestText}`,
    '',
    isJa ? `## 決定日` : `## Date`,
    new Date().toISOString().split('T')[0]!,
    '',
    isJa ? `## 構想の種別` : `## Request type`,
    proposal.requestType,
    '',
    isJa ? `## 目的・背景` : `## Goal`,
    goalText,
    '',
    isJa ? `## 関与した駒` : `## Pieces involved`,
    proposal.activeRoles.join(', '),
    '',
    isJa ? `## 主な決定事項` : `## Key decisions`,
    ...proposal.summary.map((l) => `- ${l}`),
  ];

  return lines.join('\n') + '\n';
}

/** ファイル名に使えるスラッグを生成する */
function slugify(text: string): string {
  return text
    .slice(0, 40)
    .replace(/[\s　]+/g, '-')
    .replace(/[^\w\u3040-\u30ff\u4e00-\u9fff-]/g, '')
    .toLowerCase() || 'proposal';
}
