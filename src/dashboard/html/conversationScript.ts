/**
 * リアルタイムログ（SSE）と履歴ビューアのクライアントJSを生成する。
 * IS_JA はテンプレート先頭の共通スクリプトで定義済み。
 */
export function buildConversationScript(): string {
  return `
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
`;
}
