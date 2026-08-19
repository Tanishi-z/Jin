import { outro, note } from '@clack/prompts';
import chalk from 'chalk';
import fs from 'fs';
import path from 'path';
import { homedir } from 'os';
import { printLogo } from './logo.js';
import { isUsableLocally } from './system/ollamaScrape.js';
import { fetchMergedCatalog } from './system/catalogFetch.js';
import { loadModelCache, saveModelCache, isFresh } from './system/modelCache.js';
import { AGENT_TEMPLATES } from './agents/templates.js';
import { SKILL_TEMPLATES } from './skills/templates.js';
import { HOOKS_TEMPLATE } from './hooks/templates.js';
import { modeSelect }        from './screens/modeSelect.js';
import { agentSelect }       from './screens/agentSelect.js';
import { settingsMenu }      from './screens/settingsMenu.js';
import { localLLMSetup }     from './screens/localLLMSetup.js';
import { roleModelAssign }   from './screens/roleModelAssign.js';
import { requestTypeSelect }   from './screens/requestTypeSelect.js';
import { requirementsDialog }  from './screens/requirementsDialog.js';
import { requestInput }        from './screens/requestInput.js';
import { requestConfirm }    from './screens/requestConfirm.js';
import { inReview }          from './screens/inReview.js';
import { proposalReady }     from './screens/proposalReady.js';
import { fullProposal }      from './screens/fullProposal.js';
import { roleReview }        from './screens/roleReview.js';
import { docPreview }        from './screens/docPreview.js';
import { applied }           from './screens/applied.js';
import { taskSelect }        from './screens/taskSelect.js';
import { implementing }      from './screens/implementing.js';
import { diffReview }        from './screens/diffReview.js';
import { implemented }       from './screens/implemented.js';
import { agentManager }      from './screens/agentManager.js';
import { loadConfig, saveConfig } from './config.js';
import { startDashboard } from './dashboard/server.js';
import { setDemoMode, setDemoLocaleMode } from './demo/state.js';
import type { Mode, NextScreen } from './types/index.js';

export interface CliOptions {
  /** デモモードで起動する（config読み書き・ファイル書き込みをスキップ） */
  demo?: boolean;
}

/** `jin agent init` — .jin/agents/ にサンプル .agent.md を生成する */
export async function agentInit(): Promise<void> {
  const dir = path.join(process.cwd(), '.jin', 'agents');
  fs.mkdirSync(dir, { recursive: true });

  let created = 0;
  for (const [filename, content] of Object.entries(AGENT_TEMPLATES)) {
    const filePath = path.join(dir, filename);
    if (fs.existsSync(filePath)) {
      console.log(chalk.dim(`  スキップ（既存）: ${filePath}`));
      continue;
    }
    fs.writeFileSync(filePath, content, 'utf-8');
    console.log(chalk.green(`  作成: ${filePath}`));
    created++;
  }

  note(
    [
      `${created} 件のサンプルを生成しました。`,
      '',
      `ディレクトリ: ${dir}`,
      '',
      '各ファイルを編集してカスタマイズしてください。',
      '`jin` を起動して「エージェントを管理する」から有効化できます。',
    ].join('\n'),
    'jin agent init',
  );
}

/** `jin skill init` — .jin/skills/ にサンプル .skill.md を生成する */
export async function skillInit(): Promise<void> {
  const dir = path.join(process.cwd(), '.jin', 'skills');
  fs.mkdirSync(dir, { recursive: true });

  let created = 0;
  for (const [filename, content] of Object.entries(SKILL_TEMPLATES)) {
    const filePath = path.join(dir, filename);
    if (fs.existsSync(filePath)) {
      console.log(chalk.dim(`  スキップ（既存）: ${filePath}`));
      continue;
    }
    fs.writeFileSync(filePath, content, 'utf-8');
    console.log(chalk.green(`  作成: ${filePath}`));
    created++;
  }

  note(
    [
      `${created} 件のサンプルスキルを生成しました。`,
      '',
      `ディレクトリ: ${dir}`,
      '',
      '各ファイルを編集してカスタマイズしてください。',
      '要求入力時に /trigger-name で呼び出せます。',
    ].join('\n'),
    'jin skill init',
  );
}

/** `jin hook init` — .jin/hooks.json を生成する */
export async function hookInit(): Promise<void> {
  const dir      = path.join(process.cwd(), '.jin');
  const filePath = path.join(dir, 'hooks.json');
  fs.mkdirSync(dir, { recursive: true });

  if (fs.existsSync(filePath)) {
    console.log(chalk.dim(`  スキップ（既存）: ${filePath}`));
  } else {
    fs.writeFileSync(filePath, HOOKS_TEMPLATE, 'utf-8');
    console.log(chalk.green(`  作成: ${filePath}`));
  }

  note(
    [
      'hooks.json を生成しました。',
      '',
      `ファイル: ${filePath}`,
      '',
      'コメントアウトされたコマンドを参考に編集してください。',
      '各イベントで実行するシェルコマンドを配列で指定します。',
    ].join('\n'),
    'jin hook init',
  );
}

/** `jin model update` — ollama.com から最新モデル情報を取得しキャッシュを更新する */
export async function modelUpdate(force: boolean): Promise<void> {
  const cache = force ? null : loadModelCache();
  if (cache && isFresh(cache)) {
    note(
      [
        'キャッシュはまだ新しい（24時間以内）ため取得をスキップしました。',
        '強制的に取得する場合は `jin model update --force` を実行してください。',
      ].join('\n'),
      'jin model update',
    );
    return;
  }

  console.log(chalk.dim('  ollama.com から最新モデル情報を取得しています...'));

  let models: Awaited<ReturnType<typeof fetchMergedCatalog>>['models'];
  let complete: boolean;
  try {
    ({ models, complete } = await fetchMergedCatalog());
  } catch {
    note(
      'ollama.com への接続に失敗しました。ネットワーク接続を確認してください。',
      'jin model update',
    );
    return;
  }

  const localCount = models.filter(isUsableLocally).length;
  saveModelCache(models, complete ? 'full' : 'partial');

  note(
    [
      `取得 ${models.length} 件 / ローカル実行可 ${localCount} 件`,
      `保存先: ${path.join(homedir(), '.jin', 'model-cache.json')}`,
    ].join('\n'),
    'jin model update',
  );
}

export async function cli(options: CliOptions = {}): Promise<void> {
  const isDemo = options.demo ?? false;

  // デモモードを有効化
  if (isDemo) setDemoMode(true);

  const config = isDemo ? {} : loadConfig();

  // モード選択（未設定の場合のみ）
  let mode: Mode;
  if (config.mode) {
    mode = config.mode;
  } else {
    mode = await modeSelect();
    if (!isDemo) saveConfig({ mode });
  }

  // デモモード時はlocaleをstateに保存
  if (isDemo) setDemoLocaleMode(mode);

  // ダッシュボードをバックグラウンドで起動
  startDashboard();

  // ロゴ + タグラインを表示
  printLogo();
  console.log('');
  console.log(chalk.dim(mode === 'ja'
    ? 'あなたの次の一手を、布陣で支える'
    : 'Jin helps you decide the next move.',
  ));
  console.log('');

  // デモモードのバナーを表示
  if (isDemo) {
    note(
      mode === 'ja'
        ? 'ファイルへの書き込みは行われません。すべての操作は安全に試せます。'
        : 'No files will be written. All actions are safe to explore.',
      mode === 'ja' ? '── デモモード ──' : '── Demo Mode ──',
    );
    console.log('');
  }

  // ローカルLLM未設定なら初回セットアップへ
  const firstScreen: NextScreen = (isDemo || config.localModel)
    ? { screen: 'requestTypeSelect' }
    : { screen: 'localLLMSetup' };

  let next: NextScreen = firstScreen;

  while (true) {
    switch (next.screen) {
      case 'agentManager':
        next = await agentManager(mode);
        break;

      case 'settingsMenu':
        next = await settingsMenu(mode);
        break;

      case 'localLLMSetup':
        next = await localLLMSetup(mode);
        break;

      case 'roleModelAssign':
        next = await roleModelAssign(mode);
        break;

      case 'requestTypeSelect':
        next = await requestTypeSelect(mode);
        break;

      case 'requirementsDialog':
        next = await requirementsDialog(mode);
        break;

      case 'requestInput':
        next = await requestInput(mode, next.requestType);
        break;

      case 'requestConfirm':
        next = await requestConfirm(mode, next.requestType, next.requestText);
        break;

      case 'inReview':
        next = await inReview(mode, next.requestType, next.requestText);
        break;

      case 'proposalReady':
        next = await proposalReady(mode, next.proposal);
        break;

      case 'fullProposal':
        next = await fullProposal(mode, next.proposal);
        break;

      case 'roleReview':
        next = await roleReview(mode, next.roleId, next.proposal);
        break;

      case 'docPreview':
        next = await docPreview(mode, next.proposal);
        break;

      case 'applied':
        next = await applied(mode);
        break;

      case 'taskSelect':
        next = await taskSelect(mode, next.feature);
        break;

      case 'implementing':
        next = await implementing(mode, next.task, next.feature, next.instruction);
        break;

      case 'diffReview':
        next = await diffReview(mode, next.result, next.feature);
        break;

      case 'implemented':
        next = await implemented(mode, next.task);
        break;

      case 'exit':
        outro(chalk.dim(mode === 'ja' ? '終了します。' : 'Goodbye.'));
        process.exit(0);
    }
  }
}
