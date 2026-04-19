import fs from 'fs';
import path from 'path';

export interface SkillDefinition {
  /** スラッシュコマンドのトリガー（ファイル名または frontmatter の trigger） */
  trigger: string;
  /** 表示名 */
  name: string;
  /** 説明文（Claude Code の description フィールドと共通） */
  description: string;
  /**
   * プロンプトテンプレート本文。
   * {{input}} または $ARGUMENTS にユーザー入力が展開される（両形式サポート）。
   */
  template: string;
  /** 読み込み元ファイルパス */
  filePath: string;
  /** 有効かどうか（Claude Code 側は常に true） */
  enabled: boolean;
}

/**
 * .skill.md または .md ファイルを読み込み SkillDefinition を返す。
 * Claude Code コマンド形式（$ARGUMENTS / description）とも互換。
 */
export function loadSkillFile(filePath: string): SkillDefinition | null {
  try {
    const raw = fs.readFileSync(filePath, 'utf-8');
    return parseSkillFile(raw, filePath);
  } catch {
    return null;
  }
}

function parseSkillFile(raw: string, filePath: string): SkillDefinition | null {
  const fmMatch = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);

  // frontmatter がない場合でも body だけで成立させる（Claude Code コマンド形式の一部）
  const frontmatter = fmMatch ? fmMatch[1]! : '';
  const body        = fmMatch ? fmMatch[2]! : raw;

  const fields  = parseFrontmatter(frontmatter);
  const stem    = path.basename(filePath).replace(/\.(skill\.md|md)$/, '');

  // trigger: frontmatter > ファイル名（Claude Code はファイル名がコマンド名になる）
  const trigger = (fields['trigger'] ?? stem).toLowerCase();
  const name    = fields['name'] ?? fields['description']?.split('。')[0] ?? trigger;

  const template = body.trim();
  if (!template) return null;

  return {
    trigger,
    name,
    description: fields['description'] ?? '',
    template,
    filePath,
    // Claude Code のファイルは enabled フィールドがないので常に有効とみなす
    enabled: fields['enabled'] !== 'false',
  };
}

function parseFrontmatter(fm: string): Record<string, string> {
  const result: Record<string, string> = {};
  for (const line of fm.split('\n')) {
    const m = line.match(/^([\w-]+):\s*(.*)$/);
    if (m) result[m[1]!] = m[2]!.replace(/^["']|["']$/g, '').trim();
  }
  return result;
}

/**
 * スキルテンプレートにユーザー入力を展開する。
 * {{input}} と $ARGUMENTS の両方を同じ値で置換する（Claude Code コマンド互換）。
 */
export function expandSkillTemplate(skill: SkillDefinition, input: string): string {
  return skill.template
    .replace(/\{\{input\}\}/g, input)
    .replace(/\$ARGUMENTS/g, input);
}
