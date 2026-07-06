/**
 * ダッシュボードのCSS。
 * template.ts の buildHtml から連結される文字列を返す。
 */
export function buildStyles(isJa: boolean): string {
  return `
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
      overflow: auto;
    }

    /* ─── 固定ステージ（14インチ MacBook Pro 基準の1ページ） ───
       大きい画面では transform: scale() で拡大、小さい画面では等倍スクロール */
    #stage {
      width: 1512px;
      height: 852px;
      transform-origin: top left;
      display: flex;
      flex-direction: column;
      padding: 10px 16px 14px;
    }

    /* ─── ヘッダー ─── */
    header {
      border-bottom: 1px solid var(--border);
      padding: 6px 4px 10px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      flex-shrink: 0;
    }

    .header-left {
      display: flex;
      align-items: baseline;
      gap: 14px;
    }

    .logo {
      font-family: 'SF Mono', 'Cascadia Code', monospace;
      font-size: 20px;
      font-weight: 700;
      background: linear-gradient(180deg, var(--red1), var(--red2), var(--red3), var(--red4));
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      letter-spacing: 0.1em;
    }

    .tagline {
      color: var(--dim);
      font-size: 12px;
    }

    .badges {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-shrink: 0;
    }

    .badge {
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: 20px;
      padding: 3px 12px;
      font-size: 12px;
      color: var(--dim);
    }

    .badge span { color: var(--text); }

    /* ─── メイングリッド（3カラム） ─── */
    main {
      flex: 1;
      min-height: 0;
      display: grid;
      grid-template-columns: 330px 1fr 430px;
      gap: 12px;
      padding-top: 12px;
    }

    .col {
      display: flex;
      flex-direction: column;
      gap: 12px;
      min-height: 0;
      min-width: 0;
    }

    /* ─── 共通カード ─── */
    .card {
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      padding: 12px 16px;
      min-height: 0;
    }

    /* ─── サマリーカード ─── */
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 10px;
      flex-shrink: 0;
    }

    .stat-card {
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      padding: 10px 14px;
    }

    .stat-label {
      font-size: 11px;
      color: var(--dim);
      text-transform: uppercase;
      letter-spacing: 0.08em;
    }

    .stat-value {
      font-size: 24px;
      font-weight: 700;
      margin-top: 4px;
      line-height: 1;
      font-variant-numeric: tabular-nums;
    }

    .stat-value-sub {
      font-size: 14px;
      color: var(--dim);
    }

    .stat-sub {
      font-size: 11px;
      color: var(--dim);
      margin-top: 4px;
    }

    /* ─── チャート行（中央カラム下段） ─── */
    .charts-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
      height: 216px;
      flex-shrink: 0;
    }

    .chart-card {
      display: flex;
      flex-direction: column;
    }

    .card-title {
      font-size: 12px;
      font-weight: 600;
      color: var(--dim);
      text-transform: uppercase;
      letter-spacing: 0.08em;
      margin-bottom: 10px;
    }

    .card-title-row {
      display: flex;
      align-items: baseline;
      justify-content: space-between;
      margin-bottom: 8px;
      gap: 8px;
    }

    .card-title-row .card-title { margin-bottom: 0; }

    .card-subtitle {
      font-size: 11px;
      color: var(--dim);
      font-weight: 400;
      text-transform: none;
      letter-spacing: 0;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .chart-wrap {
      position: relative;
      flex: 1;
      min-height: 0;
    }

    /* ガントチャート */
    .gantt-card {
      display: flex;
      flex-direction: column;
    }

    .gantt-wrap {
      position: relative;
      flex: 1;
      min-height: 0;
    }

    /* 手順進捗バー */
    .progress-card { flex-shrink: 0; }

    .task-pct {
      font-size: 18px;
      font-weight: 700;
      color: var(--green);
      line-height: 1;
    }

    .progress-bar-wrap {
      background: var(--border);
      border-radius: 4px;
      height: 8px;
      overflow: hidden;
    }

    .progress-bar {
      height: 100%;
      background: linear-gradient(90deg, var(--green), #16a34a);
      border-radius: 4px;
      transition: width 0.6s ease;
    }

    /* ─── 駒の報告（コンパクト行） ─── */
    .roles-card { flex-shrink: 0; }

    .roles-rows {
      display: flex;
      flex-direction: column;
    }

    .role-row {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 5px 0;
      border-bottom: 1px solid var(--border);
      font-size: 12px;
    }

    .role-row:last-child { border-bottom: none; }

    .role-dot {
      width: 8px;
      height: 8px;
      border-radius: 2px;
      background: var(--role-color);
      flex-shrink: 0;
    }

    .role-row-name {
      font-weight: 600;
      color: var(--role-color);
      white-space: nowrap;
      min-width: 96px;
    }

    .role-row-desc {
      flex: 1;
      min-width: 0;
      color: var(--dim);
      font-size: 11px;
      white-space: nowrap;
      overflow: hidden;
    }

    .role-row-desc .marquee-inner { display: inline-block; }

    /* はみ出す説明文だけ右から左へ流す（.scrolling はJSが付与、ホバーで一時停止） */
    .role-row-desc.scrolling .marquee-inner {
      animation: marquee var(--marquee-dur, 10s) linear infinite;
    }

    .role-row:hover .marquee-inner { animation-play-state: paused; }

    @keyframes marquee {
      from { transform: translateX(0); }
      to   { transform: translateX(-50%); }
    }

    .role-row-count {
      font-weight: 700;
      font-variant-numeric: tabular-nums;
      color: var(--role-color);
    }

    /* ─── 决定事項 ─── */
    .decisions-card {
      flex: 1;
      display: flex;
      flex-direction: column;
    }

    .decisions-scroll {
      flex: 1;
      overflow-y: auto;
      min-height: 0;
    }

    .decision-list { list-style: none; }

    .decision-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 6px 0;
      border-bottom: 1px solid var(--border);
      font-size: 12px;
    }

    .decision-item:last-child { border-bottom: none; }

    .decision-date {
      font-size: 11px;
      color: var(--dim);
      white-space: nowrap;
      font-variant-numeric: tabular-nums;
    }

    .decision-title {
      color: var(--text);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .empty-state {
      color: var(--dim);
      font-size: 13px;
      padding: 12px 0;
    }

    /* ─── リフレッシュ ─── */
    .refresh-btn {
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: 20px;
      color: var(--dim);
      padding: 3px 12px;
      font-size: 12px;
      cursor: pointer;
      transition: color 0.2s, border-color 0.2s;
    }

    .refresh-btn:hover { color: var(--text); border-color: var(--dim); }

    /* ─── リアルタイムログ ─── */
    .live-card {
      flex: 3;
      display: flex;
      flex-direction: column;
    }

    .live-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 10px;
      flex-shrink: 0;
    }

    .live-header .card-title { margin-bottom: 0; }

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
      flex: 1;
      min-height: 0;
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
      flex: 2;
      display: flex;
      flex-direction: column;
    }

    .history-list {
      display: flex;
      flex-direction: column;
      gap: 2px;
      flex: 1;
      min-height: 0;
      overflow-y: auto;
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
      margin-top: 10px;
      padding-top: 10px;
      border-top: 1px solid var(--border);
      display: none;
      flex-direction: column;
      gap: 10px;
      max-height: 55%;
      overflow-y: auto;
      flex-shrink: 0;
    }

    .history-detail.open { display: flex; }

    /* ─── 布陣盤 ─── */
    .board-card {
      flex: 1;
      display: flex;
      flex-direction: column;
    }

    #board-svg-wrap {
      flex: 1;
      min-height: 0;
    }

    .board-svg {
      width: 100%;
      height: 100%;
      display: block;
      background:
        linear-gradient(rgba(201,162,39,0.02), rgba(201,162,39,0.05));
      border: 1px solid var(--border);
      border-radius: 8px;
    }

    .board-rank-line {
      stroke: var(--border);
      stroke-width: 1;
      stroke-dasharray: 4 6;
    }

    .bd-node { transition: opacity 0.4s; }
    .bd-node.idle { opacity: 0.35; }
    .bd-node.active { opacity: 1; }
    .bd-node.done { opacity: 0.85; }

    .bd-piece {
      fill: #1d1a12;
      stroke: var(--pc, #888);
      stroke-width: 1.5;
      transition: filter 0.3s, stroke 0.3s;
    }

    .bd-node.active .bd-piece {
      filter: drop-shadow(0 0 6px var(--pc, #888));
      animation: bd-pulse 1.4s ease-in-out infinite;
    }

    .bd-node.done .bd-piece { stroke-width: 2; }

    .bd-node.promoted .bd-piece {
      stroke: var(--gold);
      fill: #241d0c;
      filter: drop-shadow(0 0 5px rgba(201,162,39,0.6));
    }

    .bd-node.promoted .bd-label { fill: var(--gold); }

    @keyframes bd-pulse {
      0%, 100% { filter: drop-shadow(0 0 3px var(--pc, #888)); }
      50%       { filter: drop-shadow(0 0 10px var(--pc, #888)); }
    }

    .bd-label {
      fill: var(--text);
      font-size: 14px;
      font-weight: 700;
      pointer-events: none;
    }

    .bd-edge {
      fill: none;
      stroke-width: 2;
      stroke-linecap: round;
      stroke-dasharray: 8 6;
      animation: bd-flow 0.9s linear infinite;
      opacity: 0.9;
      transition: opacity 0.6s;
    }

    .bd-edge.fading { opacity: 0; }

    .edge-flow    { stroke: #9ca3af; }
    .edge-approve { stroke: var(--green); }
    .edge-retry   { stroke: #ef4444; }
    .edge-add     { stroke: #60a5fa; }

    @keyframes bd-flow {
      from { stroke-dashoffset: 28; }
      to   { stroke-dashoffset: 0; }
    }

    /* ─── 会話ビュー ─── */
    .conv-row {
      display: flex;
      align-items: flex-start;
      gap: 10px;
      animation: fadeIn 0.25s ease;
    }

    .conv-row.right { flex-direction: row-reverse; }
    .conv-row.center { justify-content: center; }

    .conv-avatar {
      flex-shrink: 0;
      min-width: 40px;
      height: 40px;
      padding: 0 6px;
      border-radius: 8px;
      border: 1px solid var(--pc, var(--border));
      background: color-mix(in srgb, var(--pc, #888) 12%, var(--bg));
      color: var(--pc, var(--text));
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 13px;
      font-weight: 700;
      letter-spacing: 0.05em;
    }

    .conv-bubble {
      background: var(--bg);
      border: 1px solid var(--border);
      border-left: 3px solid var(--pc, var(--border));
      border-radius: 10px;
      padding: 12px 14px;
      max-width: 82%;
      min-width: 240px;
    }

    .conv-row.right .conv-bubble {
      border-left: 1px solid var(--border);
      border-right: 3px solid var(--pc, var(--border));
    }

    .conv-narration {
      color: var(--dim);
      font-size: 12px;
      font-style: italic;
      padding: 6px 0;
      text-align: center;
    }

    .conv-voice {
      font-size: 12px;
      font-style: italic;
      color: var(--dim);
      margin-bottom: 8px;
    }

    .conv-line {
      font-size: 12px;
      color: var(--text);
      margin-bottom: 6px;
      line-height: 1.5;
    }

    .conv-guidance {
      font-size: 12px;
      color: var(--text);
      background: rgba(250,204,21,0.06);
      border-left: 2px solid #facc15;
      border-radius: 4px;
      padding: 8px 10px;
      margin: 6px 0;
      line-height: 1.5;
    }

    .conv-guidance-label {
      display: inline-block;
      color: #facc15;
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      margin-right: 8px;
    }

    .conv-files { margin-top: 6px; }

    .conv-file {
      font-family: 'SF Mono', 'Cascadia Code', monospace;
      font-size: 11px;
      color: var(--text);
      padding: 2px 0;
    }

    .conv-file-mark { margin-right: 6px; }
    .conv-file-mark.type-create { color: var(--green); }
    .conv-file-mark.type-modify { color: #facc15; }
    .conv-file-mark.type-delete { color: #ff4444; }

    /* 生プロンプト折りたたみ */
    .conv-details {
      margin-top: 10px;
      border-top: 1px dashed var(--border);
      padding-top: 8px;
    }

    .conv-details summary {
      font-size: 11px;
      color: var(--dim);
      cursor: pointer;
      user-select: none;
    }

    .conv-details summary:hover { color: var(--text); }

    .call-block { margin-top: 10px; }

    .call-block-title {
      font-size: 11px;
      color: var(--gold);
      margin-bottom: 6px;
    }

    .call-part-label {
      font-size: 10px;
      color: var(--dim);
      text-transform: uppercase;
      letter-spacing: 0.06em;
      margin: 8px 0 4px;
    }

    .call-pre {
      background: #0a0a0a;
      border: 1px solid var(--border);
      border-radius: 6px;
      padding: 10px 12px;
      font-family: 'SF Mono', 'Cascadia Code', monospace;
      font-size: 11px;
      line-height: 1.55;
      color: #bbb;
      white-space: pre-wrap;
      word-break: break-word;
      max-height: 320px;
      overflow-y: auto;
    }
`;
}
