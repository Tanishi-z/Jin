import { spinner } from '@clack/prompts';
import { getLocale } from '../locale/index.js';
import type { Mode, Task, Feature, NextScreen, ImplResult, FileChange } from '../types/index.js';

/** モックの実装結果を生成する */
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

export async function implementing(mode: Mode, task: Task, feature: Feature): Promise<NextScreen> {
  const t     = getLocale(mode);
  const isJa  = mode === 'ja';
  const s     = spinner();

  s.start(t.implementing.message(task.title));
  await sleep(2000);
  s.stop(t.implementing.done);

  const result = generateMockResult(task, isJa);
  return { screen: 'diffReview', result };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
