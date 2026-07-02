import type { DashboardData } from '../data.js';

/**
 * Chart.js を使ったガントチャート・構想タイムラインのクライアントJSを生成する。
 * IS_JA はテンプレート先頭の共通スクリプトで定義済み。
 */
export function buildChartsScript(data: DashboardData, isJa: boolean): string {
  return `
  const GRID_COLOR  = '#242424';
  const TEXT_COLOR  = '#555';
  const FONT_FAMILY = "'SF Mono', 'Cascadia Code', monospace";

  Chart.defaults.color           = TEXT_COLOR;
  Chart.defaults.font.family     = FONT_FAMILY;
  Chart.defaults.font.size       = 11;
  Chart.defaults.borderColor     = GRID_COLOR;

  // ガントチャート（駒の活動タイムライン）
  const ganttData = ${JSON.stringify(data.gantt)};

  // 駒間のハンドオフ矢印を描画するカスタムプラグイン
  const handoffArrowPlugin = {
    id: 'handoffArrow',
    afterDatasetsDraw(chart) {
      const ctx   = chart.ctx;
      const meta  = chart.getDatasetMeta(0);
      if (!meta || meta.data.length < 2) return;

      ctx.save();

      for (let i = 0; i < meta.data.length - 1; i++) {
        const curr = meta.data[i];
        const next = meta.data[i + 1];
        if (!curr || !next) continue;

        // curr の右端 x（= 処理終了点）
        const x = curr.x;
        // curr の下端 y と next の上端 y
        const barH  = curr.height ?? 20;
        const y1    = curr.y  + barH / 2 + 2;
        const y2    = next.y  - barH / 2 - 2;
        const xNext = next.base;  // next の左端

        // 縦の繋ぎ線（点線）
        ctx.beginPath();
        ctx.setLineDash([3, 3]);
        ctx.strokeStyle = '#444';
        ctx.lineWidth   = 1;
        ctx.moveTo(x,     y1);
        ctx.lineTo(x,     y2);
        ctx.stroke();

        // 横の繋ぎ線（curr の右端 → next の左端）
        if (Math.abs(x - xNext) > 1) {
          ctx.beginPath();
          ctx.moveTo(x,     y2);
          ctx.lineTo(xNext, y2);
          ctx.stroke();
        }

        // 矢印（下向き三角）
        ctx.setLineDash([]);
        ctx.strokeStyle = '#666';
        ctx.fillStyle   = '#666';
        ctx.lineWidth   = 1.5;
        ctx.beginPath();
        const ax = xNext;
        const ay = next.y - barH / 2;
        ctx.moveTo(ax - 5, ay - 7);
        ctx.lineTo(ax,     ay - 1);
        ctx.lineTo(ax + 5, ay - 7);
        ctx.stroke();
      }

      ctx.restore();
    },
  };

  // 言語モードに応じてラベルを切り替える
  const ganttLabels = ganttData.rows.map(r => IS_JA ? r.nameJa + '  ' + r.nameEn : r.nameEn);
  const ganttFloats = ganttData.rows.map(r => [r.startSec, r.endSec]);
  const ganttColors = ganttData.rows.map(r => r.color);
  const ganttHeight = Math.max(180, ganttData.rows.length * 44 + 40);
  document.getElementById('chart-gantt').parentElement.style.height = ganttHeight + 'px';

  new Chart(document.getElementById('chart-gantt'), {
    type: 'bar',
    plugins: [handoffArrowPlugin],
    data: {
      labels: ganttLabels,
      datasets: [{
        data:            ganttFloats,
        backgroundColor: ganttColors.map(c => c + 'bb'),
        borderColor:     ganttColors,
        borderWidth:     1,
        borderRadius:    3,
        barThickness:    22,
      }],
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      maintainAspectRatio: false,
      animation: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label(ctx) {
              const row = ganttData.rows[ctx.dataIndex];
              if (!row) return '';
              const dur = (row.endSec - row.startSec).toFixed(1);
              return ' ' + dur + 's';
            },
            title(items) {
              const row = ganttData.rows[items[0].dataIndex];
              if (!row) return '';
              return IS_JA ? row.nameJa + ' ' + row.nameEn : row.nameEn;
            },
          },
        },
      },
      scales: {
        x: {
          grid: { color: GRID_COLOR },
          ticks: {
            callback: v => v + 's',
          },
          title: {
            display: true,
            text: '${isJa ? '処理時間（秒）' : 'Processing time (sec)'}',
            color: TEXT_COLOR,
            font: { size: 10 },
          },
        },
        y: {
          grid:  { color: GRID_COLOR },
          ticks: { font: { size: 12 } },
        },
      },
    },
  });

  // 構想タイムライン
  const timeline = ${JSON.stringify(data.timeline)};
  new Chart(document.getElementById('chart-timeline'), {
    type: 'line',
    data: {
      labels: timeline.map(t => t.date.slice(5)),
      datasets: [{
        data:        timeline.map(t => t.count),
        borderColor: '#ff4444',
        backgroundColor: 'rgba(255,68,68,0.08)',
        borderWidth: 2,
        pointBackgroundColor: '#ff4444',
        pointRadius: 3,
        tension: 0.3,
        fill: true,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { grid: { color: GRID_COLOR } },
        y: { grid: { color: GRID_COLOR }, ticks: { stepSize: 1 }, min: 0 },
      }
    }
  });
`;
}
