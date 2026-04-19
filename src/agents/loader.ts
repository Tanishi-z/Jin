import fs from 'fs';
import path from 'path';
import type { AgentDefinition, AgentPhase, RoleId } from '../types/index.js';

const VALID_PHASES:  AgentPhase[] = ['analysis', 'impl', 'review', 'summary'];
const VALID_ROLE_IDS: RoleId[]    = ['kin', 'gin', 'hisha', 'kaku', 'keima', 'kyosha', 'fu'];

/**
 * .agent.md または .md ファイルを読み込み AgentDefinition を返す。
 *
 * Claude Code エージェント形式（.claude/agents/）と互換:
 *   name        — 表示名
 *   description — 説明文（Claude Code が使用）
 *   tools       — 許可ツール（Claude Code が使用、Jin では無視）
 *   model       — 使用モデル名
 *
 * Jin 拡張フィールド（Claude Code では無視される）:
 *   id          — ユニークID（省略時はファイル名から導出）
 *   phase       — analysis | impl | review | summary
 *   roleId      — 対応する駒ID
 *   temperature — 推論温度
 *   enabled     — false で無効化
 */
export function loadAgentFile(filePath: string): AgentDefinition | null {
  let raw: string;
  try {
    raw = fs.readFileSync(filePath, 'utf-8');
  } catch {
    return null;
  }

  const { frontmatter, body } = parseFrontmatter(raw);
  const fields  = parseFields(frontmatter ?? '');
  const stem    = path.basename(filePath).replace(/\.(agent\.md|md)$/, '');

  // id: frontmatter > ファイル名
  const id = str(fields['id']) || stem;
  // name: frontmatter > id
  const name = str(fields['name']) || id;

  // phase: frontmatter が必須（Claude Code ファイルにはないので省略可。省略時は 'analysis'）
  const phaseRaw = str(fields['phase']) || 'analysis';
  if (!VALID_PHASES.includes(phaseRaw as AgentPhase)) return null;
  const phase = phaseRaw as AgentPhase;

  const roleIdRaw = str(fields['roleId']) || id;
  const roleId    = VALID_ROLE_IDS.includes(roleIdRaw as RoleId)
    ? (roleIdRaw as RoleId)
    : undefined;

  const systemPrompt = body.trim();
  if (!systemPrompt) return null;

  return {
    id,
    name,
    description: str(fields['description']) || undefined,
    phase,
    roleId,
    model:       str(fields['model'])       || undefined,
    temperature: num(fields['temperature']),
    tools:       str(fields['tools'])       || undefined,
    systemPrompt,
    filePath,
    enabled: fields['enabled'] !== 'false',
  };
}

// ── 内部パーサー ──────────────────────────────────────────────────────────────

function parseFrontmatter(raw: string): { frontmatter: string | null; body: string } {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!match) return { frontmatter: null, body: raw };
  return { frontmatter: match[1]!, body: match[2]! };
}

function parseFields(frontmatter: string): Record<string, string> {
  const result: Record<string, string> = {};
  for (const line of frontmatter.split(/\r?\n/)) {
    const colon = line.indexOf(':');
    if (colon < 0) continue;
    const key   = line.slice(0, colon).trim();
    const value = line.slice(colon + 1).replace(/#.*$/, '').trim();
    if (key) result[key] = value;
  }
  return result;
}

function str(v: string | undefined): string {
  return (v ?? '').trim();
}

function num(v: string | undefined): number | undefined {
  if (!v) return undefined;
  const n = parseFloat(v);
  return isNaN(n) ? undefined : n;
}
