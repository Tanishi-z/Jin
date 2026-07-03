import chalk from 'chalk';
import type { RoleId, RoleOutput, Task, ImplResult } from '../types/index.js';
import { PROMOTION_MAP } from '../types/index.js';
import type { KinReviewResult } from '../agents/runner.js';
import { drainCalls } from '../agents/callTrace.js';
import type { LlmCallRecord } from '../agents/callTrace.js';
import { addEvent } from '../activity/interactionWriter.js';
import { broadcast } from '../dashboard/eventBus.js';

// ── 定数 ─────────────────────────────────────────────────────────────────────

const WIDTH = 72;

// ── 駒の表示名 ────────────────────────────────────────────────────────────────

const ROLE_LABEL: Record<RoleId, { ja: string; en: string }> = {
  kin:    { ja: '金（Kin）',     en: 'Kin' },
  gin:    { ja: '銀（Gin）',     en: 'Gin' },
  hisha:  { ja: '飛車（Hisha）', en: 'Hisha' },
  kaku:   { ja: '角（Kaku）',   en: 'Kaku' },
  keima:  { ja: '桂馬（Keima）', en: 'Keima' },
  kyosha: { ja: '香車（Kyosha）',en: 'Kyosha' },
  fu:     { ja: '歩（Fu）',      en: 'Fu' },
};

const PROMOTED_LABEL: Partial<Record<RoleId, { ja: string; en: string }>> = {
  gin:    { ja: '成銀（Narigin）',   en: 'Narigin' },
  hisha:  { ja: '龍王（Ryuuou）',    en: 'Ryuuou' },
  kaku:   { ja: '龍馬（Ryuuma）',    en: 'Ryuuma' },
  keima:  { ja: '成桂（Narikei）',   en: 'Narikei' },
  kyosha: { ja: '成香（Narikyou）',  en: 'Narikyou' },
  fu:     { ja: 'と金（Tokin）',     en: 'Tokin' },
};

// ── 駒のセリフ ────────────────────────────────────────────────────────────────

const ANALYSIS_VOICE: Record<RoleId, { ja: string; en: string }> = {
  kin:    { ja: '構想を受け取った。目的・制約・布陣を整理する。',          en: 'Vision received. Clarifying goals, constraints, and formation.' },
  gin:    { ja: 'ユーザーの動線を読む。迷わせない体験を設計する。',         en: 'Reading user flow. Designing an intuitive experience.' },
  hisha:  { ja: '実装に落とし込む。ファイルと手順を明確にする。',           en: 'Breaking it down to code. Defining files and steps.' },
  kaku:   { ja: '穴を探す。見落とされがちなリスクを洗い出す。',             en: 'Looking for gaps. Surfacing risks that are easy to miss.' },
  keima:  { ja: 'データの骨格を設計する。スキーマとAPIの整合を取る。',      en: 'Designing the data backbone. Aligning schema and API contracts.' },
  kyosha: { ja: '脅威を想定する。権限の抜け穴と攻撃経路を特定する。',       en: 'Assuming threats. Identifying privilege gaps and attack vectors.' },
  fu:     { ja: '手順を整える。実装者が迷わないよう順序立てる。',           en: 'Organizing steps. Laying out a clear path for the implementer.' },
};

const IMPL_VOICE: Partial<Record<RoleId, { ja: string; en: string }>> = {
  gin:    { ja: '設計を実装に変える。コンポーネントを組み上げる。',         en: 'Turning design into code. Building the components.' },
  hisha:  { ja: 'アーキテクチャを刻む。ルーターとサービスを実装する。',      en: 'Carving out the architecture. Implementing routers and services.' },
  kaku:   { ja: 'テストで品質を担保する。リファクタリング箇所も指摘する。', en: 'Locking quality with tests. Flagging refactoring candidates too.' },
  keima:  { ja: 'スキーマとクエリを実装する。マイグレーションに注意する。',  en: 'Implementing schema and queries. Careful with migrations.' },
  kyosha: { ja: '認可を実装する。監査ログと入力検証を確実に組み込む。',      en: 'Implementing authorization. Baking in audit logs and validation.' },
  fu:     { ja: 'ドキュメントを生成する。README・仕様・チェックリストを整える。', en: 'Generating docs. README, spec, and checklist — all in order.' },
};

const KIN_REVIEW_VOICE: Record<'approve' | 'retry' | 'add', { ja: string; en: string }> = {
  approve: { ja: 'よし。問題ない。次へ進む。',               en: 'Good. No issues. Proceed.' },
  retry:   { ja: '待て。まだ不十分だ。修正して出し直せ。',   en: 'Hold on. Not sufficient. Revise and resubmit.' },
  add:     { ja: 'この案件には駒が足りない。布陣を拡大する。', en: 'This needs more pieces. Expanding the formation.' },
};

const KIN_SUMMARY_VOICE = {
  ja: '全駒の出力を俯瞰する。矛盾を解消し、実行計画に統合する。',
  en: 'Taking a bird\'s-eye view of all pieces. Resolving conflicts and forming the execution plan.',
};

// ── 描画ユーティリティ ────────────────────────────────────────────────────────

function hr(char = '─'): string { return char.repeat(WIDTH); }
function row(content = ''): void { console.log(`${chalk.dim('│')} ${content}`); }

function head(color: (s: string) => string, left: string, right = ''): void {
  const gap = WIDTH - left.length - right.length - 1;
  console.log(color(`┌─ ${left}${gap > 0 ? ' ' + '─'.repeat(gap) : ''} ${right}`));
}

function sub(color: (s: string) => string, label: string): void {
  const bar = hr().slice(label.length + 4);
  console.log(color(`├─ ${label} ${bar}`));
}

function foot(): void { console.log(chalk.dim(`└${hr()}`)); }

function ex(text: string, max = WIDTH - 4): string {
  const flat = text.replace(/\s+/g, ' ').trim();
  return flat.length > max ? `${flat.slice(0, max)}…` : flat;
}

// ── イベント送出ヘルパー ──────────────────────────────────────────────────────

function emit(partial: Parameters<typeof addEvent>[0]): void {
  const event = addEvent(partial);
  if (event) broadcast(event);
}

/**
 * トレースバッファからLLM呼び出し記録を回収し、イベント添付用の
 * フィールド（llmCalls / model / durationMs）にまとめる。
 * 呼び出しが無い（デモ・モック）場合は空オブジェクトを返す。
 */
function collectTrace(): { llmCalls?: LlmCallRecord[]; model?: string; durationMs?: number } {
  const calls = drainCalls();
  if (calls.length === 0) return {};
  return {
    llmCalls:   calls,
    model:      calls[calls.length - 1].model,
    durationMs: calls.reduce((sum, c) => sum + c.durationMs, 0),
  };
}

/** TUIにモデル名と所要時間の行を表示する（呼び出しが無い場合は何もしない） */
function rowTrace(trace: ReturnType<typeof collectTrace>): void {
  if (!trace.model) return;
  const secs = ((trace.durationMs ?? 0) / 1000).toFixed(1);
  row(chalk.dim(`⚙ ${trace.model} · ${secs}s`));
}

// ── 公開 API ──────────────────────────────────────────────────────────────────

export function logAnalysis(roleId: RoleId, requestText: string, output: RoleOutput, isJa: boolean): void {
  const label = isJa ? ROLE_LABEL[roleId].ja : ROLE_LABEL[roleId].en;
  const voice = isJa ? ANALYSIS_VOICE[roleId].ja : ANALYSIS_VOICE[roleId].en;
  const phase = isJa ? '分析' : 'analysis';
  const trace = collectTrace();

  // ターミナル表示
  console.log('');
  head(chalk.cyan, `${label}  ─  ${phase}`);
  row(chalk.italic(chalk.white(`「${voice}」`)));
  row();
  sub(chalk.dim, isJa ? '受信' : 'in');
  row(chalk.dim(`${isJa ? '要求' : 'req'}: `) + ex(requestText));
  row();
  sub(chalk.dim, isJa ? '返却' : 'out');
  for (const sec of output.sections) {
    row(chalk.yellow(`[${sec.label}]`) + '  ' + chalk.white(ex(sec.body, WIDTH - sec.label.length - 6)));
  }
  rowTrace(trace);
  foot();

  // ログ書き込み + SSE（金自身の分析は user からの受領として扱う）
  emit({
    type: 'analysis', roleId, roleLabel: label, voice, phase, requestText, sections: output.sections,
    from: roleId === 'kin' ? 'user' : roleId, to: 'kin', ...trace,
  });
}

export function logKinReview(targetRoleId: RoleId, review: KinReviewResult, isJa: boolean): void {
  const target = isJa ? ROLE_LABEL[targetRoleId].ja : ROLE_LABEL[targetRoleId].en;
  const voice  = isJa ? KIN_REVIEW_VOICE[review.verdict].ja : KIN_REVIEW_VOICE[review.verdict].en;
  const title  = isJa ? `金 → ${target}  ─  レビュー` : `Kin → ${target}  ─  review`;
  const trace  = collectTrace();

  const verdictColor =
    review.verdict === 'approve' ? chalk.green  :
    review.verdict === 'retry'   ? chalk.yellow : chalk.blue;
  const verdictText =
    review.verdict === 'approve' ? (isJa ? '承認' : 'approved') :
    review.verdict === 'retry'   ? (isJa ? '差し戻し' : 'retry') :
                                   (isJa ? '追加' : 'add');

  // ターミナル表示
  console.log('');
  head(chalk.magenta, title);
  row(chalk.italic(chalk.white(`「${voice}」`)));
  row();
  row((isJa ? '判定: ' : 'verdict: ') + verdictColor(verdictText));
  if (review.reason)       row(chalk.dim((isJa ? '理由: ' : 'reason: ')       + ex(review.reason)));
  if (review.instructions && review.verdict !== 'approve')
                            row(chalk.dim((isJa ? '指示: ' : 'instructions: ') + ex(review.instructions)));
  if (review.additionalRoles.length > 0)
                            row(chalk.dim((isJa ? '追加駒: ' : 'add pieces: ') + review.additionalRoles.join(', ')));
  rowTrace(trace);
  foot();

  // ログ書き込み + SSE
  emit({
    type: 'kin-review', roleId: 'kin', roleLabel: isJa ? '金（Kin）' : 'Kin', voice,
    phase: isJa ? 'レビュー' : 'review',
    verdict: review.verdict, reason: review.reason,
    instructions: review.instructions, additionalRoles: review.additionalRoles,
    targetRoleId, from: 'kin', to: targetRoleId, ...trace,
  });
}

export function logImpl(roleId: RoleId, requestText: string, analysis: RoleOutput, output: RoleOutput, isJa: boolean): void {
  const labelDef = PROMOTED_LABEL[roleId] ?? ROLE_LABEL[roleId];
  const label    = isJa ? labelDef.ja : labelDef.en;
  const voiceDef = IMPL_VOICE[roleId] ?? ANALYSIS_VOICE[roleId];
  const voice    = isJa ? voiceDef.ja : voiceDef.en;
  const phase    = isJa ? '実装' : 'implementation';
  const trace    = collectTrace();

  // ターミナル表示
  console.log('');
  head(chalk.green, `${label}  ─  ${phase}`);
  row(chalk.italic(chalk.white(`「${voice}」`)));
  row();
  sub(chalk.dim, isJa ? '受信' : 'in');
  row(chalk.dim(`${isJa ? '要求' : 'req'}: `) + ex(requestText));
  row(chalk.dim(`${isJa ? '分析コンテキスト' : 'analysis context'}: ${analysis.sections.length} ${isJa ? 'セクション' : 'sections'}`));
  for (const sec of analysis.sections) {
    row(chalk.dim(`  · [${sec.label}]  ${ex(sec.body, WIDTH - sec.label.length - 10)}`));
  }
  row();
  sub(chalk.dim, isJa ? '返却' : 'out');
  for (const sec of output.sections) {
    row(chalk.yellow(`[${sec.label}]`) + '  ' + chalk.white(ex(sec.body, WIDTH - sec.label.length - 6)));
  }
  rowTrace(trace);
  foot();

  // ログ書き込み + SSE（送り元は成り駒ID）
  emit({
    type: 'impl', roleId, roleLabel: label, voice, phase, requestText, sections: output.sections,
    from: PROMOTION_MAP[roleId] ?? roleId, to: 'kin', ...trace,
  });
}

export function logKinSummary(allRoles: Partial<Record<RoleId, RoleOutput>>, requestText: string, output: RoleOutput, isJa: boolean): void {
  const voice = isJa ? KIN_SUMMARY_VOICE.ja : KIN_SUMMARY_VOICE.en;
  const label = isJa ? '金（Kin）' : 'Kin';
  const phase = isJa ? '統合' : 'integration';
  const trace = collectTrace();

  // ターミナル表示
  console.log('');
  head(chalk.cyan, `${label}  ─  ${phase}`);
  row(chalk.italic(chalk.white(`「${voice}」`)));
  row();
  sub(chalk.dim, isJa ? '受信' : 'in');
  row(chalk.dim(`${isJa ? '要求' : 'req'}: `) + ex(requestText));
  row(chalk.dim(`${isJa ? '各駒の出力' : 'piece outputs'}:`));
  for (const [id, ro] of Object.entries(allRoles) as [RoleId, RoleOutput][]) {
    if (!ro) continue;
    const name = isJa ? ROLE_LABEL[id].ja : ROLE_LABEL[id].en;
    row(chalk.dim(`  · ${name}  ${ro.sections.length} ${isJa ? 'セクション' : 'sections'}`));
  }
  row();
  sub(chalk.dim, isJa ? '返却' : 'out');
  for (const sec of output.sections) {
    row(chalk.yellow(`[${sec.label}]`) + '  ' + chalk.white(ex(sec.body, WIDTH - sec.label.length - 6)));
  }
  rowTrace(trace);
  foot();

  // ログ書き込み + SSE
  emit({
    type: 'kin-summary', roleId: 'kin', roleLabel: label, voice, phase, requestText, sections: output.sections,
    from: 'kin', to: 'user', ...trace,
  });
}

/** 「手順を実装する」フローの実装結果を表示・記録する */
export function logTaskImpl(roleId: RoleId, task: Task, result: ImplResult, isJa: boolean): void {
  const labelDef = PROMOTED_LABEL[roleId] ?? ROLE_LABEL[roleId];
  const label    = isJa ? labelDef.ja : labelDef.en;
  const voiceDef = IMPL_VOICE[roleId] ?? ANALYSIS_VOICE[roleId];
  const voice    = isJa ? voiceDef.ja : voiceDef.en;
  const phase    = isJa ? '手順実装' : 'task implementation';
  const trace    = collectTrace();

  // ターミナル表示
  console.log('');
  head(chalk.green, `${label}  ─  ${phase}`);
  row(chalk.italic(chalk.white(`「${voice}」`)));
  row();
  sub(chalk.dim, isJa ? '受信' : 'in');
  row(chalk.dim(`${isJa ? '手順' : 'task'}: `) + ex(task.title));
  row();
  sub(chalk.dim, isJa ? '返却' : 'out');
  if (result.explanation) row(chalk.white(ex(result.explanation)));
  for (const f of result.files) {
    const mark = f.type === 'create' ? chalk.green('＋') : f.type === 'delete' ? chalk.red('－') : chalk.yellow('±');
    row(`${mark} ${chalk.white(f.path)}`);
  }
  if (result.files.length === 0) row(chalk.dim(isJa ? '（ファイル変更なし）' : '(no file changes)'));
  rowTrace(trace);
  foot();

  // ログ書き込み + SSE
  emit({
    type: 'impl-task', roleId, roleLabel: label, voice, phase,
    requestText: task.title,
    files: result.files.map((f) => ({ path: f.path, type: f.type })),
    explanation: result.explanation,
    from: PROMOTION_MAP[roleId] ?? roleId, to: 'user', ...trace,
  });
}

/** セッション開始をイベントとして記録する（会話ビュー・盤面ビューの起点） */
export function logSessionStart(requestText: string, isJa: boolean): void {
  emit({
    type: 'session-start',
    requestText,
    phase: isJa ? '開始' : 'start',
    from: 'user', to: 'kin',
  });
}

/** セッション終了をイベントとして記録する */
export function logSessionEnd(isJa: boolean): void {
  emit({
    type: 'session-end',
    phase: isJa ? '終了' : 'end',
  });
}
