import { select, groupMultiselect, spinner, note, confirm } from '@clack/prompts';
import chalk from 'chalk';
import { detectSpecs } from '../system/specs.js';
import type { ModelStrength } from '../system/specs.js';
import { fetchOllamaModels } from '../system/ollamaRegistry.js';
import {
  isOllamaInstalled,
  isOllamaRunning,
  startOllama,
  listInstalledModels,
  pullModel,
  getInstallInstructions,
} from '../system/ollama.js';
import { ROLE_RECOMMENDATIONS, ROLE_ORDER, computeRecommendedRoleModels } from '../roles/modelRecommendations.js';
import { saveConfig } from '../config.js';
import type { Mode, RoleId, NextScreen } from '../types/index.js';

/** 強みグループの表示順とラベル */
const STRENGTH_ORDER: ModelStrength[] = ['coding', 'reasoning', 'light', 'balanced', 'large'];

const STRENGTH_LABELS: Record<ModelStrength, { ja: string; en: string }> = {
  coding:    { ja: 'コード特化',   en: 'Coding' },
  reasoning: { ja: '推論特化',     en: 'Reasoning' },
  light:     { ja: '軽量・高速',   en: 'Light & Fast' },
  balanced:  { ja: 'バランス',     en: 'Balanced' },
  large:     { ja: '高品質・大型', en: 'Large & High-quality' },
};

/** 説明文をロケールに合わせて選び、指定長に切り詰める */
function localizedDesc(description: string, isJa: boolean, max = 40): string {
  const parts = description.split(' / ');
  const text  = isJa ? parts[0] : (parts[1] ?? parts[0]);
  return text.length > max ? `${text.slice(0, max)}…` : text;
}

export async function localLLMSetup(mode: Mode): Promise<NextScreen> {
  const isJa = mode === 'ja';

  // ① スペック検出
  const s = spinner();
  s.start(isJa ? 'マシンスペックを確認しています...' : 'Detecting system specs...');
  const specs = detectSpecs();
  s.stop(isJa ? 'スペックを確認しました' : 'System specs detected');

  const gpuInfo = specs.isAppleSilicon
    ? (isJa ? 'Apple Silicon（GPU統合）' : 'Apple Silicon (unified GPU)')
    : specs.hasNvidiaGpu ? 'NVIDIA GPU'
    : specs.hasAmdGpu    ? 'AMD GPU'
    : (isJa ? 'GPU なし（CPU推論）' : 'No GPU (CPU inference)');

  note(
    [`RAM: ${specs.ramGB} GB`, `GPU: ${gpuInfo}`].join('\n'),
    isJa ? 'マシンスペック' : 'System specs',
  );

  // ② Ollama インストール確認
  if (!isOllamaInstalled()) {
    const installCmd = getInstallInstructions();
    note(
      [
        isJa ? 'ローカルLLMの実行にはOllamaが必要です。' : 'Ollama is required to run local LLMs.',
        '',
        isJa ? 'インストールコマンド:' : 'Install command:',
        chalk.cyan(installCmd),
        '',
        isJa ? 'インストール後、もう一度 jin を起動してください。' : 'After installing, restart jin.',
      ].join('\n'),
      isJa ? 'Ollama が見つかりません' : 'Ollama not found',
    );
    const goBack = await confirm({
      message: isJa ? 'ホームに戻りますか？' : 'Return to home?',
      initialValue: true,
    });
    return { screen: 'requestTypeSelect' };
  }

  // ③ Ollama サービス起動確認
  if (!await isOllamaRunning()) {
    const s2 = spinner();
    s2.start(isJa ? 'Ollama を起動しています...' : 'Starting Ollama...');
    startOllama();
    await sleep(2000);
    s2.stop(isJa ? 'Ollama を起動しました' : 'Ollama started');
  }

  // ④ インストール済みモデルと推奨モデルを取得（ウェブから最新情報を試みる）
  const s3 = spinner();
  s3.start(isJa ? 'Ollama ライブラリから最新モデル情報を取得中...' : 'Fetching latest models from Ollama library...');
  const [installed, { fromWeb, models: recommended }] = await Promise.all([
    listInstalledModels(),
    fetchOllamaModels(specs),
  ]);
  s3.stop(
    fromWeb
      ? (isJa ? 'ウェブから最新モデル情報を取得しました' : 'Fetched latest models from web')
      : (isJa ? 'オフライン：組み込みリストを使用します' : 'Offline: using built-in model list'),
  );

  const installedNames = new Set(installed.map((m) => m.name));

  // ⑤ インストールするモデルを強み別グループから複数選択
  const groups: Record<string, Array<{ value: string; label: string; hint?: string }>> = {};

  if (installed.length > 0) {
    groups[isJa ? 'インストール済み' : 'Installed'] = installed.map((m) => ({
      value: m.name,
      label: m.name,
      hint:  isJa ? `✓ 導入済み  ${m.sizeLabel}` : `✓ installed  ${m.sizeLabel}`,
    }));
  }

  for (const strength of STRENGTH_ORDER) {
    const options = recommended
      .filter((m) => !installedNames.has(m.name) && (m.strength ?? 'balanced') === strength)
      .map((m) => ({
        value: m.name,
        label: m.label,
        hint:  [
          `RAM ${m.requiredRamGB}GB${isJa ? '〜' : '+'}`,
          m.pulls ? `★${m.pulls}` : '',
          localizedDesc(m.description, isJa),
        ].filter(Boolean).join('  '),
      }));
    // 空グループは見出しごと出さない
    if (options.length > 0) {
      groups[isJa ? STRENGTH_LABELS[strength].ja : STRENGTH_LABELS[strength].en] = options;
    }
  }

  if (Object.keys(groups).length === 0) {
    note(
      isJa
        ? 'RAMが不足しているため、推奨モデルがありません。\n最低 4GB の空きRAMが必要です。'
        : 'Not enough RAM for any recommended model.\nAt least 4GB of free RAM is required.',
      isJa ? 'モデルを実行できません' : 'Cannot run models',
    );
    return { screen: 'requestTypeSelect' };
  }

  const selectedRaw = await groupMultiselect<string>({
    message: isJa
      ? 'インストールするモデルを選んでください（スペースで選択・複数可）'
      : 'Select models to install (space to toggle, multiple allowed)',
    options: groups,
    initialValues: [...installedNames],
    required: true,
  });

  if (typeof selectedRaw === 'symbol') return { screen: 'requestTypeSelect' };
  const selected = selectedRaw as string[];
  if (selected.length === 0) return { screen: 'requestTypeSelect' };

  // 選択された未インストール分を順にダウンロード（失敗しても残りは継続）
  const toPull = selected.filter((n) => !installedNames.has(n));
  const pullFailed: string[] = [];

  for (let i = 0; i < toPull.length; i++) {
    const name  = toPull[i];
    const count = `(${i + 1}/${toPull.length})`;
    const ps = spinner();
    ps.start(isJa ? `${count} ${name} をダウンロード中...` : `${count} Downloading ${name}...`);
    try {
      await pullModel(name, (status) => { ps.message(`${count} ${name}  ${status}`); });
      ps.stop(isJa ? `${count} ${name} ダウンロード完了` : `${count} ${name} downloaded`);
      installed.push({ name, size: 0, sizeLabel: '—' });
      installedNames.add(name);
    } catch {
      ps.stop(chalk.red(isJa ? `${count} ${name} のダウンロードに失敗しました` : `${count} Failed to download ${name}`));
      pullFailed.push(name);
    }
  }

  if (pullFailed.length > 0) {
    note(
      pullFailed.map((n) => `  ✗ ${n}`).join('\n'),
      isJa ? 'ダウンロードに失敗したモデル' : 'Failed downloads',
    );
  }

  // 既定モデルの候補 = 選択したうち実際にインストールされているもの
  let candidates = selected.filter((n) => installedNames.has(n));
  if (candidates.length === 0) candidates = [...installedNames];
  if (candidates.length === 0) {
    note(
      isJa
        ? '利用可能なモデルがありません。ネットワークを確認して再度お試しください。'
        : 'No models available. Check your network and try again.',
      isJa ? 'セットアップ未完了' : 'Setup incomplete',
    );
    return { screen: 'requestTypeSelect' };
  }

  // 既定モデルを1つ選択（候補が1件なら自動採用）
  let defaultModel: string;
  if (candidates.length === 1) {
    defaultModel = candidates[0];
    note(
      isJa ? `既定モデル: ${defaultModel}` : `Default model: ${defaultModel}`,
      isJa ? '既定モデルを設定しました' : 'Default model set',
    );
  } else {
    const picked = await select<string>({
      message: isJa ? '既定モデル（通常の駒が使うモデル）を選んでください' : 'Select the default model (used by pieces by default)',
      options: candidates.map((n) => {
        const rec = recommended.find((m) => m.name === n);
        return {
          value: n,
          label: n,
          hint:  rec ? localizedDesc(rec.description, isJa) : undefined,
        };
      }),
      initialValue: candidates[0],
    });
    if (typeof picked === 'symbol') return { screen: 'requestTypeSelect' };
    defaultModel = picked;
  }

  // ⑥ 駒ごとのおすすめ自動割当を提案
  const roleModels: Partial<Record<RoleId, string>> = {};
  const installedList = [...installedNames];
  const assignments   = computeRecommendedRoleModels(installedList, defaultModel);
  const hasAssignments = Object.keys(assignments).length > 0;

  if (hasAssignments) {
    const previewLines = ROLE_ORDER.map((roleId) => {
      const rec  = ROLE_RECOMMENDATIONS[roleId];
      const best = assignments[roleId];
      const nameCol = `${rec.nameJa} ${rec.nameEn}`.padEnd(12);
      if (best) {
        const reason = best.reason ? (isJa ? best.reason.ja : best.reason.en) : '';
        return `  ${nameCol}  ${chalk.cyan(best.name)}  ${chalk.dim('★ ' + reason)}`;
      }
      return `  ${nameCol}  ${chalk.dim(defaultModel + (isJa ? '（既定）' : ' (default)'))}`;
    });
    note(previewLines.join('\n'), isJa ? '駒ごとのおすすめ割り当て' : 'Recommended per-piece assignment');

    const applyAuto = await confirm({
      message: isJa
        ? 'このおすすめ割り当てを適用しますか？'
        : 'Apply this recommended assignment?',
      initialValue: true,
    });

    if (typeof applyAuto !== 'symbol' && applyAuto) {
      for (const [roleId, a] of Object.entries(assignments) as Array<[RoleId, { name: string }]>) {
        roleModels[roleId] = a.name;
      }
    }
  }

  // ⑦ 設定を保存
  saveConfig({ localModel: defaultModel, roleModels });

  // 結果サマリー
  const lines: string[] = [
    `${isJa ? '既定モデル' : 'Default'}: ${defaultModel}`,
    isJa
      ? `ダウンロード: 成功 ${toPull.length - pullFailed.length} 件 / 失敗 ${pullFailed.length} 件`
      : `Downloads: ${toPull.length - pullFailed.length} succeeded / ${pullFailed.length} failed`,
    '',
  ];

  if (Object.keys(roleModels).length > 0) {
    for (const roleId of ROLE_ORDER) {
      const rec   = ROLE_RECOMMENDATIONS[roleId];
      const model = roleModels[roleId] ?? defaultModel;
      const mark  = roleModels[roleId] ? chalk.cyan('◆') : chalk.dim(isJa ? '（既定）' : '(default)');
      lines.push(`${rec.nameJa} ${rec.nameEn.padEnd(8)} ${mark} ${model}`);
    }
  } else {
    lines.push(chalk.dim(isJa
      ? '駒ごとの割り当ては「設定 → 駒ごとのモデルを設定する」からいつでも変更できます。'
      : 'Per-piece assignment can be changed anytime via Settings → Piece model assignment.'));
  }

  note(lines.join('\n'), isJa ? '駒モデル設定を保存しました' : 'Piece model configuration saved');

  return { screen: 'requestTypeSelect' };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
