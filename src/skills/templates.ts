/**
 * jin skill init で生成するサンプル .skill.md テンプレート。
 *
 * フォーマットは Claude Code のカスタムコマンド（.claude/commands/）と互換。
 * - $ARGUMENTS : ユーザーが入力したテキストに展開される
 * - description: Claude Code のコマンド説明文として使用される
 * - trigger    : Jin 専用（Claude Code ではファイル名がコマンド名になる）
 * - enabled    : Jin 専用（Claude Code では常に有効）
 */
export const SKILL_TEMPLATES: Record<string, string> = {

  'security-audit.skill.md': `---
trigger: security-audit
name: セキュリティ監査
description: OWASP Top 10 観点でセキュリティリスクを分析します
enabled: true
---
以下の機能・コードについて、セキュリティ監査を行ってください。

## 対象
$ARGUMENTS

## 監査観点
- OWASP Top 10 の各リスク
- 認証・認可の抜け穴
- 入力値検証・サニタイゼーション
- 機密情報の扱い（ログ・レスポンス）
- 依存パッケージの既知脆弱性
`,

  'api-design.skill.md': `---
trigger: api-design
name: API設計レビュー
description: REST API の設計を RESTful・一貫性・拡張性の観点でレビューします
enabled: true
---
以下の API について、設計レビューを行ってください。

## 対象
$ARGUMENTS

## レビュー観点
- RESTful 設計原則への準拠
- エンドポイント命名規則の一貫性
- レスポンス構造・ステータスコードの適切さ
- バージョニング戦略
- ページネーション・フィルタリングの設計
- エラーレスポンスの統一性
`,

  'refactor.skill.md': `---
trigger: refactor
name: リファクタリング計画
description: 既存コードのリファクタリング案を提示します
enabled: true
---
以下のコード・機能について、リファクタリング計画を立案してください。

## 対象
$ARGUMENTS

## 分析観点
- 技術的負債の特定
- 可読性・保守性の改善点
- パフォーマンスボトルネック
- テスタビリティの向上
- SOLID 原則への準拠度
- 段階的移行の手順
`,

  'onboarding.skill.md': `---
trigger: onboarding
name: オンボーディング資料
description: 新メンバー向けのオンボーディング資料と手順を作成します
enabled: true
---
以下のプロジェクト・機能について、新メンバー向けのオンボーディング資料を作成してください。

## 対象
$ARGUMENTS

## 含めるべき内容
- プロジェクト概要と目的
- 開発環境のセットアップ手順
- アーキテクチャの概要図・説明
- 主要なコードパスの解説
- よくある質問と回答
- 参照すべきドキュメント・リンク
`,

  'test-plan.skill.md': `---
trigger: test-plan
name: テスト計画
description: 機能のテスト計画とテストケースを設計します
enabled: true
---
以下の機能について、テスト計画を作成してください。

## 対象
$ARGUMENTS

## テスト設計観点
- ユニットテストのスコープ
- 統合テストのシナリオ
- E2E テストの主要フロー
- エッジケース・境界値
- パフォーマンステストの基準
- テストデータの設計
`,
};
