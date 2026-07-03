import fs from 'fs';
import path from 'path';
import type { FileChange } from '../types/index.js';

/** 手順実装のLLM出力をパースした結果 */
export interface ParsedImplOutput {
  explanation: string;
  files: FileChange[];
}

// ── ファイルツリー ────────────────────────────────────────────────────────────

const IGNORE_DIRS = new Set(['node_modules', '.git', 'dist', 'coverage', '.jin', '.claude', '.vscode', '.idea']);
const MAX_TREE_FILES = 200;

/**
 * プロジェクトのファイル一覧をテキストで返す（ファイル選定プロンプト用）。
 * node_modules 等を除外し、最大200件で打ち切る。
 */
export function buildFileTree(root: string = process.cwd()): string {
  const files: string[] = [];

  const walk = (dir: string): void => {
    if (files.length >= MAX_TREE_FILES) return;
    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      if (files.length >= MAX_TREE_FILES) return;
      if (entry.name.startsWith('.') && entry.isDirectory()) continue;
      if (IGNORE_DIRS.has(entry.name)) continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full);
      } else if (entry.isFile()) {
        files.push(path.relative(root, full));
      }
    }
  };

  walk(root);
  return files.join('\n');
}

/**
 * ファイル選定コールの出力から実在するファイルパスを抽出する（最大 maxFiles 件）。
 */
export function parseSelectedFiles(text: string, maxFiles = 5, root: string = process.cwd()): string[] {
  const result: string[] = [];
  for (const rawLine of text.split('\n')) {
    if (result.length >= maxFiles) break;
    // 箇条書き記号・番号・バッククォートを取り除く
    const line = rawLine.replace(/^[\s\-*・>]*(\d+[.)])?\s*/, '').replace(/`/g, '').trim();
    if (!line || /^(なし|none)$/i.test(line)) continue;
    const normalized = normalizeRelativePath(line);
    if (!normalized) continue;
    if (result.includes(normalized)) continue;
    if (fs.existsSync(path.join(root, normalized))) result.push(normalized);
  }
  return result;
}

/**
 * 選定ファイルの実内容を「## パス」見出し付きで連結する（実装プロンプト用）。
 * 1ファイルあたり perFileLimit 字、合計 totalLimit 字で切り詰める。
 */
export function buildFileContext(
  paths: string[],
  root: string = process.cwd(),
  perFileLimit = 6_000,
  totalLimit = 20_000,
): string {
  const parts: string[] = [];
  let total = 0;

  for (const p of paths) {
    if (total >= totalLimit) break;
    let content: string;
    try {
      content = fs.readFileSync(path.join(root, p), 'utf-8');
    } catch {
      continue;
    }
    const budget = Math.min(perFileLimit, totalLimit - total);
    const truncated = content.length > budget;
    const body = truncated ? `${content.slice(0, budget)}\n…（以降省略）` : content;
    parts.push(`## ${p}\n\`\`\`\n${body}\n\`\`\``);
    total += body.length;
  }

  return parts.join('\n\n');
}

// ── 実装出力のパース ──────────────────────────────────────────────────────────

/**
 * パスとして安全な相対パスに正規化する。不正なら null。
 * 絶対パス・親ディレクトリ参照・パスらしくない文字列は拒否する。
 */
export function normalizeRelativePath(raw: string): string | null {
  let p = raw.trim().replace(/^["'`]|["'`]$/g, '').replace(/^\.\//, '');
  if (!p || p.length > 300) return null;
  if (path.isAbsolute(p)) return null;
  if (p.split(/[\\/]/).includes('..')) return null;
  // パスらしい文字のみ許可
  if (!/^[\w@][\w@\-./]*$/.test(p)) return null;
  // 拡張子のないパスはファイルと判断できないため拒否（README 等の慣用名は許可）
  const base = path.basename(p);
  if (!base.includes('.') && !/^(README|LICENSE|Makefile|Dockerfile)$/i.test(base)) return null;
  return p;
}

/** 出力の省略・切り詰めの兆候を検出する */
export function looksTruncated(content: string): boolean {
  return /(\.\.\.|…)\s*$|（省略|\(省略\)|\(omitted\)|残りは同じ|unchanged below|rest of the file|既存のまま/m.test(content);
}

/**
 * 手順実装のLLM出力（「## 説明」＋「## ファイル: パス」＋コードフェンス）をパースする。
 * modify の場合は originalContent を実ファイルから読み込む。
 */
export function parseTaskImplOutput(text: string, root: string = process.cwd()): ParsedImplOutput {
  const lines = text.split('\n');

  let explanation = '';
  const files: FileChange[] = [];

  // 「## 説明」セクションを抽出
  const explMatch = text.match(/^##\s*(?:説明|Explanation|Description)\s*\n([\s\S]*?)(?=^##\s|\n```|$)/m);
  if (explMatch) explanation = explMatch[1].trim();

  // ファイル見出し（## ファイル: path / ## File: path / ### path）を順に探す
  for (let i = 0; i < lines.length; i++) {
    const heading = lines[i].match(/^#{2,3}\s*(?:ファイル|File)\s*[:：]\s*(.+)$/i)
                 ?? lines[i].match(/^#{2,3}\s+([\w@][\w@\-./]*\.[\w]+)\s*$/);
    if (!heading) continue;

    const filePath = normalizeRelativePath(heading[1]);
    if (!filePath) continue;

    // 見出しの直後のコードフェンスを探す（間の空行・パス再掲行は許容）
    let j = i + 1;
    while (j < lines.length && !lines[j].startsWith('```')) {
      if (/^#{2,3}\s/.test(lines[j])) break;   // 次の見出しに達したらフェンス無し
      j++;
    }
    if (j >= lines.length || !lines[j].startsWith('```')) continue;

    // フェンスの中身を収集
    const body: string[] = [];
    let k = j + 1;
    while (k < lines.length && !lines[k].startsWith('```')) {
      body.push(lines[k]);
      k++;
    }
    if (k >= lines.length) continue;   // 閉じフェンスが無い＝出力が途切れている

    const content = body.join('\n');
    if (!content.trim()) continue;

    const fullPath = path.join(root, filePath);
    const exists   = fs.existsSync(fullPath);
    let originalContent: string | undefined;
    if (exists) {
      try { originalContent = fs.readFileSync(fullPath, 'utf-8'); } catch { /* 読めない場合は新規扱い */ }
    }

    if (!files.some((f) => f.path === filePath)) {
      files.push({
        path: filePath,
        type: exists ? 'modify' : 'create',
        content,
        originalContent,
      });
    }

    i = k;   // 閉じフェンスまで読み飛ばす
  }

  return { explanation, files };
}

/**
 * パース結果の妥当性を検証する。
 * 問題があれば矯正指示（リトライ時にプロンプトへ付加する文字列）を返し、なければ null。
 */
export function validateImplOutput(parsed: ParsedImplOutput, isJa: boolean): string | null {
  if (parsed.files.length === 0) {
    return isJa
      ? '出力にファイルが1つも含まれていませんでした。「## ファイル: パス」見出しとコードブロックで、変更する全ファイルの全文を出力してください。'
      : 'No files were found in the output. Output every changed file in full, using "## File: path" headings followed by a code block.';
  }

  for (const f of parsed.files) {
    if (looksTruncated(f.content)) {
      return isJa
        ? `${f.path} の内容が省略されています。「...」や「（省略）」を使わず、ファイルの全文を出力し直してください。`
        : `The content of ${f.path} is abbreviated. Re-output the entire file without "..." or "(omitted)".`;
    }
    // 既存ファイルの変更なのに極端に短い＝全文でない可能性が高い
    if (f.type === 'modify' && f.originalContent
        && f.content.length < f.originalContent.length * 0.3
        && f.originalContent.length > 400) {
      return isJa
        ? `${f.path} は既存ファイルの変更ですが、出力が元の内容より大幅に短くなっています。変更後のファイル全文を出力し直してください。`
        : `${f.path} is a modification but the output is much shorter than the original. Re-output the complete file content after the change.`;
    }
  }

  return null;
}
