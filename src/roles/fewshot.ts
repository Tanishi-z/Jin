/**
 * Few-Shot 出力例。
 * 小型モデル（〜14B）向けに期待するフォーマットと内容レベルを示す。
 * 例の構想: 「管理者だけ顧客データを CSV エクスポートできるようにしたい」
 */
import type { RoleId } from '../types/index.js';

export const FEW_SHOT_EXAMPLES: Record<RoleId, Record<'ja' | 'global', string>> = {

  kin: {
    ja: `## 目的
管理者ユーザーのみがシステムのデータを CSV 形式でエクスポートできる機能を追加する。エクスポート時には監査ログに記録する。

## 制約
既存の権限体系を破らない。API は汎用的に設計する。

## 受け入れ条件
- WHEN 管理者がエクスポートボタンをクリック THEN ブラウザに CSV ファイルがダウンロードされる SHALL
- IF 非管理者がエクスポートエンドポイントにアクセス THEN 403 Forbidden が返される SHALL

## 布陣
- 銀 (gin): UI/UX の新規ダイアログ・ボタン配置の設計
- 飛車 (hisha): バックエンドのエクスポートエンドポイント実装
- 角 (kaku): 権限チェックの回帰テスト・パフォーマンス劣化検証
- 桂馬 (keima): CSV 出力クエリ・API コントラクト設計
- 香車 (kyosha): 管理者権限の認可設計と監査ログ要件
- 歩 (fu): ドキュメント更新・実装チェックリスト`,
    global: `## Goal
Enable only admin users to export system data in CSV format. Audit log each export action.

## Constraints
Do not break the existing permission system. API design should be reusable.

## Acceptance criteria
- WHEN admin clicks export button THEN CSV file downloads to browser SHALL
- IF non-admin accesses export endpoint THEN HTTP 403 Forbidden SHALL be returned

## Formation
- Gin (gin): Design of new export dialog and button placement
- Hisha (hisha): Backend export endpoint implementation
- Kaku (kaku): Regression testing of permission checks and performance impact
- Keima (keima): CSV query design and API contract
- Kyosha (kyosha): Admin authorization design and audit logging requirements
- Fu (fu): Documentation updates and implementation checklist`,
  },

  gin: {
    ja: `## UI方針
データテーブルの右上に「エクスポート」ボタンを配置。管理者のみに表示。
クリック時に確認ダイアログを表示し、エクスポート範囲（全データ/フィルタ済み）を選択させる。

## 操作フロー
1. テーブル画面表示
2. 「エクスポート」ボタン（右上）をクリック
3. 確認ダイアログ表示（エクスポート範囲選択）
4. 「実行」ボタンをクリック
5. CSV ダウンロード開始、トースト通知「エクスポート完了」

## エッジケース
- 大規模データセット（100 万件以上）: 処理中画面、キャンセル可能
- フィルタ適用中: 「フィルタ済みデータをエクスポートしますか？」を確認
- ネットワーク遅延: タイムアウト 10 秒、リトライボタン表示

## 変更対象画面
- pages/admin/dashboard.tsx: エクスポートボタン追加
- components/DataTable.tsx: 権限チェック後のボタン表示ロジック`,
    global: `## UI approach
Place "Export" button in the top-right of the data table. Visible to admins only.
Show a confirmation dialog on click with options to export all data or filtered data.

## User flow
1. Data table displayed
2. Click "Export" button (top-right)
3. Confirmation dialog appears (select export scope)
4. Click "Execute"
5. CSV download begins, toast shows "Export complete"

## Edge cases
- Large datasets (1M+ rows): Show progress screen, allow cancellation
- Filters active: Confirm "Export filtered data?"
- Network delay: 10-second timeout, retry button shown

## Affected screens
- pages/admin/dashboard.tsx: Add export button
- components/DataTable.tsx: Permission check and button visibility logic`,
  },

  hisha: {
    ja: `## バックエンド設計
新規エンドポイント: POST /api/admin/export/csv
- リクエスト: { scope: 'all' | 'filtered', filters?: {...} }
- レスポンス: { downloadUrl: string, expiresAt: timestamp }
- ミドルウェア: requireAdminRole(), auditLog()
- サービス: ExportService.generateCSV()、キューサービスで非同期処理

## フロントエンド設計
- 新規コンポーネント: components/ExportDialog.tsx
- フック: useExportData() で API 呼び出し・ダウンロード処理
- 状態管理: 進行中フラグ、エラーハンドリング
- 権限チェック: useAdminPermission() フック

## 実装手順
1. ExportService クラスと CSV 生成ロジック
2. /api/admin/export/csv エンドポイント
3. 監査ログミドルウェア追加
4. ExportDialog コンポーネント実装
5. DataTable への統合
6. エンドツーエンドテスト

## 影響範囲
- services/ExportService.ts（新規作成）
- routes/admin.ts（エンドポイント追加）
- middleware/auditLog.ts（修正）
- components/DataTable.tsx（ボタン追加）
- hooks/useAdminPermission.ts（既存利用）`,
    global: `## Backend design
New endpoint: POST /api/admin/export/csv
- Request: { scope: 'all' | 'filtered', filters?: {...} }
- Response: { downloadUrl: string, expiresAt: timestamp }
- Middleware: requireAdminRole(), auditLog()
- Service: ExportService.generateCSV(), async via job queue

## Frontend design
- New component: components/ExportDialog.tsx
- Hook: useExportData() handles API call and download
- State: loading flag, error handling
- Permission check: useAdminPermission() hook

## Implementation steps
1. ExportService class and CSV generation logic
2. Create /api/admin/export/csv endpoint
3. Add audit log middleware
4. Implement ExportDialog component
5. Integrate into DataTable
6. End-to-end testing

## Affected files
- services/ExportService.ts (new)
- routes/admin.ts (add endpoint)
- middleware/auditLog.ts (update)
- components/DataTable.tsx (add button)
- hooks/useAdminPermission.ts (use existing)`,
  },

  kaku: {
    ja: `## リスク
- セキュリティ: 権限チェック漏れで非管理者が CSV 取得可能
- パフォーマンス: 大規模データセットの CSV 生成でメモリ枯渇
- データ一貫性: エクスポート中のデータ更新による不整合
- 監査: エクスポート履歴が記録されない場合のコンプライアンス違反

## テスト観点
- ユニット: ExportService.generateCSV() の正常系・エラーハンドリング
- 統合: 管理者認証 → エンドポイント → ファイル生成のフロー
- セキュリティ: 非管理者からのアクセス拒否（HTTP 403）
- パフォーマンス: 100 万件データの CSV 生成時間（目安: 30 秒以内）

## 回帰確認項目
- 既存のテーブルフィルター機能が動作するか
- 権限周辺の他機能（レポート、削除）が動作するか
- 監査ログの既存フォーマットが破壊されていないか

## 境界値・エッジケース
- データ 0 件: エラーメッセージ「エクスポート対象がありません」
- 特殊文字（カンマ、改行、ダブルクォート）のエスケープ
- 超大規模（5000 万件）: タイムアウト・再試行メカニズム`,
    global: `## Risks
- Security: Missing permission check allows non-admins to export
- Performance: Large dataset CSV generation exhausts memory
- Data consistency: Concurrent updates during export cause mismatches
- Compliance: Missing audit trail for exports violates policy

## Test scenarios
- Unit: ExportService.generateCSV() normal and error cases
- Integration: Admin auth → endpoint → file generation flow
- Security: Deny non-admin access (HTTP 403)
- Performance: 1M row CSV generation under 30 seconds

## Regression checklist
- Existing table filter still works
- Other admin features (reporting, delete) unaffected
- Audit log format unchanged

## Boundary & edge cases
- Zero rows: Show "No data to export" message
- Special chars (comma, newline, quote): Proper CSV escaping
- Very large (50M+ rows): Timeout with retry mechanism`,
  },

  keima: {
    ja: `## データモデルの変更
既存テーブルに変更なし。監査ログテーブル（既存）に action='EXPORT_CSV' で記録。

## API インターフェース
POST /api/admin/export/csv
- Request: { scope: "all" | "filtered", filters?: { createdAt_gte?: string } }
- Response: { downloadUrl: string, expiresAt: number, recordCount: number }
- Error: 403 Forbidden（非管理者）、429 Too Many Requests（レート制限）

## 計測すべき指標
- エクスポート実行数（時間別・ユーザー別）
- 平均生成時間、p95 生成時間
- ダウンロード成功率、ネットワークエラー率

## パフォーマンス観点
- CSV 生成: ストリーミング出力でメモリ効率化
- クエリ: インデックス活用で 100 万行取得を 1 秒以内
- キャッシュ: 同一条件のエクスポート 5 分以内は再利用可能`,
    global: `## Data model changes
No existing table alterations. Log exports to audit_logs table with action='EXPORT_CSV'.

## API interface
POST /api/admin/export/csv
- Request: { scope: "all" | "filtered", filters?: { createdAt_gte?: string } }
- Response: { downloadUrl: string, expiresAt: number, recordCount: number }
- Error: 403 Forbidden (non-admin), 429 Too Many Requests (rate limit)

## Metrics to track
- Export execution count (hourly, per user)
- Mean and p95 generation time
- Download success rate, network error rate

## Performance considerations
- CSV generation: Stream output to minimize memory
- Query: Use indexes for 1M-row fetch under 1 second
- Cache: Reuse identical exports within 5 minutes`,
  },

  kyosha: {
    ja: `## 認証・認可設計
エンドポイント POST /api/admin/export/csv は requireAdminRole() ミドルウェアで保護。
- 認証: JWT トークン検証（既存）
- 認可: "admin" ロール必須
- セッション: HttpOnly Cookie、Secure フラグ有効

## 脅威モデル
- IDOR: 認可チェック漏れで他ユーザーのデータ取得可能
  → 対策: requireAdminRole() で全リクエスト検証
- CSRF: 管理者セッションを乗っ取り CSV 取得
  → 対策: CSRF トークン（SameSite=Strict Cookie）
- 大量抽出: API 乱用によるデータ流出
  → 対策: レート制限（1 管理者 / 分間 1 エクスポート）

## OWASP 観点
- A01 Broken Access Control: requireAdminRole()、RBAC 実装必須
- A03 Injection: SQL パラメータ化クエリ、入力サニタイズ
- A07 Authentication Failures: トークン検証ロジックの再確認

## 監査ログ要件
- 記録項目: ユーザー ID・実行日時・データ件数・フィルタ条件・ダウンロード状況
- 保持期間: 1 年以上
- 改ざん検知: ハッシュチェーン・不可変ストレージ利用`,
    global: `## Auth & authorization design
Endpoint POST /api/admin/export/csv protected by requireAdminRole() middleware.
- Authentication: JWT token validation (existing)
- Authorization: "admin" role required
- Session: HttpOnly Cookie with Secure flag

## Threat model
- IDOR: Missing authz check allows non-admin data access
  → Mitigation: requireAdminRole() on every request
- CSRF: Admin session hijacking for CSV export
  → Mitigation: CSRF token with SameSite=Strict
- Data exfiltration: API abuse for bulk data extraction
  → Mitigation: Rate limit (1 export per admin per minute)

## OWASP considerations
- A01 Broken Access Control: requireAdminRole(), RBAC mandatory
- A03 Injection: Parameterized SQL, input sanitization
- A07 Authentication Failures: Re-verify token validation logic

## Audit log requirements
- Fields: User ID, timestamp, record count, filter conditions, download status
- Retention: 1+ year
- Tampering detection: Hash chain, immutable storage`,
  },

  fu: {
    ja: `## ドキュメント更新箇所
- docs/FEATURES.md: 「管理者向けデータエクスポート」セクション追加
- docs/API.md: POST /api/admin/export/csv エンドポイント仕様追加
- docs/SECURITY.md: 「CSV エクスポートの権限管理」セクション追加
- CHANGELOG.md: v1.x.0 に「管理者向け CSV エクスポート機能」を追加

## 実装手順一覧
- [ ] ExportService 実装（バックエンド）
- [ ] /api/admin/export/csv エンドポイント実装
- [ ] auditLog ミドルウェア拡張
- [ ] ExportDialog コンポーネント実装
- [ ] DataTable へのボタン統合
- [ ] ユニット・統合テスト実装
- [ ] E2E テスト実装
- [ ] ドキュメント完成

## 完了の定義
- ユニットテスト: 90% 以上カバー
- 統合テスト: 全フロー成功
- セキュリティレビュー: 権限チェック承認済み
- ドキュメント: 仕様書・API ドキュメント完成
- E2E テスト: ブラウザ自動テスト成功`,
    global: `## Documentation updates
- docs/FEATURES.md: Add "Admin Data Export" section
- docs/API.md: Add POST /api/admin/export/csv endpoint specification
- docs/SECURITY.md: Add "CSV Export Authorization" section
- CHANGELOG.md: Note v1.x.0 adds "Admin CSV export feature"

## Implementation checklist
- [ ] Implement ExportService (backend)
- [ ] Create /api/admin/export/csv endpoint
- [ ] Extend auditLog middleware
- [ ] Implement ExportDialog component
- [ ] Integrate button into DataTable
- [ ] Write unit and integration tests
- [ ] Write E2E tests
- [ ] Complete documentation

## Definition of done
- Unit test coverage: 90%+
- Integration tests: All flows pass
- Security review: Authorization checks approved
- Documentation: Spec and API docs complete
- E2E tests: Browser automation passes`,
  },
};
