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

  // ── 1ページフィット（14インチ MacBook Pro 基準） ─────────────────────────────
  // 画面がステージより大きければ拡大、小さければ等倍のままスクロール
  const STAGE_W = 1512;
  const STAGE_H = 852;

  function fitStage() {
    const stage = document.getElementById('stage');
    if (!stage) return;
    const scale = Math.max(1, Math.min(window.innerWidth / STAGE_W, window.innerHeight / STAGE_H));
    stage.style.transform = 'scale(' + scale + ')';
    // 拡大時は余白を等分して中央寄せする
    const extraX = window.innerWidth  - STAGE_W * scale;
    const extraY = window.innerHeight - STAGE_H * scale;
    stage.style.marginLeft = (extraX > 0 ? extraX / 2 : 0) + 'px';
    stage.style.marginTop  = (extraY > 0 ? extraY / 2 : 0) + 'px';
  }

  window.addEventListener('resize', fitStage);
  fitStage();
</script>
</body>
</html>`;
}
