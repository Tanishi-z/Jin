import fs from 'fs';
import path from 'path';
import os from 'os';
import { loadAgentFile } from './loader.js';
import type { AgentDefinition, AgentPhase, RoleId } from '../types/index.js';

/**
 * エージェントファイルの検索ディレクトリ（優先順）:
 *   1. .jin/agents/        — Jin 専用エージェント（.agent.md / .md）
 *   2. .claude/agents/     — Claude Code エージェントを Jin でも使用
 *   3. ~/.jin/agents/      — グローバル Jin エージェント
 *   4. ~/.claude/agents/   — グローバル Claude Code エージェント
 *
 * 同じ id が複数箇所に存在する場合、上位が優先される。
 */
const AGENT_DIRS: Array<{ dir: string; exts: string[] }> = [
  { dir: path.join(process.cwd(), '.jin',    'agents'),  exts: ['.agent.md', '.md'] },
  { dir: path.join(process.cwd(), '.claude', 'agents'),  exts: ['.md'] },
  { dir: path.join(os.homedir(),  '.jin',    'agents'),  exts: ['.agent.md', '.md'] },
  { dir: path.join(os.homedir(),  '.claude', 'agents'),  exts: ['.md'] },
];

let _cache: AgentDefinition[] | null = null;

export function invalidateCache(): void { _cache = null; }

/** 全エージェント定義を返す（優先順位に従い重複除去） */
export function getAllAgents(): AgentDefinition[] {
  if (_cache) return _cache;

  const merged = new Map<string, AgentDefinition>();

  // 後から追加されたものが上書きされないよう逆順でイテレートし、
  // 優先度の高いディレクトリで上書きする
  const allDirs = [...AGENT_DIRS].reverse();
  for (const { dir, exts } of allDirs) {
    for (const agent of scanDir(dir, exts)) {
      merged.set(agent.id, agent);
    }
  }

  _cache = [...merged.values()];
  return _cache;
}

export function getEnabledAgents(): AgentDefinition[] {
  return getAllAgents().filter((a) => a.enabled);
}

/**
 * 指定した駒ID・フェーズに対応するカスタムエージェントを返す。
 * config.activeAgents で明示的に id が指定されている場合はそれを優先する。
 */
export function findAgentForRole(
  roleId:        RoleId,
  phase:         AgentPhase,
  activeAgents?: Partial<Record<RoleId, string>>,
): AgentDefinition | null {
  const enabled = getEnabledAgents();

  const activeId = activeAgents?.[roleId];
  if (activeId) {
    return enabled.find((a) => a.id === activeId && a.phase === phase) ?? null;
  }

  return enabled.find((a) => a.roleId === roleId && a.phase === phase) ?? null;
}

function scanDir(dir: string, exts: string[]): AgentDefinition[] {
  if (!fs.existsSync(dir)) return [];

  let entries: fs.Dirent[];
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); }
  catch { return []; }

  return entries
    .filter((e) => e.isFile() && exts.some((x) => e.name.endsWith(x)))
    .flatMap((e) => {
      const agent = loadAgentFile(path.join(dir, e.name));
      return agent ? [agent] : [];
    });
}

export function getLocalAgentsDir(): string  { return AGENT_DIRS[0]!.dir; }
export function getGlobalAgentsDir(): string { return AGENT_DIRS[2]!.dir; }
