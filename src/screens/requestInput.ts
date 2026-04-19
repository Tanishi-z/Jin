import { text, note } from '@clack/prompts';
import chalk from 'chalk';
import { getLocale } from '../locale/index.js';
import { getEnabledSkills, parseSkillInput } from '../skills/registry.js';
import { expandSkillTemplate } from '../skills/loader.js';
import type { Mode, RequestType, NextScreen } from '../types/index.js';

export async function requestInput(mode: Mode, requestType: RequestType): Promise<NextScreen> {
  const t      = getLocale(mode);
  const isJa   = mode === 'ja';
  const skills = getEnabledSkills();

  // 利用可能なスキルをヒントとして表示
  if (skills.length > 0) {
    const lines = skills.map((s) => `  /${s.trigger}  ${chalk.dim(s.description)}`).join('\n');
    note(lines, isJa ? '利用可能なスキル' : 'Available skills');
  }

  const rawInput = await text({
    message:     `${t.requestInput.prompt}\n  ${t.requestInput.hint}`,
    placeholder: skills.length > 0
      ? (isJa ? '/skill-name または自由入力' : '/skill-name or free text')
      : t.requestInput.placeholder,
    validate: (value) => {
      if (!value.trim()) {
        return isJa ? '内容を入力してください' : 'Please enter a request';
      }
    },
  });

  if (typeof rawInput === 'symbol') return { screen: 'requestTypeSelect' };

  // スキル呼び出しを検出・展開
  const skillMatch = parseSkillInput(rawInput);
  if (skillMatch) {
    const expanded = expandSkillTemplate(skillMatch.skill, skillMatch.input);
    note(
      chalk.dim(expanded.slice(0, 200) + (expanded.length > 200 ? '…' : '')),
      isJa
        ? `スキル適用: ${skillMatch.skill.name}`
        : `Skill applied: ${skillMatch.skill.name}`,
    );
    return { screen: 'requestConfirm', requestType, requestText: expanded };
  }

  return { screen: 'requestConfirm', requestType, requestText: rawInput };
}
