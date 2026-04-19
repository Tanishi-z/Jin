import fs from 'fs';
import path from 'path';
import type { RoleId, RequestType } from '../types/index.js';

const JIN_DIR      = path.join(process.cwd(), '.jin');
const ACTIVITY_FILE = path.join(JIN_DIR, 'activity.json');

/** 駒1つの処理区間（ミリ秒） */
export interface RoleTiming {
  roleId:   RoleId;
  phase:    'analysis' | 'impl';
  startMs:  number;
  endMs:    number;
}

/** activity.json の1エントリ */
export interface ActivityEntry {
  requestType: RequestType;
  requestText: string;
  roles:       RoleId[];
  timings:     RoleTiming[];
  timestamp:   string;
  applied:     boolean;
}

interface ActivityFile {
  requests: ActivityEntry[];
}

/** 既存の activity.json を読む。存在しない場合は空を返す */
function readFile(): ActivityFile {
  try {
    return JSON.parse(fs.readFileSync(ACTIVITY_FILE, 'utf-8')) as ActivityFile;
  } catch {
    return { requests: [] };
  }
}

/** activity.json にエントリを追記する */
export function appendActivity(entry: ActivityEntry): void {
  fs.mkdirSync(JIN_DIR, { recursive: true });
  const data = readFile();
  data.requests.push(entry);
  fs.writeFileSync(ACTIVITY_FILE, JSON.stringify(data, null, 2), 'utf-8');
}

/** 最後のエントリを applied: true に更新する */
export function markLastApplied(): void {
  if (!fs.existsSync(ACTIVITY_FILE)) return;
  const data = readFile();
  if (data.requests.length === 0) return;
  data.requests[data.requests.length - 1]!.applied = true;
  fs.writeFileSync(ACTIVITY_FILE, JSON.stringify(data, null, 2), 'utf-8');
}
