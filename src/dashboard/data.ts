import fs from 'fs';
import path from 'path';
import { loadConfig } from '../config.js';
import { isDemoMode, getDemoLocaleMode } from '../demo/state.js';

const JIN_DIR = path.join(process.cwd(), '.jin');

export interface RoleActivity {
  id: string;
  nameJa: string;
  nameGlobal: string;
  color: string;
  count: number;
  lastType: string;
  descJa: string;
  descEn: string;
}

export interface RecentDecision {
  date: string;
  title: string;
}

/** ガントチャートの1行（駒1つ分の処理区間） */
export interface GanttRow {
  roleId: string;
  nameEn: string;
  nameJa: string;
  color: string;
  startSec: number;
  endSec: number;
}

/** ガントチャート全体のデータ */
export interface GanttData {
  rows: GanttRow[];
  /** 表示対象の構想種別 */
  requestType: string;
  /** 表示対象のタイムスタンプ */
  timestamp: string;
  /** データなし時のサンプル表示フラグ */
  isSample: boolean;
}

export interface TimelineEntry {
  date: string;
  count: number;
}

export interface DashboardData {
  config: { mode: string; agent: string };
  stats: {
    specCount: number;
    taskTotal: number;
    taskCompleted: number;
    decisionCount: number;
    requestCount: number;
  };
  roles: RoleActivity[];
  recentDecisions: RecentDecision[];
  timeline: TimelineEntry[];
  gantt: GanttData;
}

/** フォールバック用モック処理時間（秒）。activity.json がない場合に使用 */
const ROLE_DURATION_SEC: Record<string, number> = {
  kin:    2.0,
  gin:    2.5,
  hisha:  4.0,
  kaku:   3.0,
  keima:  2.5,
  kyosha: 2.0,
  fu:     1.5,
};

const ROLE_META: Omit<RoleActivity, 'count' | 'lastType'>[] = [
  {
    id: 'kin',    nameJa: '金',   nameGlobal: 'Kin',    color: '#c9a227',
    descJa: '構想を分析し、どの駒を動かすかを決めるオーケストレーター',
    descEn: 'Orchestrator — analyzes the vision and decides which pieces to deploy',
  },
  {
    id: 'gin',    nameJa: '銀',   nameGlobal: 'Gin',    color: '#9ca3af',
    descJa: 'UI/UX・ユーザー体験の設計を担う',
    descEn: 'Designs UI/UX and user experience',
  },
  {
    id: 'hisha',  nameJa: '飛車', nameGlobal: 'Hisha',  color: '#3b82f6',
    descJa: '技術実装・アーキテクチャ計画を担う',
    descEn: 'Plans technical implementation and architecture',
  },
  {
    id: 'kaku',   nameJa: '角',   nameGlobal: 'Kaku',   color: '#8b5cf6',
    descJa: '品質・リスク・テスト設計を担う',
    descEn: 'Handles quality, risk analysis, and test design',
  },
  {
    id: 'keima',  nameJa: '桂馬', nameGlobal: 'Keima',  color: '#14b8a6',
    descJa: 'データモデル・API設計・メトリクスを担う',
    descEn: 'Handles data model, API design, and metrics',
  },
  {
    id: 'kyosha', nameJa: '香車', nameGlobal: 'Kyosha', color: '#f97316',
    descJa: 'セキュリティ・認可・権限設計を担う',
    descEn: 'Handles security, authorization, and access control',
  },
  {
    id: 'fu',     nameJa: '歩',   nameGlobal: 'Fu',     color: '#6b7280',
    descJa: 'ドキュメントと手順一覧を整備する',
    descEn: 'Organizes documentation and task lists',
  },
];

export function readDashboardData(): DashboardData {
  const config  = loadConfig();
  const stats   = readStats();
  const activity = readActivity();

  const roles: RoleActivity[] = ROLE_META.map((meta) => ({
    ...meta,
    count:    activity.roleCounts[meta.id] ?? 0,
    lastType: activity.roleLastType[meta.id] ?? '—',
  }));

  return {
    config: {
      // デモモードはsessionのlocaleを優先、通常はconfigから取得
      mode:  isDemoMode() ? getDemoLocaleMode() : (config.mode ?? 'ja'),
      agent: config.localModel ?? '—',
    },
    stats,
    roles,
    recentDecisions: readDecisions(),
    timeline:        activity.timeline,
    gantt:           buildGanttData(),
  };
}

/** 最新の構想をもとにガントデータを生成する */
function buildGanttData(): GanttData {
  const activityFile = path.join(JIN_DIR, 'activity.json');

  if (fs.existsSync(activityFile)) {
    try {
      const data     = JSON.parse(fs.readFileSync(activityFile, 'utf-8')) as ActivityFile;
      const requests = data.requests ?? [];
      if (requests.length > 0) {
        const last = requests[requests.length - 1]!;

        // timings が記録されている場合は実計測値を使う
        if (last.timings && last.timings.length > 0) {
          return buildRowsFromTimings(
            last.timings,
            last.requestType ?? last.type,
            last.timestamp,
          );
        }

        // timings がない古いデータはロールIDのみでフォールバック
        return buildRowsFromRoles(last.roles, last.requestType ?? last.type, last.timestamp, false);
      }
    } catch { /* フォールバック */ }
  }

  // データなし → サンプル表示
  return buildRowsFromRoles(
    ['kin', 'gin', 'hisha', 'kaku', 'kyosha', 'fu'],
    'new_feature',
    new Date().toISOString(),
    true,
  );
}

/** 実計測タイムスタンプ（ms）から GanttData を生成する */
function buildRowsFromTimings(
  timings:     RoleTimingRaw[],
  requestType: string,
  timestamp:   string,
): GanttData {
  if (timings.length === 0) {
    return buildRowsFromRoles([], requestType, timestamp, false);
  }

  // 全体の開始時刻を 0 秒に正規化
  const origin = Math.min(...timings.map((t) => t.startMs));
  const rows: GanttRow[] = timings.map((t) => {
    const meta = ROLE_META.find((m) => m.id === t.roleId);
    return {
      roleId:   t.roleId,
      nameEn:   meta?.nameGlobal ?? t.roleId,
      nameJa:   meta?.nameJa    ?? t.roleId,
      color:    meta?.color     ?? '#6b7280',
      startSec: (t.startMs - origin) / 1000,
      endSec:   (t.endMs   - origin) / 1000,
    };
  });

  return { rows, requestType, timestamp, isSample: false };
}

/** ロールID列から GanttData を生成する（モック秒数でフォールバック） */
function buildRowsFromRoles(
  roleIds:     string[],
  requestType: string,
  timestamp:   string,
  isSample:    boolean,
): GanttData {
  const rows: GanttRow[] = [];
  let cursor = 0;

  for (const roleId of roleIds) {
    const meta     = ROLE_META.find((m) => m.id === roleId);
    if (!meta) continue;
    const duration = ROLE_DURATION_SEC[roleId] ?? 2.0;
    rows.push({
      roleId,
      nameEn:   meta.nameGlobal,
      nameJa:   meta.nameJa,
      color:    meta.color,
      startSec: cursor,
      endSec:   cursor + duration,
    });
    cursor += duration;
  }

  return { rows, requestType, timestamp, isSample };
}

function readStats() {
  let specCount     = 0;
  let taskTotal     = 0;
  let taskCompleted = 0;
  let decisionCount = 0;
  let requestCount  = 0;

  // 仕様ファイル数
  const specsDir = path.join(JIN_DIR, 'specs');
  if (fs.existsSync(specsDir)) {
    specCount = countMarkdownFiles(specsDir);
  }

  // 手順数
  const backlog = path.join(JIN_DIR, 'tasks', 'backlog.md');
  if (fs.existsSync(backlog)) {
    const lines = fs.readFileSync(backlog, 'utf-8').split('\n');
    for (const line of lines) {
      if (/^- \[ \]/.test(line)) { taskTotal++; }
      if (/^- \[x\]/i.test(line)) { taskTotal++; taskCompleted++; }
    }
  }

  // 决定事項数
  const decisionsDir = path.join(JIN_DIR, 'decisions');
  if (fs.existsSync(decisionsDir)) {
    decisionCount = fs.readdirSync(decisionsDir).filter((f) => f.endsWith('.md')).length;
  }

  // 構想数（activityから）
  const activityFile = path.join(JIN_DIR, 'activity.json');
  if (fs.existsSync(activityFile)) {
    try {
      const data = JSON.parse(fs.readFileSync(activityFile, 'utf-8')) as ActivityFile;
      requestCount = data.requests?.length ?? 0;
    } catch { /* 無視 */ }
  }

  return { specCount, taskTotal, taskCompleted, decisionCount, requestCount };
}

interface RoleTimingRaw {
  roleId:  string;
  phase:   string;
  startMs: number;
  endMs:   number;
}

interface ActivityFile {
  requests: Array<{
    type:        string;
    requestType: string;
    roles:       string[];
    timings:     RoleTimingRaw[];
    timestamp:   string;
    applied:     boolean;
  }>;
}

function readActivity() {
  const roleCounts:   Record<string, number> = {};
  const roleLastType: Record<string, string> = {};
  const dayCounts:    Record<string, number> = {};

  const activityFile = path.join(JIN_DIR, 'activity.json');
  if (fs.existsSync(activityFile)) {
    try {
      const data = JSON.parse(fs.readFileSync(activityFile, 'utf-8')) as ActivityFile;
      for (const req of data.requests ?? []) {
        const reqType = req.requestType ?? req.type;
        for (const roleId of req.roles ?? []) {
          roleCounts[roleId]   = (roleCounts[roleId] ?? 0) + 1;
          roleLastType[roleId] = reqType;
        }
        const day = req.timestamp?.slice(0, 10) ?? '';
        if (day) dayCounts[day] = (dayCounts[day] ?? 0) + 1;
      }
    } catch { /* 無視 */ }
  }

  // 直近7日分のタイムラインを生成
  const timeline: TimelineEntry[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    timeline.push({ date: key, count: dayCounts[key] ?? 0 });
  }

  return { roleCounts, roleLastType, timeline };
}

function readDecisions(): RecentDecision[] {
  const dir = path.join(JIN_DIR, 'decisions');
  if (!fs.existsSync(dir)) return [];

  return fs.readdirSync(dir)
    .filter((f) => f.endsWith('.md'))
    .sort()
    .reverse()
    .slice(0, 5)
    .map((file) => {
      const content = fs.readFileSync(path.join(dir, file), 'utf-8');
      const title   = content.split('\n').find((l) => l.startsWith('## '))?.replace('## ', '') ?? file;
      return { date: file.replace('.md', ''), title };
    });
}

function countMarkdownFiles(dir: string): number {
  let count = 0;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) count += countMarkdownFiles(path.join(dir, entry.name));
    else if (entry.name.endsWith('.md')) count++;
  }
  return count;
}
