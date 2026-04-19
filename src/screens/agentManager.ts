import { select, note, confirm } from '@clack/prompts';
import chalk from 'chalk';
import { getAllAgents, getEnabledAgents, getLocalAgentsDir, getGlobalAgentsDir, invalidateCache } from '../agents/registry.js';
import { loadConfig, saveConfig } from '../config.js';
import type { Mode, RoleId, NextScreen, AgentDefinition } from '../types/index.js';

const PHASE_LABEL: Record<string, { ja: string; en: string }> = {
  analysis: { ja: '分析', en: 'analysis' },
  impl:     { ja: '実装', en: 'impl' },
  review:   { ja: 'レビュー', en: 'review' },
  summary:  { ja: '統合', en: 'summary' },
};

const ROLE_LABEL: Partial<Record<RoleId, { ja: string; en: string }>> = {
  kin:    { ja: '金',   en: 'Kin' },
  gin:    { ja: '銀',   en: 'Gin' },
  hisha:  { ja: '飛車', en: 'Hisha' },
  kaku:   { ja: '角',   en: 'Kaku' },
  keima:  { ja: '桂馬', en: 'Keima' },
  kyosha: { ja: '香車', en: 'Kyosha' },
  fu:     { ja: '歩',   en: 'Fu' },
};

export async function agentManager(mode: Mode): Promise<NextScreen> {
  const isJa = mode === 'ja';

  while (true) {
    invalidateCache();
    const agents = getAllAgents();

    if (agents.length === 0) {
      // エージェントファイルが1つもない
      const localDir  = getLocalAgentsDir();
      const globalDir = getGlobalAgentsDir();
      note(
        [
          isJa ? '.agent.md ファイルが見つかりません。' : 'No .agent.md files found.',
          '',
          isJa ? 'ファイルを以下のどちらかに配置してください：' : 'Place files in either:',
          chalk.cyan(`  ${localDir}`),
          chalk.dim(isJa ? '  （プロジェクト専用）' : '  (project-local)'),
          chalk.cyan(`  ${globalDir}`),
          chalk.dim(isJa ? '  （全プロジェクト共通）' : '  (global)'),
          '',
          isJa ? '`jin agent init` でサンプルを生成できます。' : 'Run `jin agent init` to generate samples.',
        ].join('\n'),
        isJa ? 'エージェントが見つかりません' : 'No agents found',
      );
      return { screen: 'requestTypeSelect' };
    }

    // エージェント一覧を表示してアクションを選択
    const config       = loadConfig();
    const activeAgents = config.activeAgents ?? {};

    const agentOptions = agents.map((a) => {
      const phaseLbl = (PHASE_LABEL[a.phase]?.[isJa ? 'ja' : 'en']) ?? a.phase;
      const roleLbl  = a.roleId
        ? (ROLE_LABEL[a.roleId]?.[isJa ? 'ja' : 'en'] ?? a.roleId)
        : '—';
      const isActive = a.roleId && activeAgents[a.roleId] === a.id;
      const status   = !a.enabled
        ? chalk.dim(isJa ? '無効' : 'disabled')
        : isActive
          ? chalk.green(isJa ? '✓ 有効化中' : '✓ active')
          : chalk.dim(isJa ? '待機中' : 'standby');

      return {
        value: a.id,
        label: `${a.name}`,
        hint:  `${phaseLbl} / ${roleLbl}  ${status}`,
      };
    });

    const menuOptions = [
      ...agentOptions,
      { value: '__reset__', label: isJa ? '有効化をリセットする' : 'Reset all active agents' },
      { value: '__back__',  label: isJa ? '戻る' : 'Back' },
    ];

    const choice = await select<string>({
      message: isJa
        ? 'エージェントを選択して有効化・無効化を切り替えます'
        : 'Select an agent to toggle activation',
      options: menuOptions,
    });

    if (typeof choice === 'symbol' || choice === '__back__') {
      return { screen: 'requestTypeSelect' };
    }

    if (choice === '__reset__') {
      const ok = await confirm({
        message: isJa ? 'すべてのカスタムエージェントを無効化しますか？' : 'Reset all active agents?',
        initialValue: false,
      });
      if (typeof ok !== 'symbol' && ok) {
        saveConfig({ activeAgents: {} });
      }
      continue;
    }

    // 選択されたエージェントの詳細を表示してトグル
    const agent = agents.find((a) => a.id === choice);
    if (!agent) continue;

    await showAgentDetail(agent, config.activeAgents ?? {}, isJa);

    if (!agent.roleId) {
      note(
        isJa
          ? 'roleId が設定されていないため有効化できません。\n.agent.md の roleId フィールドを設定してください。'
          : 'Cannot activate: roleId not set.\nAdd a roleId field to the .agent.md file.',
        isJa ? '有効化不可' : 'Cannot activate',
      );
      continue;
    }

    const currentActiveId = activeAgents[agent.roleId];
    const isCurrentlyActive = currentActiveId === agent.id;

    const toggleLabel = isCurrentlyActive
      ? (isJa ? `無効化する（${ROLE_LABEL[agent.roleId]?.[isJa ? 'ja' : 'en']} から外す）` : `Deactivate for ${agent.roleId}`)
      : (isJa ? `有効化する（${ROLE_LABEL[agent.roleId]?.[isJa ? 'ja' : 'en']} に割り当てる）` : `Activate for ${agent.roleId}`);

    const action = await select<string>({
      message: isJa ? 'アクションを選択' : 'Choose action',
      options: [
        { value: 'toggle', label: toggleLabel },
        { value: 'back',   label: isJa ? '戻る' : 'Back' },
      ],
    });

    if (typeof action === 'symbol' || action === 'back') continue;

    if (action === 'toggle') {
      const updated = { ...activeAgents };
      if (isCurrentlyActive) {
        delete updated[agent.roleId];
      } else {
        updated[agent.roleId] = agent.id;
      }
      saveConfig({ activeAgents: updated });
    }
  }
}

/** エージェントの詳細情報を note で表示する */
function showAgentDetail(
  agent:        AgentDefinition,
  activeAgents: Partial<Record<RoleId, string>>,
  isJa:         boolean,
): Promise<void> {
  const phaseLbl   = (PHASE_LABEL[agent.phase]?.[isJa ? 'ja' : 'en']) ?? agent.phase;
  const roleLbl    = agent.roleId
    ? (ROLE_LABEL[agent.roleId]?.[isJa ? 'ja' : 'en'] ?? agent.roleId)
    : (isJa ? '未指定' : 'unset');
  const isActive   = agent.roleId && activeAgents[agent.roleId] === agent.id;
  const promptPrev = agent.systemPrompt.split('\n')[0]?.slice(0, 80) ?? '';

  const lines = [
    `${isJa ? 'ID' : 'ID'}:         ${agent.id}`,
    `${isJa ? '名前' : 'Name'}:       ${agent.name}`,
    `${isJa ? 'フェーズ' : 'Phase'}:     ${phaseLbl}`,
    `${isJa ? '対応駒' : 'Role'}:       ${roleLbl}`,
    `${isJa ? 'モデル' : 'Model'}:      ${agent.model ?? isJa ? '（グローバル設定）' : '(global)'}`,
    `${isJa ? '状態' : 'Status'}:      ${agent.enabled ? (isActive ? chalk.green(isJa ? '✓ 有効化中' : '✓ active') : (isJa ? '待機中' : 'standby')) : chalk.dim(isJa ? '無効' : 'disabled')}`,
    `${isJa ? 'ファイル' : 'File'}:      ${chalk.dim(agent.filePath)}`,
    '',
    `${isJa ? 'プロンプト冒頭' : 'Prompt preview'}:`,
    chalk.dim(`  ${promptPrev}…`),
  ];

  note(lines.join('\n'), isJa ? 'エージェント詳細' : 'Agent detail');
  return Promise.resolve();
}
