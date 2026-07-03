import { select, note } from '@clack/prompts';
import chalk from 'chalk';
import { listInstalledModels } from '../system/ollama.js';
import { ROLE_RECOMMENDATIONS, ROLE_ORDER, rankModelsForRole, computeRecommendedRoleModels } from '../roles/modelRecommendations.js';
import { loadConfig, saveConfig } from '../config.js';
import type { Mode, RoleId, NextScreen } from '../types/index.js';

const PROMOTED_SUFFIX: Partial<Record<RoleId, string>> = {
  gin:    '→ 成銀',
  hisha:  '→ 龍王',
  kaku:   '→ 龍馬',
  keima:  '→ 成桂',
  kyosha: '→ 成香',
  fu:     '→ と金',
};
const PROMOTED_SUFFIX_EN: Partial<Record<RoleId, string>> = {
  gin:    '→ Narigin',
  hisha:  '→ Ryuuou',
  kaku:   '→ Ryuuma',
  keima:  '→ Narikei',
  kyosha: '→ Narikyou',
  fu:     '→ Tokin',
};

export async function roleModelAssign(mode: Mode): Promise<NextScreen> {
  const isJa         = mode === 'ja';
  const config       = loadConfig();
  const defaultModel = config.localModel ?? (isJa ? '（未設定）' : '(not set)');

  // インストール済みモデル一覧を取得
  let installed: Array<{ name: string; size: number; sizeLabel: string }> = [];
  try {
    installed = await listInstalledModels();
  } catch {
    note(
      isJa
        ? 'Ollama が起動していないか、モデルが見つかりません。\nOllama を起動してから再度お試しください。'
        : 'Ollama is not running or no models found.\nPlease start Ollama and try again.',
      isJa ? 'エラー' : 'Error',
    );
    return { screen: 'requestTypeSelect' };
  }

  if (installed.length === 0) {
    note(
      isJa
        ? 'インストール済みのモデルがありません。\nまずローカルLLMセットアップでモデルをダウンロードしてください。'
        : 'No models installed.\nPlease download a model via Local LLM Setup first.',
      isJa ? 'モデルなし' : 'No models',
    );
    return { screen: 'localLLMSetup' };
  }

  const installedNames = installed.map((m) => m.name);
  const promotedSuffix = isJa ? PROMOTED_SUFFIX : PROMOTED_SUFFIX_EN;

  // ── モード選択 ──
  const modeChoice = await select<string>({
    message: isJa ? '設定方法を選んでください' : 'Choose how to configure',
    options: [
      {
        value: 'recommend',
        label: isJa ? 'おすすめ設定を適用する' : 'Apply recommended settings',
        hint:  isJa
          ? 'インストール済みモデルから各駒に最適なモデルを自動選択します'
          : 'Auto-assigns the best model per piece from installed models',
      },
      {
        value: 'manual',
        label: isJa ? '手動で設定する' : 'Configure manually',
        hint:  isJa ? '駒ごとに選択します' : 'Select model for each piece',
      },
    ],
  });

  if (typeof modeChoice === 'symbol') return { screen: 'requestTypeSelect' };

  // ── 現在の割り当てを表示 ──
  const summaryLines = buildSummaryLines(
    ROLE_ORDER, config.roleModels ?? {}, defaultModel, installedNames,
    promotedSuffix, isJa,
  );
  note(
    summaryLines.join('\n'),
    isJa
      ? `現在の割り当て  /  デフォルト: ${defaultModel}`
      : `Current assignments  /  Default: ${defaultModel}`,
  );

  if (modeChoice === 'recommend') {
    return applyRecommended(installed, installedNames, defaultModel, promotedSuffix, isJa, mode);
  }

  return configureManualy(installed, installedNames, defaultModel, promotedSuffix, isJa, config.roleModels ?? {});
}

/** おすすめ設定を自動計算して確認 → 保存 */
async function applyRecommended(
  installed:       Array<{ name: string; size: number; sizeLabel: string }>,
  installedNames:  string[],
  defaultModel:    string,
  promotedSuffix:  Partial<Record<RoleId, string>>,
  isJa:            boolean,
  mode:            Mode,
): Promise<NextScreen> {
  // 各駒の最適モデルを計算（localLLMSetup と共通ロジック）
  const assignments = computeRecommendedRoleModels(installedNames, defaultModel);
  const recommended: Partial<Record<RoleId, string>> = {};
  const previewLines: string[] = [];

  for (const roleId of ROLE_ORDER) {
    const rec  = ROLE_RECOMMENDATIONS[roleId];
    const best = assignments[roleId];

    const promoted = promotedSuffix[roleId] ?? '';
    const nameCol  = isJa
      ? `${rec.nameJa} ${rec.nameEn}`.padEnd(12) + chalk.dim(promoted)
      : `${rec.nameEn} ${rec.nameJa}`.padEnd(12) + chalk.dim(promoted);

    if (best) {
      recommended[roleId] = best.name;
      const reason = best.reason ? (isJa ? best.reason.ja : best.reason.en) : '';
      const sizeLabel = installed.find((m) => m.name === best.name)?.sizeLabel ?? '';
      previewLines.push(
        `  ${nameCol}  ${chalk.cyan(best.name)}  ${chalk.dim(sizeLabel)}\n` +
        `  ${' '.repeat(14)}  ${chalk.dim('★ ' + reason)}`,
      );
    } else {
      previewLines.push(
        `  ${nameCol}  ${chalk.dim(defaultModel + (isJa ? '（デフォルト）' : ' (default)'))}`,
      );
    }
  }

  note(previewLines.join('\n'), isJa ? 'おすすめ設定のプレビュー' : 'Recommended settings preview');

  const confirm = await select<string>({
    message: isJa ? 'この設定を適用しますか？' : 'Apply these settings?',
    options: [
      { value: 'apply',  label: isJa ? '適用する'       : 'Apply' },
      { value: 'manual', label: isJa ? '手動で調整する' : 'Adjust manually' },
      { value: 'cancel', label: isJa ? 'キャンセル'     : 'Cancel' },
    ],
  });

  if (typeof confirm === 'symbol' || confirm === 'cancel') return { screen: 'requestTypeSelect' };

  if (confirm === 'manual') {
    // おすすめを初期値として手動設定に引き渡す
    return configureManualy(installed, installedNames, defaultModel, promotedSuffix, isJa, recommended);
  }

  // おすすめを保存
  saveConfig({ roleModels: recommended });
  showSaved(recommended, defaultModel, promotedSuffix, isJa, installed);
  return { screen: 'requestTypeSelect' };
}

/** 手動設定：駒ごとにモデルを選択 */
async function configureManualy(
  installed:       Array<{ name: string; size: number; sizeLabel: string }>,
  installedNames:  string[],
  defaultModel:    string,
  promotedSuffix:  Partial<Record<RoleId, string>>,
  isJa:            boolean,
  initial:         Partial<Record<RoleId, string>>,
): Promise<NextScreen> {
  const roleModels: Partial<Record<RoleId, string>> = { ...initial };

  for (const roleId of ROLE_ORDER) {
    const rec          = ROLE_RECOMMENDATIONS[roleId];
    const ranked       = rankModelsForRole(roleId, installedNames);
    const currentModel = roleModels[roleId] ?? defaultModel;
    const promoted     = promotedSuffix[roleId] ?? '';

    const modelOptions = ranked.map((r) => {
      const sizeLabel = installed.find((m) => m.name === r.name)?.sizeLabel ?? '';
      const stars     = r.reason ? '★ ' : '  ';
      const reason    = r.reason
        ? (isJa ? r.reason.ja : r.reason.en)
        : (isJa ? 'インストール済み' : 'installed');
      return { value: r.name, label: r.name, hint: `${stars}${reason}  ${sizeLabel}` };
    });

    const useDefaultOption = {
      value: '__default__',
      label: isJa ? `（デフォルトを使う: ${defaultModel}）` : `(Use default: ${defaultModel})`,
      hint:  isJa ? '駒専用の割り当てを解除します' : 'Removes piece-specific assignment',
    };

    const promptLabel = isJa
      ? `${rec.nameJa} ${rec.nameEn}  ${chalk.dim(promoted)}  ${chalk.dim(rec.descJa)}`
      : `${rec.nameEn} ${rec.nameJa}  ${chalk.dim(promoted)}  ${chalk.dim(rec.descEn)}`;

    const initialValue = currentModel === defaultModel ? '__default__' : currentModel;

    const selected = await select<string>({
      message: promptLabel,
      options: [useDefaultOption, ...modelOptions],
      initialValue,
    });

    if (typeof selected === 'symbol') break;

    if (selected === '__default__') {
      delete roleModels[roleId];
    } else {
      roleModels[roleId] = selected;
    }
  }

  saveConfig({ roleModels });
  showSaved(roleModels, defaultModel, promotedSuffix, isJa, installed);
  return { screen: 'requestTypeSelect' };
}

/** 保存完了サマリーを表示 */
function showSaved(
  roleModels:     Partial<Record<RoleId, string>>,
  defaultModel:   string,
  promotedSuffix: Partial<Record<RoleId, string>>,
  isJa:           boolean,
  installed:      Array<{ name: string; size: number; sizeLabel: string }>,
): void {
  const lines = buildSummaryLines(ROLE_ORDER, roleModels, defaultModel, [], promotedSuffix, isJa);
  note(lines.join('\n'), isJa ? '設定を保存しました' : 'Settings saved');
}

/** 割り当てサマリー行を構築 */
function buildSummaryLines(
  order:          RoleId[],
  roleModels:     Partial<Record<RoleId, string>>,
  defaultModel:   string,
  _installedNames: string[],
  promotedSuffix: Partial<Record<RoleId, string>>,
  isJa:           boolean,
): string[] {
  return order.map((roleId) => {
    const rec      = ROLE_RECOMMENDATIONS[roleId];
    const model    = roleModels[roleId] ?? defaultModel;
    const promoted = promotedSuffix[roleId] ?? '';
    const isCustom = roleModels[roleId] !== undefined;
    const nameCol  = isJa
      ? `${rec.nameJa} ${rec.nameEn}`.padEnd(12) + chalk.dim(promoted)
      : `${rec.nameEn} ${rec.nameJa}`.padEnd(12) + chalk.dim(promoted);
    const modelCol = isCustom
      ? chalk.cyan(model)
      : chalk.dim(model + (isJa ? '（デフォルト）' : ' (default)'));
    return `  ${nameCol}  ${modelCol}`;
  });
}
