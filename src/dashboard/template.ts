import type { DashboardData } from './data.js';

export function buildHtml(data: DashboardData): string {
  const isJa     = data.config.mode === 'ja';
  const taskPct  = data.stats.taskTotal > 0
    ? Math.round((data.stats.taskCompleted / data.stats.taskTotal) * 100)
    : 0;

  const modelLabel = data.config.agent ?? (isJa ? 'ローカルLLM' : 'Local LLM');

  return `<!DOCTYPE html>
<html lang="${isJa ? 'ja' : 'en'}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Jin — ${isJa ? '王将ダッシュボード' : 'Dashboard'}</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    :root {
      --bg:        #0d0d0d;
      --card:      #161616;
      --border:    #242424;
      --text:      #e8e8e8;
      --dim:       #555;
      --red1:      #ffffff;
      --red2:      #ff4444;
      --red3:      #cc0000;
      --red4:      #660000;
      --gold:      #c9a227;
      --green:     #22c55e;
      --radius:    10px;
    }

    body {
      background: var(--bg);
      color: var(--text);
      font-family: 'SF Pro Text', 'Hiragino Sans', system-ui, sans-serif;
      font-size: 14px;
      min-height: 100vh;
      padding: 0 0 60px;
    }

    /* ─── ヘッダー ─── */
    header {
      border-bottom: 1px solid var(--border);
      padding: 20px 32px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
    }

    .logo {
      font-family: 'SF Mono', 'Cascadia Code', monospace;
      font-size: 22px;
      font-weight: 700;
      background: linear-gradient(180deg, var(--red1), var(--red2), var(--red3), var(--red4));
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      letter-spacing: 0.1em;
    }

    .tagline {
      color: var(--dim);
      font-size: 13px;
      margin-top: 2px;
    }

    .badges {
      display: flex;
      gap: 8px;
      flex-shrink: 0;
    }

    .badge {
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: 20px;
      padding: 4px 12px;
      font-size: 12px;
      color: var(--dim);
    }

    .badge span { color: var(--text); }

    /* ─── メインコンテンツ ─── */
    main { padding: 32px; display: flex; flex-direction: column; gap: 28px; }

    /* ─── サマリーカード ─── */
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 16px;
    }

    .stat-card {
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      padding: 20px 24px;
    }

    .stat-label {
      font-size: 12px;
      color: var(--dim);
      text-transform: uppercase;
      letter-spacing: 0.08em;
    }

    .stat-value {
      font-size: 36px;
      font-weight: 700;
      margin-top: 6px;
      line-height: 1;
      font-variant-numeric: tabular-nums;
    }

    .stat-sub {
      font-size: 12px;
      color: var(--dim);
      margin-top: 6px;
    }

    /* ─── チャート行 ─── */
    .charts-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
    }

    .chart-card {
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      padding: 20px 24px;
    }

    .card-title {
      font-size: 13px;
      font-weight: 600;
      color: var(--dim);
      text-transform: uppercase;
      letter-spacing: 0.08em;
      margin-bottom: 16px;
    }

    .card-title-row {
      display: flex;
      align-items: baseline;
      justify-content: space-between;
      margin-bottom: 16px;
    }

    .card-subtitle {
      font-size: 11px;
      color: var(--dim);
      font-weight: 400;
      text-transform: none;
      letter-spacing: 0;
    }

    .chart-wrap {
      position: relative;
      height: 180px;
    }

    /* ガントチャート */
    .gantt-card {
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      padding: 20px 24px;
    }

    .gantt-wrap {
      position: relative;
    }

    /* 手順進捗バー */
    .task-pct {
      font-size: 42px;
      font-weight: 700;
      color: var(--green);
      margin-bottom: 12px;
    }

    .progress-bar-wrap {
      background: var(--border);
      border-radius: 4px;
      height: 8px;
      overflow: hidden;
      margin-bottom: 12px;
    }

    .progress-bar {
      height: 100%;
      background: linear-gradient(90deg, var(--green), #16a34a);
      border-radius: 4px;
      transition: width 0.6s ease;
    }

    .task-detail {
      display: flex;
      justify-content: space-between;
      font-size: 12px;
      color: var(--dim);
    }

    /* ─── 駒カード ─── */
    .roles-title {
      font-size: 13px;
      font-weight: 600;
      color: var(--dim);
      text-transform: uppercase;
      letter-spacing: 0.08em;
      margin-bottom: 16px;
    }

    .roles-grid {
      display: grid;
      grid-template-columns: repeat(7, 1fr);
      gap: 12px;
    }

    .role-card {
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      padding: 18px 16px 14px;
      display: flex;
      flex-direction: column;
      gap: 0;
      transition: border-color 0.2s;
      position: relative;
      overflow: hidden;
    }

    .role-card::before {
      content: '';
      position: absolute;
      top: 0; left: 0; right: 0;
      height: 3px;
      background: var(--role-color);
      opacity: 0.8;
    }

    .role-card:hover { border-color: var(--dim); }

    /* 英語名：大きく */
    .role-name-en {
      font-size: 18px;
      font-weight: 700;
      letter-spacing: 0.02em;
      line-height: 1;
      margin-bottom: 3px;
    }

    /* 漢字：小さくサブテキストとして */
    .role-piece {
      font-size: 11px;
      font-weight: 500;
      opacity: 0.55;
      margin-bottom: 8px;
    }

    /* 役割説明 */
    .role-desc {
      font-size: 11px;
      color: var(--dim);
      line-height: 1.45;
      flex: 1;
      margin-bottom: 12px;
    }

    /* 区切り線 */
    .role-divider {
      height: 1px;
      background: var(--border);
      margin-bottom: 10px;
    }

    .role-count {
      font-size: 22px;
      font-weight: 700;
      margin-bottom: 2px;
      font-variant-numeric: tabular-nums;
      line-height: 1;
    }

    .role-count-label {
      font-size: 10px;
      color: var(--dim);
      text-transform: uppercase;
      letter-spacing: 0.06em;
    }

    /* ─── 决定事項 ─── */
    .decisions-card {
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      padding: 20px 24px;
    }

    .decision-list { list-style: none; }

    .decision-item {
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 10px 0;
      border-bottom: 1px solid var(--border);
    }

    .decision-item:last-child { border-bottom: none; }

    .decision-date {
      font-size: 12px;
      color: var(--dim);
      white-space: nowrap;
      font-variant-numeric: tabular-nums;
    }

    .decision-title { color: var(--text); }

    .empty-state {
      color: var(--dim);
      font-size: 13px;
      padding: 12px 0;
    }

    /* ─── リフレッシュ ─── */
    .refresh-btn {
      position: fixed;
      bottom: 20px;
      right: 24px;
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: 20px;
      color: var(--dim);
      padding: 8px 16px;
      font-size: 12px;
      cursor: pointer;
      transition: color 0.2s, border-color 0.2s;
    }

    .refresh-btn:hover { color: var(--text); border-color: var(--dim); }

    @media (max-width: 1100px) {
      .stats-grid  { grid-template-columns: repeat(2, 1fr); }
      .charts-row  { grid-template-columns: 1fr; }
      .roles-grid  { grid-template-columns: repeat(4, 1fr); }
    }

    /* ─── リアルタイムログ ─── */
    .live-card {
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      padding: 20px 24px;
      margin: 0 32px 20px;
    }

    .live-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 16px;
    }

    .live-status {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 12px;
      color: var(--dim);
    }

    .live-dot {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: var(--dim);
      transition: background 0.3s;
    }

    .live-dot.connected { background: var(--green); animation: pulse 2s infinite; }

    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50%       { opacity: 0.4; }
    }

    .live-feed {
      display: flex;
      flex-direction: column;
      gap: 10px;
      max-height: 420px;
      overflow-y: auto;
      padding-right: 4px;
    }

    .live-feed:empty::after {
      content: '${isJa ? '布陣が始まると、ここに駒のやりとりが流れます。' : 'Interaction events will appear here when a vision runs.'}';
      color: var(--dim);
      font-size: 13px;
    }

    .log-event {
      background: var(--bg);
      border: 1px solid var(--border);
      border-radius: 6px;
      padding: 12px 14px;
      animation: fadeIn 0.25s ease;
    }

    @keyframes fadeIn { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; } }

    .log-event-head {
      display: flex;
      align-items: baseline;
      gap: 8px;
      margin-bottom: 6px;
    }

    .log-event-role {
      font-size: 13px;
      font-weight: 600;
    }

    .log-event-phase {
      font-size: 11px;
      color: var(--dim);
    }

    .log-event-verdict {
      margin-left: auto;
      font-size: 11px;
      padding: 2px 7px;
      border-radius: 10px;
    }

    .verdict-approve { background: rgba(34,197,94,0.15); color: #22c55e; }
    .verdict-retry   { background: rgba(250,204,21,0.15); color: #facc15; }
    .verdict-add     { background: rgba(96,165,250,0.15); color: #60a5fa; }

    .log-event-voice {
      font-size: 12px;
      font-style: italic;
      color: var(--dim);
      margin-bottom: 8px;
    }

    .log-event-sections {
      display: flex;
      flex-direction: column;
      gap: 3px;
    }

    .log-event-section {
      font-size: 12px;
      display: flex;
      gap: 6px;
    }

    .log-section-label {
      color: var(--gold);
      white-space: nowrap;
      flex-shrink: 0;
    }

    .log-section-body {
      color: var(--text);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    /* ─── 履歴ビューア ─── */
    .history-card {
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      padding: 20px 24px;
      margin: 0 32px 20px;
    }

    .history-list {
      display: flex;
      flex-direction: column;
      gap: 2px;
      margin-top: 12px;
    }

    .history-session {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 10px 12px;
      border-radius: 6px;
      cursor: pointer;
      transition: background 0.15s;
      border: 1px solid transparent;
    }

    .history-session:hover { background: var(--bg); border-color: var(--border); }
    .history-session.active { background: var(--bg); border-color: var(--gold); }

    .history-session-date { font-size: 11px; color: var(--dim); white-space: nowrap; }
    .history-session-req  { font-size: 13px; color: var(--text); flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .history-session-count { font-size: 11px; color: var(--dim); white-space: nowrap; }

    .history-detail {
      margin-top: 16px;
      padding-top: 16px;
      border-top: 1px solid var(--border);
      display: none;
      flex-direction: column;
      gap: 10px;
      max-height: 480px;
      overflow-y: auto;
    }

    .history-detail.open { display: flex; }
  </style>
</head>
<body>

<header>
  <div>
    <div class="logo">JIN</div>
    <div class="tagline">${isJa ? 'あなたの次の一手を、布陣で支える' : 'Jin helps you decide the next move.'}</div>
  </div>
  <div class="badges">
    <div class="badge">${isJa ? 'モード' : 'Mode'}: <span>${data.config.mode}</span></div>
    <div class="badge">${isJa ? 'モデル' : 'Model'}: <span>${modelLabel}</span></div>
  </div>
</header>

<main>

  <!-- サマリー -->
  <div class="stats-grid">
    <div class="stat-card">
      <div class="stat-label">${isJa ? '仕様' : 'Specs'}</div>
      <div class="stat-value" id="stat-spec">${data.stats.specCount}</div>
      <div class="stat-sub">${isJa ? 'ファイル' : 'files'}</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">${isJa ? '手順' : 'Steps'}</div>
      <div class="stat-value" id="stat-task" style="color: var(--green)">${data.stats.taskCompleted} <span style="font-size:18px;color:var(--dim)">/ ${data.stats.taskTotal}</span></div>
      <div class="stat-sub">${isJa ? '完了 / 合計' : 'completed / total'}</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">${isJa ? '决定事項' : 'Decisions'}</div>
      <div class="stat-value" id="stat-decision">${data.stats.decisionCount}</div>
      <div class="stat-sub">${isJa ? '件' : 'entries'}</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">${isJa ? '構想' : 'Visions'}</div>
      <div class="stat-value" id="stat-req">${data.stats.requestCount}</div>
      <div class="stat-sub">${isJa ? '件（累計）' : 'total'}</div>
    </div>
  </div>

  <!-- ガントチャート（全幅） -->
  <div class="gantt-card">
    <div class="card-title-row">
      <div class="card-title">${isJa ? '駒の活動タイムライン' : 'Piece activity timeline'}</div>
      <div class="card-subtitle">
        ${data.gantt.isSample
          ? (isJa ? 'サンプル表示（構想を実行すると実データに切り替わります）' : 'Sample — run a vision to see real data')
          : `${data.gantt.requestType} · ${data.gantt.timestamp.slice(0, 16).replace('T', ' ')}`
        }
      </div>
    </div>
    <div class="gantt-wrap">
      <canvas id="chart-gantt"></canvas>
    </div>
  </div>

  <!-- チャート2列 -->
  <div class="charts-row">
    <div class="chart-card">
      <div class="card-title">${isJa ? '構想の推移（直近7日）' : 'Visions (last 7 days)'}</div>
      <div class="chart-wrap">
        <canvas id="chart-timeline"></canvas>
      </div>
    </div>
    <div class="chart-card">
      <div class="card-title">${isJa ? '手順の進捗' : 'Step progress'}</div>
      <div class="task-pct" id="task-pct">${taskPct}%</div>
      <div class="progress-bar-wrap">
        <div class="progress-bar" style="width: ${taskPct}%"></div>
      </div>
      <div class="task-detail">
        <span>${isJa ? '完了' : 'Completed'}: <strong style="color:var(--green)">${data.stats.taskCompleted}</strong></span>
        <span>${isJa ? '残り' : 'Remaining'}: <strong>${data.stats.taskTotal - data.stats.taskCompleted}</strong></span>
      </div>
    </div>
  </div>

  <!-- 駒カード -->
  <div>
    <div class="roles-title">${isJa ? '駒の報告' : 'Piece reports'}</div>
    <div class="roles-grid">
      ${data.roles.map((role) => `
      <div class="role-card" style="--role-color: ${role.color}">
        <div class="role-name-en" style="color: ${role.color}">${role.nameGlobal}</div>
        <div class="role-piece" style="color: ${role.color}">${role.nameJa}</div>
        <div class="role-desc">${isJa ? role.descJa : role.descEn}</div>
        <div class="role-divider"></div>
        <div class="role-count" style="color: ${role.color}">${role.count}</div>
        <div class="role-count-label">${isJa ? '処理件数' : 'requests'}</div>
      </div>`).join('')}
    </div>
  </div>

  <!-- 決定事項 -->
  <div class="decisions-card">
    <div class="card-title">${isJa ? '最近の决定事項' : 'Recent decisions'}</div>
    ${data.recentDecisions.length > 0
      ? `<ul class="decision-list">
          ${data.recentDecisions.map((d) => `
          <li class="decision-item">
            <span class="decision-date">${d.date}</span>
            <span class="decision-title">${d.title}</span>
          </li>`).join('')}
        </ul>`
      : `<div class="empty-state">${isJa ? '决定事項はまだありません' : 'No decisions yet'}</div>`
    }
  </div>

  <!-- リアルタイムログ -->
  <div class="live-card">
    <div class="live-header">
      <div class="card-title">${isJa ? 'リアルタイムログ' : 'Live interaction log'}</div>
      <div class="live-status">
        <div class="live-dot" id="live-dot"></div>
        <span id="live-status-text">${isJa ? '接続待機中' : 'waiting'}</span>
      </div>
    </div>
    <div class="live-feed" id="live-feed"></div>
  </div>

  <!-- 過去のやりとり -->
  <div class="history-card">
    <div class="card-title">${isJa ? '過去のやりとり' : 'Interaction history'}</div>
    <div class="history-list" id="history-list">
      <div class="empty-state">${isJa ? '読み込み中...' : 'Loading...'}</div>
    </div>
    <div class="history-detail" id="history-detail"></div>
  </div>

</main>

<button class="refresh-btn" onclick="location.reload()">↻ ${isJa ? '更新' : 'Refresh'}</button>

<script src="https://cdn.jsdelivr.net/npm/chart.js@4/dist/chart.umd.min.js"></script>
<script>
  // サーバー側で言語モードを埋め込む（ブラウザ側JSから参照可能にする）
  const IS_JA = ${isJa};

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

  // ── リアルタイムログ（SSE） ──────────────────────────────────────────────────

  const ROLE_COLORS = {
    kin: '#c9a227', gin: '#9ca3af', hisha: '#3b82f6',
    kaku: '#8b5cf6', keima: '#14b8a6', kyosha: '#f97316', fu: '#6b7280',
  };

  function colorForRole(roleId) {
    return ROLE_COLORS[roleId] ?? '#888';
  }

  function truncate(str, max = 80) {
    if (!str) return '';
    const s = str.replace(/\\s+/g, ' ').trim();
    return s.length > max ? s.slice(0, max) + '…' : s;
  }

  function renderEvent(ev) {
    const el = document.createElement('div');
    el.className = 'log-event';

    const color = colorForRole(ev.roleId);

    let verdictHtml = '';
    if (ev.verdict) {
      const labels = { approve: IS_JA ? '✓ 承認' : '✓ approved', retry: IS_JA ? '↩ 差し戻し' : '↩ retry', add: IS_JA ? '＋ 追加' : '＋ add' };
      verdictHtml = \`<span class="log-event-verdict verdict-\${ev.verdict}">\${labels[ev.verdict] ?? ev.verdict}</span>\`;
    }

    const phaseLabel = ev.phase ?? '';
    const sectionsHtml = (ev.sections ?? []).map(s =>
      \`<div class="log-event-section">
        <span class="log-section-label">[\${s.label}]</span>
        <span class="log-section-body">\${truncate(s.body)}</span>
      </div>\`
    ).join('');

    el.innerHTML = \`
      <div class="log-event-head">
        <span class="log-event-role" style="color:\${color}">\${ev.roleLabel ?? ev.roleId}</span>
        <span class="log-event-phase">─ \${phaseLabel}</span>
        \${verdictHtml}
      </div>
      \${ev.voice ? \`<div class="log-event-voice">「\${ev.voice}」</div>\` : ''}
      \${sectionsHtml ? \`<div class="log-event-sections">\${sectionsHtml}</div>\` : ''}
    \`;
    return el;
  }

  function connectSSE() {
    const feed   = document.getElementById('live-feed');
    const dot    = document.getElementById('live-dot');
    const status = document.getElementById('live-status-text');
    const es     = new EventSource('/api/events');

    es.onopen = () => {
      dot.classList.add('connected');
      status.textContent = IS_JA ? '接続中' : 'connected';
    };

    es.onmessage = (e) => {
      try {
        const ev = JSON.parse(e.data);
        const el = renderEvent(ev);
        feed.appendChild(el);
        feed.scrollTop = feed.scrollHeight;
      } catch {}
    };

    es.onerror = () => {
      dot.classList.remove('connected');
      status.textContent = IS_JA ? '切断 — 再接続中...' : 'disconnected — reconnecting...';
      es.close();
      setTimeout(connectSSE, 3000);
    };
  }

  connectSSE();

  // ── 過去のやりとり履歴 ───────────────────────────────────────────────────────

  let activeSessionId = null;

  async function loadHistory() {
    const list = document.getElementById('history-list');
    try {
      const sessions = await fetch('/api/logs').then(r => r.json());
      if (!sessions.length) {
        list.innerHTML = \`<div class="empty-state">\${IS_JA ? 'やりとりはまだありません' : 'No interactions yet'}</div>\`;
        return;
      }
      list.innerHTML = '';
      for (const s of sessions) {
        const el = document.createElement('div');
        el.className = 'history-session';
        el.dataset.id = s.id;
        const date = s.startedAt.slice(0, 16).replace('T', ' ');
        const done = s.finishedAt ? '' : (IS_JA ? ' ⏳' : ' ⏳');
        el.innerHTML = \`
          <span class="history-session-date">\${date}\${done}</span>
          <span class="history-session-req">\${s.requestText}</span>
          <span class="history-session-count">\${s.eventCount} \${IS_JA ? '件' : 'events'}</span>
        \`;
        el.addEventListener('click', () => toggleSession(s.id, el));
        list.appendChild(el);
      }
    } catch {
      list.innerHTML = \`<div class="empty-state">\${IS_JA ? '読み込みに失敗しました' : 'Failed to load'}</div>\`;
    }
  }

  async function toggleSession(id, el) {
    const detail = document.getElementById('history-detail');
    if (activeSessionId === id) {
      activeSessionId = null;
      el.classList.remove('active');
      detail.classList.remove('open');
      detail.innerHTML = '';
      return;
    }
    document.querySelectorAll('.history-session').forEach(e => e.classList.remove('active'));
    el.classList.add('active');
    activeSessionId = id;
    detail.innerHTML = \`<div class="empty-state">\${IS_JA ? '読み込み中...' : 'Loading...'}</div>\`;
    detail.classList.add('open');

    try {
      const session = await fetch(\`/api/logs/\${encodeURIComponent(id)}\`).then(r => r.json());
      detail.innerHTML = '';
      for (const ev of session.events) {
        detail.appendChild(renderEvent(ev));
      }
    } catch {
      detail.innerHTML = \`<div class="empty-state">\${IS_JA ? '読み込みに失敗しました' : 'Failed to load'}</div>\`;
    }
  }

  loadHistory();
</script>
</body>
</html>`;
}
