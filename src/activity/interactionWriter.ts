import fs from 'fs';
import path from 'path';

const LOGS_DIR = path.join(process.cwd(), '.jin', 'logs');

// ── 型定義 ────────────────────────────────────────────────────────────────────

export type InteractionEventType =
  | 'session-start'
  | 'analysis'
  | 'kin-review'
  | 'impl'
  | 'kin-summary'
  | 'session-end';

export interface InteractionEvent {
  type:      InteractionEventType;
  sessionId: string;
  timestamp: string;
  /** 駒ID */
  roleId?:   string;
  /** 表示名 */
  roleLabel?: string;
  /** キャラクターのセリフ */
  voice?:    string;
  /** フェーズ名 */
  phase?:    string;
  /** 要求テキスト */
  requestText?: string;
  /** 出力セクション */
  sections?: Array<{ label: string; body: string }>;
  /** kin-review の判定 */
  verdict?:  'approve' | 'retry' | 'add';
  reason?:   string;
  instructions?: string;
  additionalRoles?: string[];
}

export interface InteractionSession {
  id:          string;
  requestText: string;
  requestType: string;
  startedAt:   string;
  finishedAt?: string;
  events:      InteractionEvent[];
}

export interface SessionMeta {
  id:          string;
  requestText: string;
  requestType: string;
  startedAt:   string;
  finishedAt?: string;
  eventCount:  number;
}

// ── セッション状態 ────────────────────────────────────────────────────────────

let currentSessionId: string | null = null;

/** セッションIDからファイルパスを生成 */
function sessionPath(id: string): string {
  fs.mkdirSync(LOGS_DIR, { recursive: true });
  return path.join(LOGS_DIR, `${id}.json`);
}

// ── 公開 API ──────────────────────────────────────────────────────────────────

/**
 * 新しいインタラクションセッションを開始する。
 * 生成したセッションIDを返す。
 */
export function startSession(requestText: string, requestType: string): string {
  const now  = new Date();
  const ts   = now.toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const slug = requestText.slice(0, 20).replace(/[\s　]+/g, '_').replace(/[^\w\u3040-\u30ff\u4e00-\u9fff_]/g, '') || 'session';
  const id   = `${ts}-${slug}`;

  const session: InteractionSession = {
    id,
    requestText,
    requestType,
    startedAt: now.toISOString(),
    events:    [],
  };

  fs.writeFileSync(sessionPath(id), JSON.stringify(session, null, 2), 'utf-8');
  currentSessionId = id;
  return id;
}

/**
 * 現在のセッションにイベントを追記する。
 * セッションが未開始の場合は何もしない。
 */
export function addEvent(event: Omit<InteractionEvent, 'sessionId' | 'timestamp'>): InteractionEvent | null {
  if (!currentSessionId) return null;
  const id = currentSessionId;

  const full: InteractionEvent = {
    ...event,
    sessionId: id,
    timestamp: new Date().toISOString(),
  };

  try {
    const filePath = sessionPath(id);
    const session  = JSON.parse(fs.readFileSync(filePath, 'utf-8')) as InteractionSession;
    session.events.push(full);
    fs.writeFileSync(filePath, JSON.stringify(session, null, 2), 'utf-8');
  } catch { /* ファイル操作失敗は無視 */ }

  return full;
}

/**
 * 現在のセッションを完了としてマークする。
 */
export function endSession(): void {
  if (!currentSessionId) return;

  try {
    const filePath = sessionPath(currentSessionId);
    const session  = JSON.parse(fs.readFileSync(filePath, 'utf-8')) as InteractionSession;
    session.finishedAt = new Date().toISOString();
    fs.writeFileSync(filePath, JSON.stringify(session, null, 2), 'utf-8');
  } catch { /* 無視 */ }

  currentSessionId = null;
}

/** 全セッションのメタ情報一覧を新しい順で返す */
export function listSessions(): SessionMeta[] {
  if (!fs.existsSync(LOGS_DIR)) return [];

  return fs.readdirSync(LOGS_DIR)
    .filter((f) => f.endsWith('.json'))
    .flatMap((f) => {
      try {
        const session = JSON.parse(
          fs.readFileSync(path.join(LOGS_DIR, f), 'utf-8'),
        ) as InteractionSession;
        const meta: SessionMeta = {
          id:         session.id,
          requestText: session.requestText,
          requestType: session.requestType,
          startedAt:  session.startedAt,
          finishedAt: session.finishedAt,
          eventCount: session.events.length,
        };
        return [meta];
      } catch {
        return [];
      }
    })
    .sort((a, b) => b.startedAt.localeCompare(a.startedAt));
}

/** 指定IDのセッション全体を返す */
export function readSession(id: string): InteractionSession | null {
  try {
    return JSON.parse(
      fs.readFileSync(sessionPath(id), 'utf-8'),
    ) as InteractionSession;
  } catch {
    return null;
  }
}
