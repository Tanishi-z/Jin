import { loadConfig } from '../config.js';
import { isDemoMode } from '../demo/state.js';
import { loadProjectContext } from '../context/index.js';
import { ROLE_PROMPTS, IMPL_PROMPTS, KIN_REVIEW_PROMPTS, KIN_SUMMARY_PROMPTS, KIN_ELICIT_PROMPTS } from '../roles/prompts.js';
import type { ElicitTurn } from '../roles/prompts.js';
import { FEW_SHOT_EXAMPLES } from '../roles/fewshot.js';
import {
  isLargeModel, getModelForRole,
  withCoT, withFewShot, withReAct, stripThinking,
  compressContext, parseStructuredOutput, runSelfConsistency,
} from './techniques.js';
import { findAgentForRole } from './registry.js';
import { callOllama } from './ollamaRunner.js';
import type { Mode, RoleId, RoleOutput, JinConfig } from '../types/index.js';

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
        (perspective) => callAgent(system, buildUserPrompt(perspective), config, roleId, isJa, customAgent?.model),
        isJa,
      );
    } else {
      rawText = await callAgent(system, buildUserPrompt(), config, roleId, isJa, customAgent?.model);
    }

    const cleaned = large ? stripThinking(rawText) : rawText;
    return { output: parseOutput(roleId, cleaned), usedMock: false };
  } catch {
    const mock = await getMockOutput(roleId, mode);
    return { output: mock, usedMock: true };
  }
}

/**
 * 設定されたエージェントに応じてLLMを呼び出す。
 * プロジェクトコンテキストが存在する場合はシステムプロンプトの先頭に付加する。
 */
async function callAgent(
  systemPrompt: string,
  userPrompt:   string,
  config:       JinConfig,
  roleId:       RoleId,
  isJa:         boolean = true,
  customModel?: string,   // .agent.md で指定されたモデル（優先）
): Promise<string> {
  const contextBlock = loadProjectContext(isJa);
  const fullSystem   = contextBlock
    ? `${contextBlock}\n\n${systemPrompt}`
    : systemPrompt;

  // カスタムエージェントのモデル → 駒別設定 → デフォルトの順で優先
  const model = customModel ?? config.roleModels?.[roleId] ?? config.localModel;
  if (!model) throw new Error('モデルが設定されていません。jin を起動してモデルを選択してください。');
  return callOllama(fullSystem, userPrompt, model);
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
    const rawText = await callAgent(system, userPrompt, config, roleId, isJa, customAgent?.model);
    const cleaned = large ? stripThinking(rawText) : rawText;
    return { output: parseOutput(roleId, cleaned), usedMock: false };
  } catch {
    const mock = await getMockOutput(roleId, mode);
    return { output: mock, usedMock: true };
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
