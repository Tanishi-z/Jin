/**
 * jin hook init で生成するサンプル hooks.json。
 *
 * ## 2種類の設定場所
 *
 * ### A) .jin/hooks.json（Jin 専用）
 * このファイルで管理する。
 *
 * ### B) .claude/settings.json の jin セクション（Claude Code と共存）
 * Claude Code の設定ファイルに Jin フックをまとめて管理したい場合:
 * ```json
 * {
 *   "hooks": { ... },   ← Claude Code のフック
 *   "jin": {
 *     "hooks": {        ← Jin のフック（Jin が読み込む）
 *       "post-apply": ["git add .jin/ && git commit -m 'jin: 仕様更新'"]
 *     }
 *   }
 * }
 * ```
 */
export const HOOKS_TEMPLATE = JSON.stringify(
  {
    hooks: {
      'pre-analysis': [
        // 分析前にプロジェクトのgit状態を取得（stdout がリクエストに付加される）
        // "git diff --stat HEAD",
        // "cat CLAUDE.md 2>/dev/null || true"
      ],
      'post-analysis': [
        // 分析完了後に通知など
        // "echo '布陣完了' | terminal-notifier -title Jin"
      ],
      'pre-apply': [
        // ファイル書き出し前にバックアップなど
        // "git stash"
      ],
      'post-apply': [
        // ファイル書き出し後に自動コミットなど
        // "git add .jin/ && git commit -m 'jin: 仕様更新'"
      ],
      'pre-impl': [
        // 実装フェーズ前にテスト実行など
        // "npm test"
      ],
      'post-impl': [
        // 実装フェーズ後にフォーマット・lint など
        // "npm run lint --fix"
      ],
    },
  },
  null,
  2,
);
