import type { DashboardData } from '../data.js';

/**
 * ダッシュボードの body 部の HTML を生成する。
 *
 * 14インチ MacBook Pro（1512×852 実効領域）を基準にした固定サイズの
 * 1ページグリッド（#stage）。大きい画面では transform: scale() で拡大し、
 * 小さい画面では等倍のままスクロールする（フィット処理は template.ts 側のJS）。
 *
 * 構成: 左カラム=統計・進捗・駒の報告・決定事項 / 中央=布陣盤・チャート / 右=会話ログ・履歴
 */
export function buildLayout(data: DashboardData, isJa: boolean): string {
  const taskPct = data.stats.taskTotal > 0
    ? Math.round((data.stats.taskCompleted / data.stats.taskTotal) * 100)
    : 0;

  const modelLabel = data.config.agent ?? (isJa ? 'ローカルLLM' : 'Local LLM');

  return `
<div id="stage">

<header>
  <div class="header-left">
    <div class="logo">JIN</div>
    <div class="tagline">${isJa ? 'あなたの次の一手を、布陣で支える' : 'Jin helps you decide the next move.'}</div>
  </div>
  <div class="badges">
    <div class="badge">${isJa ? 'モード' : 'Mode'}: <span>${data.config.mode}</span></div>
    <div class="badge">${isJa ? 'モデル' : 'Model'}: <span>${modelLabel}</span></div>
    <button class="refresh-btn" onclick="location.reload()">↻ ${isJa ? '更新' : 'Refresh'}</button>
  </div>
</header>

<main>

  <!-- 左カラム: 統計・進捗・駒の報告・決定事項 -->
  <section class="col col-left">

    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-label">${isJa ? '仕様' : 'Specs'}</div>
        <div class="stat-value" id="stat-spec">${data.stats.specCount}</div>
        <div class="stat-sub">${isJa ? 'ファイル' : 'files'}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">${isJa ? '手順' : 'Steps'}</div>
        <div class="stat-value" id="stat-task" style="color: var(--green)">${data.stats.taskCompleted} <span class="stat-value-sub">/ ${data.stats.taskTotal}</span></div>
        <div class="stat-sub">${isJa ? '完了 / 合計' : 'done / total'}</div>
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

    <div class="card progress-card">
      <div class="card-title-row">
        <div class="card-title">${isJa ? '手順の進捗' : 'Step progress'}</div>
        <div class="task-pct" id="task-pct">${taskPct}%</div>
      </div>
      <div class="progress-bar-wrap">
        <div class="progress-bar" style="width: ${taskPct}%"></div>
      </div>
    </div>

    <div class="card roles-card">
      <div class="card-title">${isJa ? '駒の報告' : 'Piece reports'}</div>
      <div class="roles-rows">
        ${data.roles.map((role) => `
        <div class="role-row" style="--role-color: ${role.color}">
          <span class="role-dot"></span>
          <span class="role-row-name">${isJa ? `${role.nameJa} ${role.nameGlobal}` : `${role.nameGlobal} ${role.nameJa}`}</span>
          <span class="role-row-desc">${isJa ? role.descJa : role.descEn}</span>
          <span class="role-row-count">${role.count}</span>
        </div>`).join('')}
      </div>
    </div>

    <div class="card decisions-card">
      <div class="card-title">${isJa ? '最近の决定事項' : 'Recent decisions'}</div>
      <div class="decisions-scroll">
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
    </div>

  </section>

  <!-- 中央カラム: 布陣盤・チャート -->
  <section class="col col-center">

    <div class="card board-card">
      <div class="card-title-row">
        <div class="card-title">${isJa ? '布陣盤 — 駒のデータフロー' : 'Formation board — piece data flow'}</div>
        <div class="card-subtitle">${isJa ? '実行中の駒が光り、報告・下知が矢印で流れます' : 'Active pieces glow; reports and directives flow as arrows'}</div>
      </div>
      <div id="board-svg-wrap"></div>
    </div>

    <div class="charts-row">
      <div class="card gantt-card">
        <div class="card-title-row">
          <div class="card-title">${isJa ? '駒の活動タイムライン' : 'Piece activity timeline'}</div>
          <div class="card-subtitle">
            ${data.gantt.isSample
              ? (isJa ? 'サンプル表示' : 'Sample data')
              : `${data.gantt.requestType} · ${data.gantt.timestamp.slice(0, 16).replace('T', ' ')}`
            }
          </div>
        </div>
        <div class="gantt-wrap">
          <canvas id="chart-gantt"></canvas>
        </div>
      </div>
      <div class="card chart-card">
        <div class="card-title">${isJa ? '構想の推移（直近7日）' : 'Visions (last 7 days)'}</div>
        <div class="chart-wrap">
          <canvas id="chart-timeline"></canvas>
        </div>
      </div>
    </div>

  </section>

  <!-- 右カラム: リアルタイム会話ログ・履歴 -->
  <section class="col col-right">

    <div class="card live-card">
      <div class="live-header">
        <div class="card-title">${isJa ? 'リアルタイムログ' : 'Live interaction log'}</div>
        <div class="live-status">
          <div class="live-dot" id="live-dot"></div>
          <span id="live-status-text">${isJa ? '接続待機中' : 'waiting'}</span>
        </div>
      </div>
      <div class="live-feed" id="live-feed"></div>
    </div>

    <div class="card history-card">
      <div class="card-title">${isJa ? '過去のやりとり' : 'Interaction history'}</div>
      <div class="history-list" id="history-list">
        <div class="empty-state">${isJa ? '読み込み中...' : 'Loading...'}</div>
      </div>
      <div class="history-detail" id="history-detail"></div>
    </div>

  </section>

</main>

</div>
`;
}
