import fs from 'fs';
import path from 'path';
import type { Feature, Task } from '../types/index.js';
import { isDemoMode, getDemoLocaleMode } from '../demo/state.js';
import { getDemoFeatures, markDemoTaskCompleted } from '../demo/data.js';

const BACKLOG_PATH = path.join(process.cwd(), '.jin', 'tasks', 'backlog.md');

/**
 * backlog.md を読み込んで構想（Feature）一覧を返す。
 *
 * フォーマット:
 *   ## 構想タイトル
 *   > 構想の説明（省略可）
 *   - [ ] 手順タイトル
 *   - [x] 完了済みの手順
 */
export function loadFeatures(): Feature[] {
  // デモモードはメモリ上のデータを返す
  if (isDemoMode()) {
    const modeKey = getDemoLocaleMode() === 'ja' ? 'ja' : 'global';
    return getDemoFeatures(modeKey);
  }

  if (!fs.existsSync(BACKLOG_PATH)) return [];

  const lines    = fs.readFileSync(BACKLOG_PATH, 'utf-8').split('\n');
  const features: Feature[] = [];
  let current: Feature | null = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;

    // H2 → 新しい構想ブロック
    const h2 = line.match(/^## (.+)/);
    if (h2) {
      current = { title: h2[1]!, tasks: [], pendingCount: 0 };
      features.push(current);
      continue;
    }

    if (!current) continue;

    // > → 構想の説明
    const desc = line.match(/^> (.+)/);
    if (desc) {
      current.description = desc[1]!;
      continue;
    }

    // - [ ] / - [x] → 手順
    const unchecked = line.match(/^- \[ \] (.+)/);
    const checked   = line.match(/^- \[x\] (.+)/i);
    if (unchecked ?? checked) {
      const detailLines: string[] = [];
      let j = i + 1;
      while (j < lines.length && /^\s+/.test(lines[j]!)) {
        detailLines.push(lines[j]!.trim());
        j++;
      }

      const task: Task = {
        lineIndex:    i,
        title:        (unchecked ?? checked)![1]!,
        completed:    !!checked,
        featureTitle: current.title,
        detail:       detailLines.length > 0 ? detailLines.join('\n') : undefined,
      };
      current.tasks.push(task);
      if (!task.completed) current.pendingCount++;
    }
  }

  return features;
}

/** 未完了手順を持つ構想のみ返す */
export function loadPendingFeatures(): Feature[] {
  return loadFeatures().filter((f) => f.pendingCount > 0);
}

/** 指定手順を完了済みにして backlog.md を更新する */
export function markTaskCompleted(task: Task): void {
  // デモモードはメモリ上で完了状態を管理する
  if (isDemoMode()) {
    markDemoTaskCompleted(task.lineIndex);
    return;
  }

  if (!fs.existsSync(BACKLOG_PATH)) return;

  const lines = fs.readFileSync(BACKLOG_PATH, 'utf-8').split('\n');
  lines[task.lineIndex] = lines[task.lineIndex]!.replace(/^- \[ \]/, '- [x]');
  fs.writeFileSync(BACKLOG_PATH, lines.join('\n'), 'utf-8');
}
