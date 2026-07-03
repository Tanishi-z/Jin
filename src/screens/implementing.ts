import { spinner, note } from '@clack/prompts';
import chalk from 'chalk';
import { getLocale } from '../locale/index.js';
import { isDemoMode } from '../demo/state.js';
import { runTaskImpl } from '../agents/runner.js';
import { routeTaskToRole } from '../routing/taskRouter.js';
import { startSession, endSession } from '../activity/interactionWriter.js';
import { logSessionStart, logSessionEnd, logTaskImpl } from './interactionLog.js';
import type { Mode, Task, Feature, NextScreen, ImplResult, FileChange } from '../types/index.js';

/** モックの実装結果を生成する（デモモード用） */
function generateMockResult(task: Task, isJa: boolean): ImplResult {
  const files: FileChange[] = [
    {
      path: 'src/middleware/requireRole.ts',
      type: 'create',
      content: [
        `import { Request, Response, NextFunction } from 'express';`,
        ``,
        `/** 指定ロールのみアクセスを許可するミドルウェア */`,
        `export function requireRole(role: string) {`,
        `  return (req: Request, res: Response, next: NextFunction) => {`,
        `    if (req.user?.role !== role) {`,
        `      return res.status(403).json({ error: 'Forbidden' });`,
        `    }`,
        `    next();`,
        `  };`,
        `}`,
      ].join('\n'),
    },
    {
      path: 'src/routes/export.ts',
      type: 'modify',
      originalContent: [
        `import { Router } from 'express';`,
        `import { exportCSV } from '../services/export';`,
        ``,
        `const router = Router();`,
        ``,
        `router.get('/csv', async (req, res) => {`,
        `  const data = await exportCSV();`,
        `  res.attachment('export.csv').send(data);`,
        `});`,
      ].join('\n'),
      content: [
        `import { Router } from 'express';`,
        `import { exportCSV } from '../services/export';`,
        `import { requireRole } from '../middleware/requireRole';`,
        ``,
        `const router = Router();`,
        ``,
        `router.get('/csv', requireRole('admin'), async (req, res) => {`,
        `  const data = await exportCSV();`,
        `  res.attachment('export.csv').send(data);`,
        `});`,
      ].join('\n'),
    },
  ];

  return {
    task,
    files,
    explanation: isJa
      ? `requireRole ミドルウェアを新規作成し、CSV出力ルートに適用しました。\n管理者以外のリクエストには 403 を返します。`
      : `Created requireRole middleware and applied it to the CSV export route.\nReturns 403 for non-admin requests.`,
  };
}

export async function implementing(
  mode:         Mode,
  task:         Task,
  feature:      Feature,
  instruction?: string,
): Promise<NextScreen> {
  const t    = getLocale(mode);
  const isJa = mode === 'ja';
  const s    = spinner();

  // デモモード: 従来どおりモックを返す（ファイル書き込みも diffReview 側でスキップされる）
  if (isDemoMode()) {
    s.start(t.implementing.message(task.title));
    await sleep(2000);
    s.stop(t.implementing.done);
    return { screen: 'diffReview', result: generateMockResult(task, isJa), feature };
  }

  // 実モード: 成り駒がLLMで実装し、やりとりをセッションとして記録する
  const roleId = routeTaskToRole(task, feature);
  startSession(task.title, 'task-impl', 'task');
  logSessionStart(task.title, isJa);

  s.start(t.implementing.message(task.title));
  const { result, failed } = await runTaskImpl(task, feature, mode, instruction);
  s.stop(failed
    ? (isJa ? '実装に失敗しました' : 'Implementation failed')
    : t.implementing.done);

  logTaskImpl(roleId, task, result, isJa);
  logSessionEnd(isJa);
  endSession();

  // LLM失敗・ファイル変更なしの場合は理由を表示して手順選択へ戻る
  if (result.files.length === 0) {
    note(result.explanation, isJa ? '実装結果' : 'Result');
    console.log(chalk.dim(isJa
      ? 'ファイル変更が生成されなかったため、手順選択に戻ります。'
      : 'No file changes were generated. Returning to task selection.'));
    return { screen: 'taskSelect', feature };
  }

  return { screen: 'diffReview', result, feature };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
