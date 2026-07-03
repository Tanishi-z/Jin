import { loadConfig } from '../config.js';
import { isDemoMode } from '../demo/state.js';
import { loadProjectContext } from '../context/index.js';
import {
  ROLE_PROMPTS, IMPL_PROMPTS, KIN_REVIEW_PROMPTS, KIN_SUMMARY_PROMPTS, KIN_ELICIT_PROMPTS,
  TASK_FILE_SELECT_PROMPTS, TASK_IMPL_FORMAT, TASK_IMPL_USER,
} from '../roles/prompts.js';
import type { ElicitTurn } from '../roles/prompts.js';
import {
  buildFileTree, buildFileContext, parseSelectedFiles, parseTaskImplOutput, validateImplOutput,
} from './implParser.js';
import { routeTaskToRole } from '../routing/taskRouter.js';
import type { ImplRoleId } from '../routing/taskRouter.js';
import { FEW_SHOT_EXAMPLES } from '../roles/fewshot.js';
import {
  isLargeModel, getModelForRole,
  withCoT, withFewShot, withReAct, stripThinking,
  compressContext, parseStructuredOutput, runSelfConsistency,
} from './techniques.js';
import { findAgentForRole } from './registry.js';
import { callOllama } from './ollamaRunner.js';
import { recordCall } from './callTrace.js';
import type { Mode, RoleId, RoleOutput, JinConfig, Task, Feature, ImplResult } from '../types/index.js';

/**
 * 指定した駒（ロール）でLLMを呼び出し、RoleOutputを返す。
 *
 * テクニック適用ルール:
 *   全モデル  : A CoT プレフィックスをシステムプロンプトに追加
 *   小型モデル: A Few-Shot 出力例をユーザープロンプトに付加
 *   大型モデル: ReAct 推論ループをシステムプロンプトに追加
 *   角 (kaku) : C 自己一貫性（3視点マージ）を適用
 */
export async function runRole(
  roleId:      RoleId,
  requestText: string,
  mode:        Mode,
): Promise<{ output: RoleOutput; usedMock: boolean }> {
  if (isDemoMode()) {
    const mock = await getMockOutput(roleId, mode);
    return { output: mock, usedMock: true };
  }

  const config   = loadConfig();
  const modeKey  = mode === 'ja' ? 'ja' : 'global';
  const isJa     = mode === 'ja';

  // カスタムエージェント定義を優先して使用する
  const customAgent = findAgentForRole(roleId, 'analysis', config.activeAgents);
  const prompts     = ROLE_PROMPTS[roleId][modeKey];
  const model       = getModelForRole(roleId, config);
  const large       = isLargeModel(model);

  // システムプロンプト: カスタム定義があればそれを使用
  let system = customAgent
    ? withCoT(customAgent.systemPrompt, isJa)
    : withCoT(prompts.system, isJa);
  if (large) system = withReAct(system, isJa);

  const buildUserPrompt = (extra = '') => {
    const base = prompts.user(requestText + (extra ? `\n\n${extra}` : ''));
    if (!large) {
      const example = FEW_SHOT_EXAMPLES[roleId]?.[modeKey] ?? '';
      return example ? withFewShot(base, example, isJa) : base;
    }
    return base;
  };

  try {
    let rawText: string;

    // C: 角は自己一貫性（3視点並行）
    if (roleId === 'kaku') {
      rawText = await runSelfConsistency(
        (perspective) => callAgent(system, buildUserPrompt(perspective), config, roleId, isJa, customAgent?.model, {
          temperature: customAgent?.temperature,
          label: perspectiveLabel(perspective),
        }),
        isJa,
      );
    } else {
      rawText = await callAgent(system, buildUserPrompt(), config, roleId, isJa, customAgent?.model, {
        temperature: customAgent?.temperature,
      });
    }

    const cleaned = large ? stripThinking(rawText) : rawText;
    return { output: parseOutput(roleId, cleaned), usedMock: false };
  } catch {
    const mock = await getMockOutput(roleId, mode);
    return { output: mock, usedMock: true };
  }
}

/** callAgent の追加オプション */
interface CallAgentOptions {
  /** 推論温度（省略時 0.3） */
  temperature?: number;
  /** トレース記録用の補足ラベル（角の視点名など） */
  label?: string;
}

/**
 * 設定されたエージェントに応じてLLMを呼び出す。
 * プロジェクトコンテキストが存在する場合はシステムプロンプトの先頭に付加する。
 * 全呼び出しをトレースバッファ（callTrace.ts）に記録する。
 */
async function callAgent(
  systemPrompt: string,
  userPrompt:   string,
  config:       JinConfig,
  roleId:       RoleId,
  isJa:         boolean = true,
  customModel?: string,   // .agent.md で指定されたモデル（優先）
  opts:         CallAgentOptions = {},
): Promise<string> {
  const contextBlock = loadProjectContext(isJa);
  const fullSystem   = contextBlock
    ? `${contextBlock}\n\n${systemPrompt}`
    : systemPrompt;

  // カスタムエージェントのモデル → 駒別設定 → デフォルトの順で優先
  const model = customModel ?? config.roleModels?.[roleId] ?? config.localModel;
  if (!model) throw new Error('モデルが設定されていません。jin を起動してモデルを選択してください。');

  const temperature = opts.temperature ?? 0.3;
  const startedAt   = new Date();
  const base = {
    model, temperature,
    systemPrompt: fullSystem,
    userPrompt,
    startedAt: startedAt.toISOString(),
    label: opts.label,
  };

  try {
    const responseText = await callOllama(fullSystem, userPrompt, model, { temperature });
    recordCall({ ...base, responseText, durationMs: Date.now() - startedAt.getTime(), ok: true });
    return responseText;
  } catch (err) {
    recordCall({ ...base, durationMs: Date.now() - startedAt.getTime(), ok: false });
    throw err;
  }
}

/** 自己一貫性の視点指示文からトレース用の短いラベルを抽出する */
function perspectiveLabel(perspective: string): string {
  const m = perspective.match(/^(?:【(.+?)】|\[(.+?)\])/);
  return m?.[1] ?? m?.[2] ?? perspective.slice(0, 24);
}

/**
 * LLMの出力テキストを RoleOutput にパースする。
 * B: parseStructuredOutput（JSON + マークダウン対応）を使用。
 */
function parseOutput(roleId: RoleId, text: string): RoleOutput {
  const sections = parseStructuredOutput(roleId, text);
  return { roleId, sections };
}

/** 駒の表示名（レビュープロンプト用） */
const ROLE_NAMES: Record<RoleId, { ja: string; en: string }> = {
  kin:    { ja: '金',   en: 'Kin' },
  gin:    { ja: '銀',   en: 'Gin' },
  hisha:  { ja: '飛車', en: 'Hisha' },
  kaku:   { ja: '角',   en: 'Kaku' },
  keima:  { ja: '桂馬', en: 'Keima' },
  kyosha: { ja: '香車', en: 'Kyosha' },
  fu:     { ja: '歩',   en: 'Fu' },
};

export type KinVerdict = 'approve' | 'retry' | 'add';

export interface KinReviewResult {
  verdict: KinVerdict;
  reason: string;
  /** verdict='retry' の場合の修正指示、verdict='add' の場合は追加駒IDのカンマ区切り */
  instructions: string;
  /** verdict='add' の場合にパースされた追加駒IDリスト */
  additionalRoles: RoleId[];
}

/**
 * 金が駒の出力をレビューし、承認・差し戻し・追加を判定する。
 * デモモードや失敗時は常に「承認」を返す。
 */
export async function runKinReview(
  roleId:      RoleId,
  roleOutput:  RoleOutput,
  requestText: string,
  mode:        Mode,
): Promise<KinReviewResult> {
  const APPROVE: KinReviewResult = {
    verdict: 'approve', reason: '', instructions: '', additionalRoles: [],
  };

  // デモモードは常に承認
  if (isDemoMode()) return APPROVE;

  const config   = loadConfig();
  const modeKey  = mode === 'ja' ? 'ja' : 'global';
  const prompts  = KIN_REVIEW_PROMPTS[modeKey];
  const names    = ROLE_NAMES[roleId];

  // 駒の出力をテキストに変換
  const outputText = roleOutput.sections
    .map((s) => `## ${s.label}\n${s.body}`)
    .join('\n\n');

  try {
    const rawText = await callAgent(
      prompts.system,
      prompts.user({
        requestText,
        roleId,
        roleNameJa: names.ja,
        roleNameEn: names.en,
        roleOutput: outputText,
      }),
      config,
      'kin',
    );

    return parseKinReview(rawText);
  } catch {
    return APPROVE;
  }
}

/** 金のレビュー出力をパースする */
function parseKinReview(text: string): KinReviewResult {
  const parts = text.split(/^## /m).filter(Boolean);
  const get = (label: string) => {
    const part = parts.find((p) => p.toLowerCase().startsWith(label));
    return part ? part.split('\n').slice(1).join('\n').trim() : '';
  };

  const verdictRaw = get('判定') || get('verdict');
  const reason     = get('理由') || get('reason');
  const instructions = get('指示') || get('instructions');

  let verdict: KinVerdict = 'approve';
  if (/差し戻し|retry/i.test(verdictRaw)) verdict = 'retry';
  else if (/追加|add/i.test(verdictRaw)) verdict = 'add';

  // 追加駒IDをパース
  const VALID_IDS: RoleId[] = ['gin', 'hisha', 'kaku', 'keima', 'kyosha', 'fu'];
  const additionalRoles: RoleId[] = verdict === 'add'
    ? instructions
        .split(/[,、\s]+/)
        .map((s) => s.trim().toLowerCase())
        .filter((s): s is RoleId => VALID_IDS.includes(s as RoleId))
    : [];

  return { verdict, reason, instructions, additionalRoles };
}

/**
 * 金が全駒の出力を統合し、最終実行計画を生成する。
 * デモモードや失敗時はモックを返す。
 */
export async function runKinSummary(
  roles:       Partial<Record<RoleId, RoleOutput>>,
  requestText: string,
  mode:        Mode,
): Promise<{ output: RoleOutput; usedMock: boolean }> {
  if (isDemoMode()) {
    const mock = await getMockOutput('kin', mode);
    return { output: mock, usedMock: true };
  }

  const config  = loadConfig();
  const modeKey = mode === 'ja' ? 'ja' : 'global';
  const prompts = KIN_SUMMARY_PROMPTS[modeKey];

  // 全駒の出力を結合
  const allOutputs = (Object.entries(roles) as [RoleId, RoleOutput][])
    .filter(([, v]) => v !== undefined)
    .map(([id, output]) => {
      const names = ROLE_NAMES[id];
      const body = output.sections.map((s) => `## ${s.label}\n${s.body}`).join('\n\n');
      return `### ${names.ja}（${names.en}）\n${body}`;
    })
    .join('\n\n---\n\n');

  try {
    const rawText = await callAgent(
      prompts.system,
      prompts.user({ requestText, allOutputs }),
      config,
      'kin',
    );
    return { output: parseOutput('kin', rawText), usedMock: false };
  } catch {
    const mock = await getMockOutput('kin', mode);
    return { output: mock, usedMock: true };
  }
}

export interface KinElicitResult {
  /** 金からユーザーへのメッセージ（質問や確認） */
  message: string;
  /** 要件が揃ったか */
  isComplete: boolean;
  /** isComplete=true の場合の要件サマリー */
  requirementsSummary: string;
}

/**
 * 要件定義対話の1ターンを実行する。
 * デモモード時はサンプルの質問を返す。
 */
export async function runKinElicit(
  turns:  ElicitTurn[],
  mode:   Mode,
): Promise<KinElicitResult> {
  const DEMO_RESULT: KinElicitResult = {
    message:             mode === 'ja'
      ? '要件が揃いました。このまま進めます。'
      : 'Requirements gathered. Proceeding.',
    isComplete:          true,
    requirementsSummary: mode === 'ja'
      ? turns.map((t) => t.content).join(' / ')
      : turns.map((t) => t.content).join(' / '),
  };

  if (isDemoMode()) return DEMO_RESULT;

  const config  = loadConfig();
  const modeKey = mode === 'ja' ? 'ja' : 'global';
  const prompts = KIN_ELICIT_PROMPTS[modeKey];

  try {
    const rawText = await callAgent(prompts.system, prompts.user(turns), config, 'kin');
    return parseKinElicit(rawText);
  } catch {
    return DEMO_RESULT;
  }
}

/** 金の対話出力をパースする */
function parseKinElicit(text: string): KinElicitResult {
  const parts = text.split(/^## /m).filter(Boolean);
  const get = (label: string) => {
    const part = parts.find((p) => p.toLowerCase().startsWith(label));
    return part ? part.split('\n').slice(1).join('\n').trim() : '';
  };

  const message    = get('メッセージ') || get('message');
  const statusRaw  = get('状態')       || get('status');
  const summary    = get('要件サマリー') || get('requirements summary');

  const isComplete = /complete/i.test(statusRaw);

  return {
    message:             message || text.trim(),
    isComplete,
    requirementsSummary: summary,
  };
}

/**
 * 実装フェーズ（成り駒）でLLMを呼び出す。
 * 分析フェーズの出力をコンテキストとして受け取り、実際のコード・ドキュメントを生成する。
 * デモモードや失敗時はモックにフォールバック。
 */
export async function runRoleImpl(
  roleId:         Exclude<RoleId, 'kin'>,
  requestText:    string,
  analysisOutput: RoleOutput,
  mode:           Mode,
): Promise<{ output: RoleOutput; usedMock: boolean }> {
  if (isDemoMode()) {
    const mock = await getMockOutput(roleId, mode);
    return { output: mock, usedMock: true };
  }

  const config      = loadConfig();
  const modeKey     = mode === 'ja' ? 'ja' : 'global';
  const isJa        = mode === 'ja';
  const customAgent = findAgentForRole(roleId, 'impl', config.activeAgents);
  const prompts     = IMPL_PROMPTS[roleId][modeKey];
  const model       = getModelForRole(roleId, config);
  const large       = isLargeModel(model);

  const fullAnalysis = analysisOutput.sections
    .map((s) => `## ${s.label}\n${s.body}`)
    .join('\n\n');
  const analysisText = large ? fullAnalysis : compressContext(fullAnalysis);

  let system = customAgent
    ? withCoT(customAgent.systemPrompt, isJa)
    : withCoT(prompts.system, isJa);
  if (large) system = withReAct(system, isJa);

  const userPrompt = prompts.user({ requestText, analysisOutput: analysisText });

  try {
    const rawText = await callAgent(system, userPrompt, config, roleId, isJa, customAgent?.model, {
      temperature: customAgent?.temperature,
    });
    const cleaned = large ? stripThinking(rawText) : rawText;
    return { output: parseOutput(roleId, cleaned), usedMock: false };
  } catch {
    const mock = await getMockOutput(roleId, mode);
    return { output: mock, usedMock: true };
  }
}

/** runTaskImpl の結果 */
export interface TaskImplRunResult {
  result: ImplResult;
  /** LLM呼び出し自体に失敗した場合 true（結果の files は空） */
  failed: boolean;
  /** 実装を担当した駒（成り駒の元ID） */
  roleId: ImplRoleId;
}

/**
 * 「手順を実装する」フローの実装ランナー。
 * 1. タスク内容から担当駒を決定
 * 2. LLMに読むべき既存ファイルを選定させる
 * 3. 選定ファイルの実内容とともに実装を依頼し、FileChange[] にパースする
 * 出力が不完全な場合は矯正指示付きで1回だけ再試行する。
 * 失敗時はモックに落とさず、files: [] と説明のみを返す（偽コードの適用事故を防ぐ）。
 */
export async function runTaskImpl(
  task:              Task,
  feature:           Feature,
  mode:              Mode,
  extraInstruction?: string,
): Promise<TaskImplRunResult> {
  const config      = loadConfig();
  const modeKey     = mode === 'ja' ? 'ja' : 'global';
  const isJa        = mode === 'ja';
  const roleId      = routeTaskToRole(task, feature);
  const customAgent = findAgentForRole(roleId, 'impl', config.activeAgents);

  const emptyResult = (explanation: string): ImplResult => ({ task, files: [], explanation });

  // ── 1. ファイル選定コール ──
  let selectedFiles: string[] = [];
  const fileTree = buildFileTree();
  try {
    const selectPrompts = TASK_FILE_SELECT_PROMPTS[modeKey];
    const selectRaw = await callAgent(
      selectPrompts.system,
      selectPrompts.user({
        taskTitle:    task.title,
        taskDetail:   task.detail ?? '',
        featureTitle: feature.title,
        fileTree,
      }),
      config, roleId, isJa, customAgent?.model,
      { temperature: 0.2, label: isJa ? 'ファイル選定' : 'file selection' },
    );
    selectedFiles = parseSelectedFiles(selectRaw);
  } catch {
    // 選定失敗はファイルコンテキスト無しで続行する
    selectedFiles = [];
  }

  // ── 2. 実装コール（検証NG時は矯正指示付きで1回だけ再試行） ──
  const persona = customAgent?.systemPrompt ?? IMPL_PROMPTS[roleId][modeKey].system;
  const system  = `${persona}\n${TASK_IMPL_FORMAT[modeKey]}`;

  const buildParams = (correction?: string) => TASK_IMPL_USER[modeKey]({
    taskTitle:          task.title,
    taskDetail:         task.detail ?? '',
    featureTitle:       feature.title,
    featureDescription: feature.description ?? '',
    fileContext:        buildFileContext(selectedFiles),
    extraInstruction:   [extraInstruction, correction].filter(Boolean).join('\n'),
  });

  try {
    let rawText = await callAgent(system, buildParams(), config, roleId, isJa, customAgent?.model, {
      temperature: customAgent?.temperature ?? 0.2,
    });
    let parsed = parseTaskImplOutput(stripThinking(rawText));
    let problem = validateImplOutput(parsed, isJa);

    if (problem) {
      rawText = await callAgent(system, buildParams(problem), config, roleId, isJa, customAgent?.model, {
        temperature: customAgent?.temperature ?? 0.2,
        label: isJa ? '再試行' : 'retry',
      });
      parsed  = parseTaskImplOutput(stripThinking(rawText));
      problem = validateImplOutput(parsed, isJa);
    }

    if (problem) {
      // 2回とも不完全: 生出力を説明として返し、ファイルは適用させない
      const header = isJa
        ? '出力の解析に失敗したため、ファイル変更は生成されませんでした。LLMの出力:\n\n'
        : 'Failed to parse the output; no file changes were generated. Raw LLM output:\n\n';
      return { result: emptyResult(header + rawText.trim()), failed: false, roleId };
    }

    return {
      result: { task, files: parsed.files, explanation: parsed.explanation || (isJa ? '（説明なし）' : '(no explanation)') },
      failed: false,
      roleId,
    };
  } catch {
    const msg = isJa
      ? 'LLMの呼び出しに失敗しました。Ollama が起動しているか確認してください（ollama serve）。'
      : 'LLM call failed. Make sure Ollama is running (ollama serve).';
    return { result: emptyResult(msg), failed: true, roleId };
  }
}

/** モックデータを返す（動的インポートでバンドルサイズを抑える） */
async function getMockOutput(roleId: RoleId, mode: Mode): Promise<RoleOutput> {
  const modeKey = mode === 'ja' ? 'ja' : 'global';

  const mockMap = {
    kin:    () => import('../roles/kin.js').then((m) => m.kinOutput[modeKey]),
    gin:    () => import('../roles/gin.js').then((m) => m.ginOutput[modeKey]),
    hisha:  () => import('../roles/hisha.js').then((m) => m.hishaOutput[modeKey]),
    kaku:   () => import('../roles/kaku.js').then((m) => m.kakuOutput[modeKey]),
    keima:  () => import('../roles/keima.js').then((m) => m.keimaOutput[modeKey]),
    kyosha: () => import('../roles/kyosha.js').then((m) => m.kyoshaOutput[modeKey]),
    fu:     () => import('../roles/fu.js').then((m) => m.fuOutput[modeKey]),
  };

  return mockMap[roleId]();
}
