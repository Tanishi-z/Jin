/**
 * 会話ビュー（上司=金と部下=各駒の対話表示）と履歴ビューアのクライアントJS。
 * SSE 接続は boardScript と共有するため、イベントを受けたら
 * appendConversation() と（定義されていれば）animateBoard() の両方を呼ぶ。
 * IS_JA はテンプレート先頭の共通スクリプトで定義済み。
 */
export function buildConversationScript(): string {
  return `
  // ── 共通ユーティリティ ────────────────────────────────────────────────────────

  const ROLE_COLORS = {
    kin: '#c9a227', gin: '#9ca3af', hisha: '#3b82f6',
    kaku: '#8b5cf6', keima: '#14b8a6', kyosha: '#f97316', fu: '#6b7280',
  };

  // データフローのノードID → 表示名（'user' は殿）
  const NODE_LABELS = IS_JA
    ? { user: '殿', kin: '金', gin: '銀', hisha: '飛車', kaku: '角', keima: '桂馬', kyosha: '香車', fu: '歩',
        tokin: 'と金', narigin: '成銀', narikei: '成桂', narikyou: '成香', ryuuou: '龍王', ryuuma: '龍馬' }
    : { user: 'Lord', kin: 'Kin', gin: 'Gin', hisha: 'Hisha', kaku: 'Kaku', keima: 'Keima', kyosha: 'Kyosha', fu: 'Fu',
        tokin: 'Tokin', narigin: 'Narigin', narikei: 'Narikei', narikyou: 'Narikyou', ryuuou: 'Ryuuou', ryuuma: 'Ryuuma' };

  function colorForRole(roleId) {
    return ROLE_COLORS[roleId] ?? '#888';
  }

  function esc(str) {
    return String(str ?? '')
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function truncate(str, max = 120) {
    if (!str) return '';
    const s = str.replace(/\\s+/g, ' ').trim();
    return s.length > max ? s.slice(0, max) + '…' : s;
  }

  function nodeName(id) {
    return NODE_LABELS[id] ?? id ?? '';
  }

  // 駒の表示名から短い名乗り（漢字部分）を取り出す（例: "成銀（Narigin）" → "成銀"）
  function shortName(label) {
    if (!label) return '';
    return label.replace(/（.*$/, '').replace(/\\(.*$/, '').trim().slice(0, 4);
  }

  // ── 会話ビュー ────────────────────────────────────────────────────────────────

  // イベント種別 → 口上（ヘッダーの用件名）
  const PHASE_WORDS = IS_JA
    ? { 'analysis': '分析言上', 'kin-review': '下知', 'impl': '実装言上', 'kin-summary': '統合上奏', 'impl-task': '実装言上' }
    : { 'analysis': 'report', 'kin-review': 'directive', 'impl': 'implementation', 'kin-summary': 'integrated plan', 'impl-task': 'implementation' };

  // 金の判定 → 武家風バッジ
  const VERDICT_BADGES = IS_JA
    ? { approve: '◎ 大儀である', retry: '↩ 出直して参れ', add: '＋ 陣を厚くせよ' }
    : { approve: '◎ Well done', retry: '↩ Redo it', add: '＋ Reinforce the ranks' };

  // 旧ログ（from/to 無し）のための補完
  function inferFlow(ev) {
    if (ev.from && ev.to) return { from: ev.from, to: ev.to };
    switch (ev.type) {
      case 'analysis':    return { from: ev.roleId === 'kin' ? 'user' : ev.roleId, to: 'kin' };
      case 'kin-review':  return { from: 'kin', to: ev.targetRoleId ?? null };
      case 'impl':        return { from: ev.roleId, to: 'kin' };
      case 'kin-summary': return { from: 'kin', to: 'user' };
      case 'impl-task':   return { from: ev.roleId, to: 'user' };
      default:            return { from: null, to: null };
    }
  }

  // llmCalls の詳細（生プロンプト）折りたたみパネル
  function renderCallDetails(ev) {
    const calls = ev.llmCalls ?? [];
    if (!calls.length) return '';

    const totalMs = ev.durationMs ?? calls.reduce((s, c) => s + (c.durationMs ?? 0), 0);
    const secs    = (totalMs / 1000).toFixed(1);
    const model   = ev.model ?? calls[calls.length - 1].model;

    const blocks = calls.map((c, i) => {
      const title = [
        c.label ? esc(c.label) : (calls.length > 1 ? (IS_JA ? '呼び出し ' : 'call ') + (i + 1) : ''),
        esc(c.model) + ' · temp ' + esc(c.temperature) + ' · ' + ((c.durationMs ?? 0) / 1000).toFixed(1) + 's',
        c.ok === false ? (IS_JA ? '⚠ 失敗' : '⚠ failed') : '',
      ].filter(Boolean).join(' ─ ');
      return \`
        <div class="call-block">
          <div class="call-block-title">\${title}</div>
          <div class="call-part-label">\${IS_JA ? 'システムプロンプト（受領した指示・文脈）' : 'System prompt'}</div>
          <pre class="call-pre">\${esc(c.systemPrompt)}</pre>
          <div class="call-part-label">\${IS_JA ? 'ユーザープロンプト（受領した依頼内容）' : 'User prompt'}</div>
          <pre class="call-pre">\${esc(c.userPrompt)}</pre>
          \${c.responseText ? \`
          <div class="call-part-label">\${IS_JA ? '応答全文' : 'Raw response'}</div>
          <pre class="call-pre">\${esc(c.responseText)}</pre>\` : ''}
        </div>\`;
    }).join('');

    return \`
      <details class="conv-details">
        <summary>⚙ \${IS_JA ? '詳細' : 'details'}（\${esc(model)} · \${secs}s\${calls.length > 1 ? ' · ' + calls.length + (IS_JA ? '回' : ' calls') : ''}）</summary>
        \${blocks}
      </details>\`;
  }

  function renderSections(sections) {
    if (!sections || !sections.length) return '';
    const rows = sections.map(s =>
      \`<div class="log-event-section">
        <span class="log-section-label">[\${esc(s.label)}]</span>
        <span class="log-section-body">\${esc(truncate(s.body))}</span>
      </div>\`
    ).join('');
    return \`<div class="log-event-sections">\${rows}</div>\`;
  }

  // 1イベントを会話バブル（または地の文）として描画する
  function renderEvent(ev) {
    const el = document.createElement('div');

    // 地の文（セッション開始・終了）
    if (ev.type === 'session-start') {
      el.className = 'conv-row center';
      el.innerHTML = \`<div class="conv-narration">\${
        IS_JA
          ? '殿より構想が下された ―『' + esc(truncate(ev.requestText, 90)) + '』'
          : 'A vision has been handed down — "' + esc(truncate(ev.requestText, 90)) + '"'
      }</div>\`;
      return el;
    }
    if (ev.type === 'session-end') {
      el.className = 'conv-row center';
      el.innerHTML = \`<div class="conv-narration">\${IS_JA ? '― 一同、任を果たした ―' : '— All pieces have completed their duty —'}</div>\`;
      return el;
    }

    const isKin  = ev.roleId === 'kin';
    const color  = colorForRole(ev.roleId);
    const flow   = inferFlow(ev);
    const phrase = PHASE_WORDS[ev.type] ?? ev.phase ?? '';

    // ヘッダー: 「銀 → 金 ─ 分析言上」（送り元が駒名と重複しない場合は roleLabel を優先）
    const fromName = flow.from ? nodeName(flow.from) : shortName(ev.roleLabel);
    const headText = flow.to
      ? \`\${esc(fromName)} → \${esc(nodeName(flow.to))} ─ \${esc(phrase)}\`
      : \`\${esc(ev.roleLabel ?? ev.roleId ?? '')} ─ \${esc(phrase)}\`;

    let badgeHtml = '';
    if (ev.verdict) {
      badgeHtml = \`<span class="log-event-verdict verdict-\${esc(ev.verdict)}">\${VERDICT_BADGES[ev.verdict] ?? esc(ev.verdict)}</span>\`;
    }

    // 本文パート
    let bodyHtml = '';
    if (ev.voice) bodyHtml += \`<div class="conv-voice">「\${esc(ev.voice)}」</div>\`;

    if (ev.type === 'kin-review') {
      // 下知: 理由と指導内容を会話として見せる
      if (ev.reason) bodyHtml += \`<div class="conv-line">\${esc(ev.reason)}</div>\`;
      if (ev.verdict === 'retry' && ev.instructions) {
        bodyHtml += \`<div class="conv-guidance"><span class="conv-guidance-label">\${IS_JA ? '指導' : 'guidance'}</span>\${esc(ev.instructions)}</div>\`;
      }
      if (ev.verdict === 'add' && ev.additionalRoles && ev.additionalRoles.length) {
        const names = ev.additionalRoles.map(nodeName).join(IS_JA ? '、' : ', ');
        bodyHtml += \`<div class="conv-line">\${IS_JA ? '召集: ' : 'Summon: '}\${esc(names)}</div>\`;
      }
    } else {
      bodyHtml += renderSections(ev.sections);
    }

    // impl-task の変更ファイル一覧
    if (ev.files && ev.files.length) {
      const fileRows = ev.files.map(f => {
        const mark = f.type === 'create' ? '＋' : f.type === 'delete' ? '－' : '±';
        return \`<div class="conv-file"><span class="conv-file-mark type-\${esc(f.type)}">\${mark}</span>\${esc(f.path)}</div>\`;
      }).join('');
      bodyHtml += \`<div class="conv-files">\${fileRows}</div>\`;
    }
    if (ev.explanation) bodyHtml += \`<div class="conv-line">\${esc(truncate(ev.explanation, 200))}</div>\`;

    bodyHtml += renderCallDetails(ev);

    el.className = 'conv-row ' + (isKin ? 'left' : 'right');
    el.innerHTML = \`
      <div class="conv-avatar" style="--pc:\${color}">\${esc(shortName(ev.roleLabel) || nodeName(ev.roleId))}</div>
      <div class="conv-bubble" style="--pc:\${color}">
        <div class="log-event-head">
          <span class="log-event-role" style="color:\${color}">\${headText}</span>
          \${badgeHtml}
        </div>
        \${bodyHtml}
      </div>
    \`;
    return el;
  }

  // ── SSE 接続（会話ビュー・盤面ビュー共通の受信口） ───────────────────────────

  function appendConversation(ev) {
    const feed = document.getElementById('live-feed');
    feed.appendChild(renderEvent(ev));
    feed.scrollTop = feed.scrollHeight;
  }

  function connectSSE() {
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
        appendConversation(ev);
        if (typeof animateBoard === 'function') animateBoard(ev);
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
        const kind = s.kind === 'task' ? '⚒ ' : '';
        const done = s.finishedAt ? '' : ' ⏳';
        el.innerHTML = \`
          <span class="history-session-date">\${esc(date)}\${done}</span>
          <span class="history-session-req">\${kind}\${esc(s.requestText)}</span>
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
      // 布陣盤でセッションをリプレイする
      if (typeof replayBoard === 'function') replayBoard(session.events);
    } catch {
      detail.innerHTML = \`<div class="empty-state">\${IS_JA ? '読み込みに失敗しました' : 'Failed to load'}</div>\`;
    }
  }

  loadHistory();
`;
}
