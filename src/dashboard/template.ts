import type { DashboardData } from './data.js';
import { buildStyles } from './html/styles.js';
import { buildLayout } from './html/layout.js';
import { buildChartsScript } from './html/chartsScript.js';
import { buildConversationScript } from './html/conversationScript.js';
import { buildBoardScript } from './html/boardScript.js';

/**
 * ダッシュボードのHTML全体を組み立てる。
 * CSS・レイアウト・各スクリプトは src/dashboard/html/ のモジュールが生成する。
 */
export function buildHtml(data: DashboardData): string {
  const isJa = data.config.mode === 'ja';

  return `<!DOCTYPE html>
<html lang="${isJa ? 'ja' : 'en'}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Jin — ${isJa ? '王将ダッシュボード' : 'Dashboard'}</title>
  <style>${buildStyles(isJa)}</style>
</head>
<body>
${buildLayout(data, isJa)}
<script src="https://cdn.jsdelivr.net/npm/chart.js@4/dist/chart.umd.min.js"></script>
<script>
  // サーバー側で言語モードを埋め込む（ブラウザ側JSから参照可能にする）
  const IS_JA = ${isJa};
${buildChartsScript(data, isJa)}
${buildConversationScript()}
${buildBoardScript()}
</script>
</body>
</html>`;
}
