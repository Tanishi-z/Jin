import fs from 'fs';
import path from 'path';
import { loadSkillFile } from './loader.js';
import type { SkillDefinition } from './loader.js';

/**
 * スキルの検索ディレクトリ（優先順）:
 *   1. .jin/skills/          — Jin 専用スキル（.skill.md / .md）
 *   2. .claude/commands/     — Claude Code コマンドを Jin でも使用
 *   3. ~/.jin/skills/        — グローバル Jin スキル
 *   4. ~/.claude/commands/   — グローバル Claude Code コマンド
 *
 * 同じトリガーが複数箇所に存在する場合、上位が優先される。
 */
const SKILL_DIRS: Array<{ dir: string; exts: string[] }> = [
  { dir: path.join(process.cwd(), '.jin',    'skills'),   exts: ['.skill.md', '.md'] },
  { dir: path.join(process.cwd(), '.claude', 'commands'), exts: ['.md'] },
  { dir: path.join(process.env['HOME'] ?? '~', '.jin',    'skills'),   exts: ['.skill.md', '.md'] },
  { dir: path.join(process.env['HOME'] ?? '~', '.claude', 'commands'), exts: ['.md'] },
];

let cache: SkillDefinition[] | null = null;

export function invalidateSkillCache(): void {
  cache = null;
}

/** 全スキルを読み込む（優先順位に従い重複除去） */
export function getAllSkills(): SkillDefinition[] {
  if (cache) return cache;

  const seen   = new Set<string>();
  const skills: SkillDefinition[] = [];

  for (const { dir, exts } of SKILL_DIRS) {
    if (!fs.existsSync(dir)) continue;
    let entries: string[];
    try { entries = fs.readdirSync(dir); } catch { continue; }

    for (const file of entries) {
      if (!exts.some((e) => file.endsWith(e))) continue;
      const skill = loadSkillFile(path.join(dir, file));
      if (!skill || seen.has(skill.trigger)) continue;
      seen.add(skill.trigger);
      skills.push(skill);
    }
  }

  cache = skills;
  return skills;
}

/** 有効なスキルのみ返す */
export function getEnabledSkills(): SkillDefinition[] {
  return getAllSkills().filter((s) => s.enabled);
}

/**
 * トリガー名でスキルを検索する。
 * 入力が "/" で始まる場合は除去して検索する。
 */
export function findSkill(trigger: string): SkillDefinition | undefined {
  const key = trigger.toLowerCase().replace(/^\//, '');
  return getEnabledSkills().find((s) => s.trigger === key);
}

/**
 * ユーザー入力がスキル呼び出しかどうかを判定する。
 * "/trigger 残りのテキスト" の形式を期待する。
 */
export function parseSkillInput(
  rawInput: string,
): { skill: SkillDefinition; input: string } | null {
  const trimmed = rawInput.trim();
  if (!trimmed.startsWith('/')) return null;

  const spaceIdx = trimmed.indexOf(' ');
  const trigger  = spaceIdx === -1 ? trimmed.slice(1) : trimmed.slice(1, spaceIdx);
  const input    = spaceIdx === -1 ? '' : trimmed.slice(spaceIdx + 1).trim();

  const skill = findSkill(trigger);
  if (!skill) return null;

  return { skill, input };
}
