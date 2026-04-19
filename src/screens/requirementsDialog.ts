import fs   from 'fs';
import path from 'path';
import { text, select, note } from '@clack/prompts';
import chalk from 'chalk';
import { getLocale } from '../locale/index.js';
import { runKinElicit } from '../agents/runner.js';
import { isDemoMode } from '../demo/state.js';
import type { ElicitTurn } from '../roles/prompts.js';
import type { Mode, NextScreen } from '../types/index.js';

/** .jin/specs/requirements.md の保存先 */
const SPECS_DIR      = path.join(process.cwd(), '.jin', 'specs');
const REQUIREMENTS_FILE = path.join(SPECS_DIR, 'requirements.md');

/**
 * 対話フェーズラベル（進捗表示用）
 * Spec Kit の段階的確認フェーズに対応
 */
const PHASE_LABELS_JA = [
  '1. Discovery  — 概要・ユーザー・ロール',
  '2. Stories    — ユーザーストーリー',
  '3. Criteria   — 受け入れ条件（EARS 記法）',
  '4. Constraints— 技術制約・非機能要件',
];
const PHASE_LABELS_EN = [
  '1. Discovery   — Overview, users & roles',
  '2. Stories     — User stories',
  '3. Criteria    — Acceptance criteria (EARS)',
  '4. Constraints — Tech stack & non-functional',
];

/** フェーズ推定（ターン数から大まかに割り当て） */
function estimatePhase(turnIndex: number): number {
  if (turnIndex <= 1) return 0;
  if (turnIndex <= 3) return 1;
  if (turnIndex <= 5) return 2;
  return 3;
}

/** デモ用のサンプル requirements.md */
function buildDemoRequirements(mode: 'ja' | 'global'): string {
  if (mode === 'ja') {
    return `# 要件定義

## 概要
管理者向けの社内業務ツール。営業チームが顧客情報と日報を一元管理できるシステムを構築する。

## ユーザーロール
- **管理者**: 全データの閲覧・編集・ユーザー管理が可能
- **営業担当**: 担当顧客の情報入力と日報の作成・閲覧が可能

## ユーザーストーリー

### US-1: 顧客情報の管理
**〜として**、営業担当
**〜したい**、担当顧客の連絡先・商談ステータスを登録・更新したい
**なぜなら**、散在する顧客情報を一箇所で管理し、情報の抜け漏れをなくしたいから

#### 受け入れ条件
- WHEN 営業担当が顧客情報を入力して保存する THEN システムはデータベースに保存 SHALL
- WHEN 管理者が顧客一覧を表示する THEN システムは全顧客を表示 SHALL
- IF 必須項目が未入力の場合 THEN システムはエラーメッセージを表示 SHALL

### US-2: 日報の作成・閲覧
**〜として**、営業担当
**〜したい**、その日の活動内容と商談結果を日報として記録したい
**なぜなら**、上司への報告と自分の振り返りを効率化したいから

#### 受け入れ条件
- WHEN 営業担当が日報を提出する THEN システムは当日の日報として保存 SHALL
- WHEN 管理者が日報一覧を表示する THEN システムは全メンバーの日報を閲覧可能にする SHALL

## 技術制約
- フロントエンド: React + TypeScript
- バックエンド: Node.js + FastAPI
- リリース目標: 3ヶ月以内

## 完了の定義
- 顧客情報の CRUD 操作が正常に動作する
- 日報の作成・一覧表示が動作する
- 管理者と営業担当のロール制御が機能する
`;
  }

  return `# Requirements

## Overview
An internal business tool for the sales team to centrally manage customer information and daily reports.

## User Roles
- **Admin**: Full access — view, edit, and manage users
- **Sales rep**: Can manage their own customers and create/view daily reports

## User Stories

### US-1: Customer management
**As a** sales rep
**I want to** register and update customer contact info and deal status
**So that** I can manage scattered customer data in one place and avoid missed information

#### Acceptance Criteria
- WHEN a sales rep saves customer data THEN the system SHALL store it in the database
- WHEN an admin views the customer list THEN the system SHALL display all customers
- IF required fields are empty THEN the system SHALL display an error message

### US-2: Daily report creation and viewing
**As a** sales rep
**I want to** record my daily activities and deal outcomes as a report
**So that** I can report to my manager and reflect on my work efficiently

#### Acceptance Criteria
- WHEN a sales rep submits a daily report THEN the system SHALL save it as that day's report
- WHEN an admin views the report list THEN the system SHALL show all members' reports

## Technical Constraints
- Frontend: React + TypeScript
- Backend: Node.js + FastAPI
- Target release: within 3 months

## Definition of Done
- Customer CRUD operations work correctly
- Daily report creation and listing work correctly
- Role-based access control for admin and sales rep works correctly
`;
}

export async function requirementsDialog(mode: Mode): Promise<NextScreen> {
  const t       = getLocale(mode);
  const isJa    = mode === 'ja';
  const modeKey = isJa ? 'ja' : 'global' as const;
  const phaseLabels = isJa ? PHASE_LABELS_JA : PHASE_LABELS_EN;

  console.log('');
  note(
    (isJa
      ? `Kiro / Spec Kit 方式で要件を引き出します。\n${phaseLabels.join('\n')}`
      : `Requirements will be elicited using the Kiro / Spec Kit approach.\n${phaseLabels.join('\n')}`),
    t.requirementsDialog.title,
  );
  console.log('');

  // デモモード: サンプルデータで確認フローへ飛ぶ
  if (isDemoMode()) {
    const demoReq = buildDemoRequirements(modeKey);
    console.log(chalk.bold(chalk.yellow(
      isJa
        ? `  金: デモ要件を生成しました。確認してください。`
        : `  Kin: Demo requirements generated. Please review.`,
    )));
    return confirmRequirements(demoReq, mode, t);
  }

  const turns: ElicitTurn[] = [];

  // ── 対話ループ ──
  for (let i = 0; i < 10; i++) {
    // フェーズ進捗を表示（3ターンごとに更新）
    const phase = estimatePhase(i);
    if (i > 0 && i % 2 === 0 && phase < phaseLabels.length) {
      console.log(chalk.dim(`  ── ${phaseLabels[phase]} ──`));
    }

    // 金の返答を取得
    const result = await runKinElicit(turns, mode);

    // 金のメッセージを表示
    console.log('');
    console.log(
      chalk.bold(chalk.yellow(`  ${t.requirementsDialog.kinLabel}: `)) +
      result.message,
    );
    console.log('');

    // 要件が揃ったと判断 → 確認フローへ
    if (result.isComplete) {
      return confirmRequirements(result.requirementsSummary, mode, t);
    }

    // ユーザーの返答を入力
    const userInput = await text({
      message: t.requirementsDialog.inputPrompt,
      placeholder: i === 0
        ? (isJa ? '例：管理者向けの社内ツールを作りたい' : 'e.g. An internal tool for admins')
        : (isJa ? t.requirementsDialog.skipHint : t.requirementsDialog.skipHint),
    });

    if (typeof userInput === 'symbol') {
      console.log(chalk.dim(t.requirementsDialog.cancelled));
      return { screen: 'requestTypeSelect' };
    }

    // 空白 → 現時点の情報で強制完了
    if (userInput.trim() === '') {
      const summary = turns
        .filter((t) => t.role === 'user')
        .map((t) => t.content)
        .join('\n\n');
      return confirmRequirements(summary, mode, t);
    }

    turns.push({ role: 'kin',  content: result.message });
    turns.push({ role: 'user', content: userInput.trim() });
  }

  // ターン上限 → 最後の金のメッセージで続けた分を使う
  const summary = turns
    .filter((t) => t.role === 'user')
    .map((t) => t.content)
    .join('\n\n');
  return confirmRequirements(summary, mode, t);
}

/** 要件定義の内容を確認して次の画面へ進む */
async function confirmRequirements(
  requirements: string,
  mode: Mode,
  t: ReturnType<typeof getLocale>,
): Promise<NextScreen> {
  const isJa = mode === 'ja';

  console.log('');
  note(requirements, isJa ? '要件定義（requirements.md）' : 'Requirements (requirements.md)');
  console.log('');

  const action = await select({
    message: t.requirementsDialog.confirm,
    options: [
      { value: 'proceed', label: t.requirementsDialog.confirmActions.proceed },
      { value: 'revise',  label: t.requirementsDialog.confirmActions.revise  },
      { value: 'cancel',  label: t.requirementsDialog.confirmActions.cancel  },
    ],
  });

  if (typeof action === 'symbol' || action === 'cancel') {
    return { screen: 'requestTypeSelect' };
  }

  if (action === 'revise') {
    const revision = await text({
      message: isJa
        ? '修正・追加したい点を教えてください'
        : 'What would you like to change or add?',
    });

    if (typeof revision === 'symbol' || revision.trim() === '') {
      return { screen: 'requestTypeSelect' };
    }

    // 修正内容を末尾に追記
    requirements = `${requirements}\n\n---\n${isJa ? '## 追記・修正' : '## Revisions'}\n${revision.trim()}`;
  }

  // デモモード以外は requirements.md に保存
  if (!isDemoMode()) {
    saveRequirements(requirements);
    console.log(chalk.dim(
      isJa
        ? `  .jin/specs/requirements.md に保存しました`
        : `  Saved to .jin/specs/requirements.md`,
    ));
  }

  // requirements.md の内容を requestText として inReview へ渡す
  return {
    screen:      'inReview',
    requestType: 'new_project',
    requestText: requirements,
  };
}

/** requirements.md を .jin/specs/ に保存する */
function saveRequirements(content: string): void {
  try {
    if (!fs.existsSync(SPECS_DIR)) {
      fs.mkdirSync(SPECS_DIR, { recursive: true });
    }
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const header = `<!-- generated by Jin ${timestamp} -->\n\n`;
    fs.writeFileSync(REQUIREMENTS_FILE, header + content, 'utf-8');
  } catch {
    // 保存失敗は無視（フロー継続を優先）
  }
}
