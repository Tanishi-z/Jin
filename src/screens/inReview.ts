import { spinner } from '@clack/prompts';
import chalk from 'chalk';
import { getLocale } from '../locale/index.js';
import { getRolesForRequest } from '../routing/roleRouter.js';
import { runRole, runRoleImpl, runKinReview, runKinSummary } from '../agents/runner.js';
import { logAnalysis, logKinReview, logImpl, logKinSummary, logSessionStart, logSessionEnd } from './interactionLog.js';
import { appendActivity } from '../activity/writer.js';
import type { RoleTiming } from '../activity/writer.js';
import { runHooks, hookOutputToContext } from '../hooks/runner.js';
import { startSession, endSession } from '../activity/interactionWriter.js';
import { PROMOTION_MAP } from '../types/index.js';
import type { Mode, RequestType, NextScreen, Proposal, RoleId, RoleOutput } from '../types/index.js';

/** 駒ごとの最大リトライ回数 */
const MAX_RETRIES_PER_ROLE = 2;
/** 布陣全体のループ上限（無限ループ防止） */
const MAX_TOTAL_ITERATIONS = 12;

/** 成り駒の表示名マップ */
const PROMOTED_NAME_JA: Partial<Record<RoleId, string>> = {
  gin:    '成銀',
  hisha:  '龍王',
  kaku:   '龍馬',
  keima:  '成桂',
  kyosha: '成香',
  fu:     'と金',
};

const PROMOTED_NAME_EN: Partial<Record<RoleId, string>> = {
  gin:    'Narigin',
  hisha:  'Ryuuou',
  kaku:   'Ryuuma',
  keima:  'Narikei',
  kyosha: 'Narikyou',
  fu:     'Tokin',
};

export async function inReview(
  mode: Mode,
  requestType: RequestType,
  requestText: string,
): Promise<NextScreen> {
  const t       = getLocale(mode);
  const isJa    = mode === 'ja';
  const timings: RoleTiming[] = [];
  /** 分析フェーズの出力 */
  const analysisOutputs: Partial<Record<RoleId, RoleOutput>> = {};
  /** 実装フェーズの出力 */
  const implOutputs: Partial<Record<RoleId, RoleOutput>> = {};
  let anyMock = false;

  // インタラクションセッションを開始
  startSession(requestText, requestType);
  logSessionStart(requestText, isJa);

  // ── pre-analysis フック ──
  const preHookResults = runHooks('pre-analysis', {
    JIN_REQUEST_TYPE: requestType,
    JIN_REQUEST_TEXT: requestText,
  });
  const preHookContext = hookOutputToContext(preHookResults);
  // フック出力があればリクエストテキストに付加する
  const enrichedRequest = preHookContext
    ? `${requestText}\n\n--- フック出力 ---\n${preHookContext}`
    : requestText;

  // ── フェーズ1: 金が初期分析・布陣決定 ──
  const kinSpinner = spinner();
  kinSpinner.start(t.inReview.messages['kin']);

  const kinStart = Date.now();
  const { output: kinOutput, usedMock: kinMock } = await runRole('kin', enrichedRequest, mode);
  timings.push({ roleId: 'kin', phase: 'analysis', startMs: kinStart, endMs: Date.now() });
  analysisOutputs['kin'] = kinOutput;
  if (kinMock) anyMock = true;

  kinSpinner.stop(t.inReview.messages['kin'].replace(/\.{3}$/, ' ✓'));
  logAnalysis('kin', requestText, kinOutput, isJa);

  const activeRoles: RoleId[] = kinMock
    ? getRolesForRequest(requestType)
    : (extractFormation(kinOutput, isJa) ?? getRolesForRequest(requestType));

  // ── フェーズ2A: 分析ループ（通常の駒名） ──
  const retryCounts: Partial<Record<RoleId, number>> = {};
  const analysisQueue: RoleId[] = [...activeRoles];
  let totalIterations = 0;

  while (analysisQueue.length > 0 && totalIterations < MAX_TOTAL_ITERATIONS) {
    const roleId = analysisQueue.shift()!;
    totalIterations++;

    const s = spinner();
    s.start(t.inReview.messages[roleId]);

    const roleStart = Date.now();
    const { output, usedMock: mock } = await runRole(roleId, enrichedRequest, mode);
    timings.push({ roleId, phase: 'analysis', startMs: roleStart, endMs: Date.now() });
    analysisOutputs[roleId] = output;
    if (mock) anyMock = true;

    s.stop(t.inReview.messages[roleId].replace(/\.{3}$/, ' ✓'));
    logAnalysis(roleId, requestText, output, isJa);

    if (anyMock || kinMock) continue;

    // 金がこの駒の分析をレビュー
    const reviewSpinner = spinner();
    reviewSpinner.start(isJa ? `  金がレビュー中...` : `  Kin reviewing...`);

    const review = await runKinReview(roleId, output, requestText, mode);

    switch (review.verdict) {
      case 'approve':
        reviewSpinner.stop(isJa ? `  金: 承認 ✓` : `  Kin: approved ✓`);
        logKinReview(roleId, review, isJa);
        break;

      case 'retry': {
        const retries = (retryCounts[roleId] ?? 0) + 1;
        retryCounts[roleId] = retries;
        if (retries <= MAX_RETRIES_PER_ROLE) {
          reviewSpinner.stop(
            chalk.yellow(isJa
              ? `  金: 差し戻し（${retries}/${MAX_RETRIES_PER_ROLE}回）— ${review.reason}`
              : `  Kin: retry (${retries}/${MAX_RETRIES_PER_ROLE}) — ${review.reason}`,
            ),
          );
          logKinReview(roleId, review, isJa);
          analysisQueue.unshift(roleId);
        } else {
          reviewSpinner.stop(chalk.dim(
            isJa ? `  金: リトライ上限のため承認` : `  Kin: max retries, approving`,
          ));
          logKinReview(roleId, { ...review, verdict: 'approve', reason: isJa ? 'リトライ上限のため強制承認' : 'Force-approved at retry limit' }, isJa);
        }
        break;
      }

      case 'add': {
        reviewSpinner.stop(
          isJa
            ? `  金: 追加駒 — ${review.additionalRoles.join(', ')}`
            : `  Kin: adding — ${review.additionalRoles.join(', ')}`,
        );
        logKinReview(roleId, review, isJa);
        for (const addId of review.additionalRoles) {
          if (!analysisOutputs[addId] && !analysisQueue.includes(addId)) {
            analysisQueue.push(addId);
          }
        }
        break;
      }
    }
  }

  // ── post-analysis フック ──
  runHooks('post-analysis', {
    JIN_REQUEST_TYPE: requestType,
    JIN_REQUEST_TEXT: requestText,
    JIN_ACTIVE_ROLES: [...activeRoles].join(','),
  });

  // ── フェーズ2B: 実装ループ（成り駒名） ──
  // 分析が完了した駒（金以外）を成らせて実装フェーズへ
  const implRoles = (Object.keys(analysisOutputs) as RoleId[]).filter(
    (id) => id !== 'kin' && PROMOTION_MAP[id] !== undefined,
  );

  // ── pre-impl フック ──
  runHooks('pre-impl', {
    JIN_REQUEST_TYPE: requestType,
    JIN_REQUEST_TEXT: requestText,
    JIN_IMPL_ROLES:   implRoles.join(','),
  });

  for (const roleId of implRoles) {
    const analysis = analysisOutputs[roleId]!;
    const promotedNameJa = PROMOTED_NAME_JA[roleId] ?? roleId;
    const promotedNameEn = PROMOTED_NAME_EN[roleId] ?? roleId;

    // 成りのアナウンス
    const promoteMsg = t.inReview.promoting(
      isJa ? (getRoleNameJa(roleId)) : (getRoleNameEn(roleId)),
      isJa ? promotedNameJa : promotedNameEn,
    );
    console.log(chalk.bold(chalk.yellow(`  ${promoteMsg}`)));

    const implMsg = isJa
      ? (t.inReview.implMessages[roleId as keyof typeof t.inReview.implMessages] ?? `${promotedNameJa}が実装中...`)
      : (t.inReview.implMessages[roleId as keyof typeof t.inReview.implMessages] ?? `${promotedNameEn} implementing...`);

    const s = spinner();
    s.start(implMsg);

    const implStart = Date.now();
    const { output, usedMock: mock } = await runRoleImpl(
      roleId as Exclude<RoleId, 'kin'>,
      requestText,
      analysis,
      mode,
    );
    timings.push({ roleId, phase: 'impl', startMs: implStart, endMs: Date.now() });
    implOutputs[roleId] = output;
    if (mock) anyMock = true;

    s.stop(implMsg.replace(/\.{3}$/, ' ✓'));
    logImpl(roleId, requestText, analysis, output, isJa);
  }

  // ── post-impl フック ──
  runHooks('post-impl', {
    JIN_REQUEST_TYPE: requestType,
    JIN_REQUEST_TEXT: requestText,
  });

  if (totalIterations >= MAX_TOTAL_ITERATIONS) {
    console.log(chalk.dim(
      isJa ? '  ※ 反復上限に達したため処理を終了しました' : '  ※ Reached iteration limit',
    ));
  }

  // ── フェーズ3: 金が全体統合 ──
  // 分析 + 実装の両出力をマージして統合
  const allOutputs: Partial<Record<RoleId, RoleOutput>> = { ...analysisOutputs };
  for (const [id, out] of Object.entries(implOutputs) as [RoleId, RoleOutput][]) {
    // 実装出力があれば上書き（分析よりも実装が最終成果物）
    allOutputs[id] = out;
  }

  if (!anyMock) {
    const summarySpinner = spinner();
    summarySpinner.start(isJa ? '金が全体を統合中...' : 'Kin integrating all outputs...');

    const { output: summaryOutput, usedMock: summaryMock } =
      await runKinSummary(allOutputs, requestText, mode);

    allOutputs['kin'] = summaryOutput;
    if (summaryMock) anyMock = true;

    summarySpinner.stop(isJa ? '金が統合を完了 ✓' : 'Kin integration complete ✓');
    logKinSummary(allOutputs, requestText, summaryOutput, isJa);
  }

  if (anyMock) {
    console.log(chalk.dim(
      isJa
        ? '  ※ 一部の駒はモックデータを使用しました'
        : '  ※ Some pieces fell back to mock data',
    ));
  }

  // 処理結果を activity.json に記録（デモモードや失敗時は書き出しをスキップ）
  if (!anyMock) {
    try {
      appendActivity({
        requestType,
        requestText,
        roles: ['kin', ...activeRoles],
        timings,
        timestamp: new Date().toISOString(),
        applied: false,
      });
    } catch { /* ファイル書き出し失敗は無視してCLIを継続 */ }
  }

  // インタラクションセッションを終了
  logSessionEnd(isJa);
  endSession();

  const proposal: Proposal = {
    requestType,
    requestText,
    activeRoles: ['kin', ...activeRoles],
    summary:     buildSummary(allOutputs, isJa),
    roles:       allOutputs,
  };

  return { screen: 'proposalReady', proposal };
}

function getRoleNameJa(roleId: RoleId): string {
  const MAP: Record<RoleId, string> = {
    kin: '金', gin: '銀', hisha: '飛車', kaku: '角',
    keima: '桂馬', kyosha: '香車', fu: '歩',
  };
  return MAP[roleId];
}

function getRoleNameEn(roleId: RoleId): string {
  const MAP: Record<RoleId, string> = {
    kin: 'Kin', gin: 'Gin', hisha: 'Hisha', kaku: 'Kaku',
    keima: 'Keima', kyosha: 'Kyosha', fu: 'Fu',
  };
  return MAP[roleId];
}

/**
 * 金の出力から「布陣」セクションを読み取り、関与する駒のIDリストを返す。
 */
function extractFormation(kinOutput: RoleOutput, _isJa: boolean): RoleId[] | null {
  const section = kinOutput.sections.find((s) =>
    s.label.includes('布陣') ||
    s.label.toLowerCase().includes('formation') ||
    s.label.toLowerCase().includes('routing'),
  );

  if (!section) return null;

  const KEYWORDS: Array<[string[], RoleId]> = [
    [['銀', 'gin'],      'gin'],
    [['飛車', 'hisha'],  'hisha'],
    [['角', 'kaku'],     'kaku'],
    [['桂馬', 'keima'],  'keima'],
    [['香車', 'kyosha'], 'kyosha'],
    [['歩', 'fu'],       'fu'],
  ];

  const body  = section.body;
  const found: RoleId[] = [];

  for (const [keywords, roleId] of KEYWORDS) {
    if (keywords.some((k) => body.includes(k))) {
      found.push(roleId);
    }
  }

  return found.length > 0 ? found : null;
}

/** サマリーをロール出力の最初のセクションから生成する */
function buildSummary(
  roles: Partial<Record<RoleId, RoleOutput>>,
  isJa:  boolean,
): string[] {
  const lines: string[] = [];
  const ORDER: RoleId[] = ['kin', 'gin', 'hisha', 'kaku', 'keima', 'kyosha', 'fu'];

  for (const roleId of ORDER) {
    const output = roles[roleId];
    if (!output) continue;
    const section = output.sections.find((s) =>
      !s.label.includes('布陣') &&
      !s.label.toLowerCase().includes('formation') &&
      !s.label.includes('統合確認') &&
      !s.label.toLowerCase().includes('integration'),
    );
    if (!section) continue;
    const excerpt = section.body.split(/[。\n]/)[0]?.trim() ?? '';
    if (excerpt) lines.push(excerpt.slice(0, 100));
  }

  if (lines.length === 0) {
    lines.push(isJa ? '整理が完了しました' : 'Review complete');
  }

  return lines;
}
