import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

/** フックが発火するライフサイクルイベント */
export type HookEvent =
  | 'pre-analysis'
  | 'post-analysis'
  | 'pre-impl'
  | 'post-impl'
  | 'pre-apply'
  | 'post-apply';

/** hooks.json のスキーマ */
export interface HooksConfig {
  hooks: Partial<Record<HookEvent, string[]>>;
}

/** フック実行結果 */
export interface HookResult {
  event:    HookEvent;
  stdout:   string;
  stderr:   string;
  exitCode: number;
}

/**
 * フック設定の読み込み元（優先順）:
 *   1. .jin/hooks.json                  — Jin 専用フック設定
 *   2. .claude/settings.json の jin.hooks セクション
 *      （Claude Code の設定ファイルに Jin フックをまとめて管理できる）
 *   3. ~/.jin/hooks.json                — グローバル Jin フック設定
 *   4. ~/.claude/settings.json の jin.hooks セクション
 */
const HOOKS_SOURCES: Array<{ file: string; key: 'jin' | 'root' }> = [
  { file: path.join(process.cwd(), '.jin',    'hooks.json'),       key: 'root' },
  { file: path.join(process.cwd(), '.claude', 'settings.json'),    key: 'jin'  },
  { file: path.join(process.env['HOME'] ?? '~', '.jin',    'hooks.json'),       key: 'root' },
  { file: path.join(process.env['HOME'] ?? '~', '.claude', 'settings.json'),    key: 'jin'  },
];

/** 全ソースからフック設定をマージして返す（先のソースが優先） */
function loadHooksConfig(): HooksConfig {
  const merged: Partial<Record<HookEvent, string[]>> = {};

  // 後ろから処理して前（高優先）で上書きする
  for (const { file, key } of [...HOOKS_SOURCES].reverse()) {
    if (!fs.existsSync(file)) continue;
    try {
      const json = JSON.parse(fs.readFileSync(file, 'utf-8')) as Record<string, unknown>;
      // key='root'  → { hooks: { "pre-analysis": [...] } }  (hooks.json 形式)
      // key='jin'   → { jin: { hooks: { "pre-analysis": [...] } } }  (.claude/settings.json 形式)
      const section = key === 'root' ? json : (json['jin'] as Record<string, unknown> | undefined);
      const hooks   = section?.['hooks'] as Partial<Record<HookEvent, string[]>> | undefined;
      if (!hooks) continue;

      for (const [event, commands] of Object.entries(hooks) as [HookEvent, string[]][]) {
        if (Array.isArray(commands)) merged[event] = commands;
      }
    } catch { /* 無視 */ }
  }

  return { hooks: merged };
}

/**
 * 指定イベントのフックをすべて実行する。
 * stdout は改行で連結して返す（コンテキスト注入に使用可能）。
 * フックが失敗しても後続処理は継続する。
 */
export function runHooks(
  event: HookEvent,
  env:   Record<string, string> = {},
): HookResult[] {
  const config   = loadHooksConfig();
  const commands = config.hooks[event] ?? [];
  const results: HookResult[] = [];

  const mergedEnv = { ...process.env, ...env } as NodeJS.ProcessEnv;

  for (const cmd of commands) {
    try {
      const stdout = execSync(cmd, {
        env:      mergedEnv,
        cwd:      process.cwd(),
        timeout:  30_000,
        encoding: 'utf-8',
      });
      results.push({ event, stdout: stdout.toString().trim(), stderr: '', exitCode: 0 });
    } catch (err: unknown) {
      const e = err as { stdout?: string; stderr?: string; status?: number };
      results.push({
        event,
        stdout:   (e.stdout ?? '').toString().trim(),
        stderr:   (e.stderr ?? '').toString().trim(),
        exitCode: e.status ?? 1,
      });
    }
  }

  return results;
}

/**
 * フック結果の stdout を連結してコンテキスト文字列を生成する。
 */
export function hookOutputToContext(results: HookResult[]): string {
  return results.map((r) => r.stdout).filter(Boolean).join('\n');
}
