import { select, spinner, note, confirm } from '@clack/prompts';
import chalk from 'chalk';
import { detectSpecs } from '../system/specs.js';
import { fetchOllamaModels } from '../system/ollamaRegistry.js';
import {
  isOllamaInstalled,
  isOllamaRunning,
  startOllama,
  listInstalledModels,
  pullModel,
  getInstallInstructions,
} from '../system/ollama.js';
import { ROLE_RECOMMENDATIONS, rankModelsForRole } from '../roles/modelRecommendations.js';
import { saveConfig } from '../config.js';
import type { Mode, RoleId, NextScreen } from '../types/index.js';

const ROLE_ORDER: RoleId[] = ['kin', 'gin', 'hisha', 'kaku', 'keima', 'kyosha', 'fu'];

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

  // ⑤ デフォルトモデル選択
  const installedOptions = installed.map((m) => ({
    value: m.name,
    label: m.name,
    hint:  isJa ? `✓ インストール済み  ${m.sizeLabel}` : `✓ installed  ${m.sizeLabel}`,
  }));

  const downloadOptions = recommended
    .filter((m) => !installedNames.has(m.name))
    .map((m) => ({
      value: m.name,
      label: m.label,
      hint:  `${isJa ? 'ダウンロード' : 'Download'}  ${m.description}`,
    }));

  const allOptions = [...installedOptions, ...downloadOptions];

  if (allOptions.length === 0) {
    note(
      isJa
        ? 'RAMが不足しているため、推奨モデルがありません。\n最低 4GB の空きRAMが必要です。'
        : 'Not enough RAM for any recommended model.\nAt least 4GB of free RAM is required.',
      isJa ? 'モデルを実行できません' : 'Cannot run models',
    );
    return { screen: 'requestTypeSelect' };
  }

  const defaultModel = await select<string>({
    message: isJa
      ? `デフォルトモデルを選択してください（インストール済み: ${installed.length} 件）`
      : `Select the default model  (${installed.length} installed)`,
    options: allOptions,
  });

  if (typeof defaultModel === 'symbol') return { screen: 'requestTypeSelect' };

  // デフォルトモデルが未インストールならダウンロード
  if (!installedNames.has(defaultModel)) {
    const ok = await confirm({
      message: isJa
        ? `${defaultModel} をダウンロードしますか？`
        : `Download ${defaultModel}?`,
      initialValue: true,
    });
    if (typeof ok === 'symbol' || !ok) return { screen: 'requestTypeSelect' };

    const ps = spinner();
    ps.start(isJa ? `${defaultModel} をダウンロード中...` : `Downloading ${defaultModel}...`);
    try {
      await pullModel(defaultModel, (status) => { ps.message(status); });
      ps.stop(isJa ? 'ダウンロード完了' : 'Download complete');
      installed.push({ name: defaultModel, size: 0, sizeLabel: '—' });
      installedNames.add(defaultModel);
    } catch {
      ps.stop(chalk.red(isJa ? 'ダウンロードに失敗しました' : 'Download failed'));
      return { screen: 'requestTypeSelect' };
    }
  }

  // ⑥ 駒ごとのカスタマイズ確認
  const doCustomize = await confirm({
    message: isJa
      ? '駒ごとに別のモデルを割り当てますか？（推奨モデルをプレビューします）'
      : 'Assign a different model per piece?  (shows recommended models)',
    initialValue: installed.length > 1,
  });

  if (typeof doCustomize === 'symbol') return { screen: 'requestTypeSelect' };

  const roleModels: Partial<Record<RoleId, string>> = {};

  if (doCustomize) {
    const installedList = installed.map((m) => m.name);

    for (const roleId of ROLE_ORDER) {
      const rec     = ROLE_RECOMMENDATIONS[roleId];
      const ranked  = rankModelsForRole(roleId, installedList);

      // 推奨1位のモデルをデフォルト選択候補に
      const bestMatch = ranked[0]?.name ?? defaultModel;

      // 選択肢：推奨付きインストール済み → 残りのインストール済み → ダウンロード候補
      const options = ranked.map((r) => {
        const sizeLabel = installed.find((m) => m.name === r.name)?.sizeLabel ?? '';
        const isTop     = r.rank === ranked[0]?.rank && r.reason !== null;
        const hint = r.reason
          ? `★ ${isJa ? r.reason.ja : r.reason.en}  ${sizeLabel}`
          : `✓ ${isJa ? 'インストール済み' : 'installed'}  ${sizeLabel}`;
        return { value: r.name, label: r.name, hint };
      });

      // ダウンロード候補（役割に推奨されているがまだ未インストール）
      const downloadable = rec.models
        .filter((m) => !installedNames.has(
          installedList.find((n) => n.toLowerCase().includes(m.keyword.toLowerCase())) ?? '',
        ))
        .slice(0, 2)
        .map((m) => ({
          value: m.keyword,
          label: m.keyword,
          hint:  `${isJa ? 'ダウンロード  ' : 'Download  '}${isJa ? m.reasonJa : m.reasonEn}`,
        }));

      const roleLabel = isJa
        ? `[${rec.nameJa} / ${rec.nameEn}]  ${rec.descJa}`
        : `[${rec.nameEn} / ${rec.nameJa}]  ${rec.descEn}`;

      const selected = await select<string>({
        message: roleLabel,
        options: [...options, ...downloadable],
        initialValue: bestMatch,
      });

      if (typeof selected === 'symbol') break;

      // ダウンロードが必要な場合
      if (!installedNames.has(selected)) {
        const ok = await confirm({
          message: isJa ? `${selected} をダウンロードしますか？` : `Download ${selected}?`,
          initialValue: true,
        });
        if (typeof ok !== 'symbol' && ok) {
          const ps = spinner();
          ps.start(isJa ? `${selected} をダウンロード中...` : `Downloading ${selected}...`);
          try {
            await pullModel(selected, (status) => { ps.message(status); });
            ps.stop(isJa ? 'ダウンロード完了' : 'Download complete');
            installedNames.add(selected);
          } catch {
            ps.stop(chalk.red(isJa ? 'ダウンロードに失敗しました。デフォルトを使用します' : 'Download failed. Using default'));
            roleModels[roleId] = defaultModel;
            continue;
          }
        } else {
          roleModels[roleId] = defaultModel;
          continue;
        }
      }

      roleModels[roleId] = selected;
    }
  }

  // ⑦ 設定を保存
  saveConfig({ localModel: defaultModel, roleModels });

  // 割り当て結果をサマリー表示
  const lines: string[] = [
    `${isJa ? 'デフォルト' : 'Default'}: ${defaultModel}`,
    '',
  ];

  if (doCustomize && Object.keys(roleModels).length > 0) {
    for (const roleId of ROLE_ORDER) {
      const rec   = ROLE_RECOMMENDATIONS[roleId];
      const model = roleModels[roleId] ?? defaultModel;
      const mark  = model === defaultModel ? chalk.dim('(default)') : chalk.cyan('◆');
      lines.push(`${rec.nameJa} ${rec.nameEn.padEnd(8)} ${mark} ${model}`);
    }
  }

  note(lines.join('\n'), isJa ? '駒モデル設定を保存しました' : 'Piece model configuration saved');

  return { screen: 'requestTypeSelect' };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
