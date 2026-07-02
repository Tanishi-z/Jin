import type { DashboardData } from '../data.js';

/**
 * ダッシュボードの body 部の HTML を生成する。
 */
export function buildLayout(data: DashboardData, isJa: boolean): string {
  const taskPct = data.stats.taskTotal > 0
    ? Math.round((data.stats.taskCompleted / data.stats.taskTotal) * 100)
    : 0;

  const modelLabel = data.config.agent ?? (isJa ? 'ローカルLLM' : 'Local LLM');

  return `
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
`;
}
