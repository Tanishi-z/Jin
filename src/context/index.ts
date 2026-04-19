/**
 * プロジェクトコンテキスト管理
 *
 * 読み込み元（優先順位順）:
 *   1. .jin/context.md  — Jin が管理する累積コンテキスト
 *   2. README.md        — プロジェクト概要
 *   3. package.json     — 技術スタック（name / description / dependencies）
 *   4. .jin/activity.json — 最近の構想履歴
 *
 * 更新タイミング:
 *   - docPreview で「采配を下す」が選ばれた時点（Proposal が確定した後）
 */

import fs   from 'fs';
import path from 'path';
import type { Proposal } from '../types/index.js';

const JIN_DIR      = path.join(process.cwd(), '.jin');
const CONTEXT_FILE = path.join(JIN_DIR, 'context.md');

// ── 読み込み ──────────────────────────────────────────────────────────────────

export interface ProjectContext {
  /** プロジェクト名 */
  projectName: string;
  /** プロジェクト説明 */
  description: string;
  /** 技術スタック */
  techStack: string[];
  /** アーキテクチャメモ */
  architectureNotes: string;
  /** 最近の構想（新しい順、最大5件） */
  recentVisions: Array<{ date: string; type: string; summary: string }>;
}

/**
 * プロジェクトコンテキストを読み込み、LLM プロンプト用のコンパクトな文字列を返す。
 * ファイルが存在しない場合は空文字を返す（コンテキストなしで動作）。
 */
export function loadProjectContext(isJa: boolean): string {
  const ctx = readContext();
  if (!ctx) return '';

  const lines: string[] = [];

  if (isJa) {
    lines.push('--- プロジェクトコンテキスト ---');
    if (ctx.projectName)
      lines.push(`プロジェクト: ${ctx.projectName}${ctx.description ? ` — ${ctx.description}` : ''}`);
    if (ctx.techStack.length > 0)
      lines.push(`技術スタック: ${ctx.techStack.join(', ')}`);
    if (ctx.architectureNotes)
      lines.push(`アーキテクチャ: ${ctx.architectureNotes}`);
    if (ctx.recentVisions.length > 0) {
      lines.push('最近の変更:');
      for (const v of ctx.recentVisions.slice(0, 5)) {
        lines.push(`  - [${v.date}] ${v.summary}`);
      }
    }
    lines.push('---');
  } else {
    lines.push('--- Project context ---');
    if (ctx.projectName)
      lines.push(`Project: ${ctx.projectName}${ctx.description ? ` — ${ctx.description}` : ''}`);
    if (ctx.techStack.length > 0)
      lines.push(`Tech stack: ${ctx.techStack.join(', ')}`);
    if (ctx.architectureNotes)
      lines.push(`Architecture: ${ctx.architectureNotes}`);
    if (ctx.recentVisions.length > 0) {
      lines.push('Recent changes:');
      for (const v of ctx.recentVisions.slice(0, 5)) {
        lines.push(`  - [${v.date}] ${v.summary}`);
      }
    }
    lines.push('---');
  }

  return lines.join('\n');
}

/** コンテキストを構造化して読み込む */
function readContext(): ProjectContext | null {
  // ① .jin/context.md が最優先
  if (fs.existsSync(CONTEXT_FILE)) {
    try {
      return parseContextFile(fs.readFileSync(CONTEXT_FILE, 'utf-8'));
    } catch { /* フォールバックへ */ }
  }

  // ② context.md がなければ README + package.json から初期構築
  const ctx = buildContextFromProject();
  if (ctx.projectName || ctx.techStack.length > 0) return ctx;

  return null;
}

/** .jin/context.md をパースして ProjectContext に変換する */
function parseContextFile(content: string): ProjectContext {
  const ctx: ProjectContext = {
    projectName: '', description: '', techStack: [],
    architectureNotes: '', recentVisions: [],
  };

  const parts = content.split(/^## /m).filter(Boolean);

  for (const part of parts) {
    const lines = part.split('\n');
    const label = lines[0]?.trim().toLowerCase() ?? '';
    const body  = lines.slice(1).join('\n').trim();

    if (label.includes('project') || label.includes('プロジェクト')) {
      // "name — description" 形式
      const match = body.match(/^(.+?)(?:\s*[—–-]\s*(.+))?$/m);
      ctx.projectName  = match?.[1]?.trim() ?? '';
      ctx.description  = match?.[2]?.trim() ?? '';
    } else if (label.includes('tech') || label.includes('技術')) {
      ctx.techStack = body.split('\n')
        .map((l) => l.replace(/^[-*]\s*/, '').trim())
        .filter(Boolean);
    } else if (label.includes('architect') || label.includes('アーキテクチャ')) {
      ctx.architectureNotes = body.split('\n')
        .filter((l) => l.trim())
        .slice(0, 3)
        .join(' / ');
    } else if (label.includes('recent') || label.includes('最近')) {
      ctx.recentVisions = body.split('\n')
        .filter((l) => l.trim().startsWith('-'))
        .map((l) => {
          const m = l.match(/\[(\d{4}-\d{2}-\d{2})\]\s*(?:\w+:\s*)?(.+)/);
          return m
            ? { date: m[1]!, type: '', summary: m[2]!.trim() }
            : null;
        })
        .filter((v): v is NonNullable<typeof v> => v !== null);
    }
  }

  return ctx;
}

/** README.md / package.json からコンテキストを初期構築する */
function buildContextFromProject(): ProjectContext {
  const ctx: ProjectContext = {
    projectName: '', description: '', techStack: [],
    architectureNotes: '', recentVisions: [],
  };

  // package.json からプロジェクト名・説明・技術スタックを取得
  const pkgPath = path.join(process.cwd(), 'package.json');
  if (fs.existsSync(pkgPath)) {
    try {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8')) as {
        name?: string;
        description?: string;
        dependencies?: Record<string, string>;
        devDependencies?: Record<string, string>;
      };
      ctx.projectName = pkg.name ?? '';
      ctx.description = pkg.description ?? '';

      // 主要フレームワークを技術スタックとして抽出
      const deps = {
        ...pkg.dependencies,
        ...pkg.devDependencies,
      };
      ctx.techStack = extractTechStack(deps);
    } catch { /* 無視 */ }
  }

  // README.md から説明を補完
  if (!ctx.description) {
    const readmePath = path.join(process.cwd(), 'README.md');
    if (fs.existsSync(readmePath)) {
      const readme = fs.readFileSync(readmePath, 'utf-8');
      const firstParagraph = readme
        .split('\n')
        .filter((l) => l.trim() && !l.startsWith('#'))
        .slice(0, 2)
        .join(' ');
      ctx.description = firstParagraph.slice(0, 120);
    }
  }

  // .jin/activity.json から最近の構想を取得
  const activityFile = path.join(JIN_DIR, 'activity.json');
  if (fs.existsSync(activityFile)) {
    try {
      const data = JSON.parse(fs.readFileSync(activityFile, 'utf-8')) as {
        requests?: Array<{ type: string; timestamp: string; summary?: string }>;
      };
      ctx.recentVisions = (data.requests ?? [])
        .slice(-5)
        .reverse()
        .map((r) => ({
          date:    r.timestamp?.slice(0, 10) ?? '',
          type:    r.type,
          summary: r.summary ?? r.type,
        }));
    } catch { /* 無視 */ }
  }

  return ctx;
}

/** package.json の依存から主要フレームワークを抽出する */
function extractTechStack(deps: Record<string, string>): string[] {
  const FRAMEWORK_MAP: Array<[RegExp, string]> = [
    [/^react$/,               'React'],
    [/^next$/,                'Next.js'],
    [/^vue$/,                 'Vue'],
    [/^svelte$/,              'Svelte'],
    [/^angular/,              'Angular'],
    [/^express$/,             'Express'],
    [/^fastify$/,             'Fastify'],
    [/^hono$/,                'Hono'],
    [/^typescript$/,          'TypeScript'],
    [/^prisma$/,              'Prisma'],
    [/^drizzle-orm$/,         'Drizzle'],
    [/^@supabase\/supabase-js$/, 'Supabase'],
    [/^@aws-sdk/,             'AWS SDK'],
    [/^tailwindcss$/,         'Tailwind CSS'],
  ];

  const found: string[] = [];
  for (const [pattern, label] of FRAMEWORK_MAP) {
    if (Object.keys(deps).some((d) => pattern.test(d))) {
      found.push(label);
    }
  }
  return found;
}

// ── 更新 ──────────────────────────────────────────────────────────────────────

/**
 * 采配を下した後にプロジェクトコンテキストを更新する。
 * - 最近の構想リストに今回の内容を追加
 * - 金の出力からアーキテクチャメモを抽出して更新
 * - 技術スタック・プロジェクト情報は初回のみ auto-detect で補完
 */
export function updateProjectContext(proposal: Proposal, isJa: boolean): void {
  // デモモードでは保存しない（呼び出し元でチェック済みだが念のため）
  try {
    const existing = readContext() ?? buildContextFromProject();

    // 最近の構想を先頭に追加（最大10件保持）
    const today   = new Date().toISOString().slice(0, 10);
    const summary = proposal.summary[0] ?? proposal.requestText.slice(0, 80);
    const newVision = { date: today, type: proposal.requestType, summary };
    const recentVisions = [newVision, ...existing.recentVisions].slice(0, 10);

    // 金の出力からアーキテクチャメモを抽出
    const architectureNotes = extractArchitectureNotes(proposal, existing.architectureNotes, isJa);

    const updated: ProjectContext = {
      ...existing,
      recentVisions,
      architectureNotes,
    };

    writeContextFile(updated, isJa);
  } catch { /* コンテキスト更新失敗は無視してフロー継続 */ }
}

/** 金・飛車・桂馬の出力からアーキテクチャメモを抽出する */
function extractArchitectureNotes(
  proposal:      Proposal,
  existingNotes: string,
  isJa:          boolean,
): string {
  const notes: string[] = existingNotes ? [existingNotes] : [];

  // 飛車のバックエンド設計セクションから主要な決定を抽出
  const hishaOutput = proposal.roles['hisha'];
  if (hishaOutput) {
    const backendSection = hishaOutput.sections.find((s) =>
      s.label.includes('バックエンド') || s.label.toLowerCase().includes('backend'),
    );
    if (backendSection) {
      const firstLine = backendSection.body.split('\n')[0]?.trim();
      if (firstLine && firstLine.length < 100) notes.push(firstLine);
    }
  }

  // 桂馬の API インターフェースから主要エンドポイントを抽出
  const keimaOutput = proposal.roles['keima'];
  if (keimaOutput) {
    const apiSection = keimaOutput.sections.find((s) =>
      s.label.includes('API') || s.label.toLowerCase().includes('api'),
    );
    if (apiSection) {
      const firstLine = apiSection.body.split('\n')[0]?.trim();
      if (firstLine && firstLine.length < 100) notes.push(firstLine);
    }
  }

  // 重複を除いて最新3件のみ保持
  const unique = [...new Set(notes)].slice(0, 3);
  return unique.join(' / ');
}

/** ProjectContext を .jin/context.md に書き出す */
function writeContextFile(ctx: ProjectContext, isJa: boolean): void {
  if (!fs.existsSync(JIN_DIR)) fs.mkdirSync(JIN_DIR, { recursive: true });

  const lines: string[] = [
    isJa ? '# Jin プロジェクトコンテキスト' : '# Jin Project Context',
    '',
    `_${isJa ? '最終更新' : 'Last updated'}: ${new Date().toISOString()}_`,
    '',
    isJa ? '## プロジェクト' : '## Project',
    `${ctx.projectName}${ctx.description ? ` — ${ctx.description}` : ''}`,
    '',
    isJa ? '## 技術スタック' : '## Tech stack',
    ...ctx.techStack.map((t) => `- ${t}`),
    '',
    isJa ? '## アーキテクチャメモ' : '## Architecture notes',
    ctx.architectureNotes || (isJa ? '（未記録）' : '(none yet)'),
    '',
    isJa ? '## 最近の変更（最新10件）' : '## Recent changes (latest 10)',
    ...ctx.recentVisions.map((v) => `- [${v.date}] ${v.type}: ${v.summary}`),
  ];

  fs.writeFileSync(CONTEXT_FILE, lines.join('\n'), 'utf-8');

  // CLAUDE.md に @.jin/context.md の import を追記する
  syncClaudeMdImport();
}

/**
 * CLAUDE.md に `@.jin/context.md` の import 行がなければ追記する。
 * Claude Code はこの行を読んで .jin/context.md を自動的にコンテキストに含める。
 */
function syncClaudeMdImport(): void {
  const IMPORT_LINE = '@.jin/context.md';
  const claudeMd    = path.join(process.cwd(), 'CLAUDE.md');

  try {
    if (fs.existsSync(claudeMd)) {
      const content = fs.readFileSync(claudeMd, 'utf-8');
      if (content.includes(IMPORT_LINE)) return; // すでに存在する場合はスキップ
      fs.appendFileSync(claudeMd, `\n${IMPORT_LINE}\n`, 'utf-8');
    } else {
      // CLAUDE.md が存在しない場合は新規作成
      fs.writeFileSync(claudeMd, `${IMPORT_LINE}\n`, 'utf-8');
    }
  } catch { /* CLAUDE.md への書き込み失敗は無視 */ }
}
