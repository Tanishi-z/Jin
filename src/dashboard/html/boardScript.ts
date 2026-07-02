/**
 * 将棋盤風グラフビュー（布陣盤）のクライアントJS。
 * 素の SVG を動的に組み立て、SSE イベント（conversationScript から
 * animateBoard() 経由で受領）でノードの状態とデータフローの矢印を描画する。
 * IS_JA / ROLE_COLORS / nodeName / esc は conversationScript 側で定義済み。
 */
export function buildBoardScript(): string {
  return `
  // ── 布陣盤 ────────────────────────────────────────────────────────────────────

  const SVG_NS = 'http://www.w3.org/2000/svg';

  // 成り駒ID → 元の駒ID（盤上のノードは元の駒に固定し、成りは表示で表現する）
  const DEMOTION_MAP = { tokin: 'fu', narigin: 'gin', narikei: 'keima', narikyou: 'kyosha', ryuuou: 'hisha', ryuuma: 'kaku' };

  // 布陣配置（下段中央が金、その前列に飛・銀・角、先陣に香・桂・歩、最後方が殿）
  const BOARD_NODES = [
    { id: 'user',   x: 450, y: 388, label: IS_JA ? '殿' : 'Lord', color: '#e8e8e8' },
    { id: 'kin',    x: 450, y: 298 },
    { id: 'hisha',  x: 260, y: 196 },
    { id: 'gin',    x: 450, y: 196 },
    { id: 'kaku',   x: 640, y: 196 },
    { id: 'kyosha', x: 240, y: 94  },
    { id: 'keima',  x: 450, y: 94  },
    { id: 'fu',     x: 660, y: 94  },
  ];

  const boardState = { nodes: {}, edgeLayer: null, edges: [] };

  function boardBaseId(nodeId) {
    return DEMOTION_MAP[nodeId] ?? nodeId;
  }

  function buildBoard() {
    const host = document.getElementById('board-svg-wrap');
    if (!host) return;

    const svg = document.createElementNS(SVG_NS, 'svg');
    svg.setAttribute('viewBox', '0 0 900 430');
    svg.setAttribute('class', 'board-svg');

    // 盤面の段の目安線
    for (const y of [145, 247]) {
      const line = document.createElementNS(SVG_NS, 'line');
      line.setAttribute('x1', '60');  line.setAttribute('x2', '840');
      line.setAttribute('y1', y);     line.setAttribute('y2', y);
      line.setAttribute('class', 'board-rank-line');
      svg.appendChild(line);
    }

    // エッジ層（駒の下に描く）
    const edgeLayer = document.createElementNS(SVG_NS, 'g');
    svg.appendChild(edgeLayer);
    boardState.edgeLayer = edgeLayer;

    for (const def of BOARD_NODES) {
      const g = document.createElementNS(SVG_NS, 'g');
      g.setAttribute('transform', \`translate(\${def.x}, \${def.y})\`);
      g.setAttribute('class', 'bd-node idle');
      const color = def.color ?? ROLE_COLORS[def.id] ?? '#888';
      g.style.setProperty('--pc', color);

      // 五角形の駒シルエット
      const piece = document.createElementNS(SVG_NS, 'path');
      piece.setAttribute('d', 'M 0 -30 L 19 -16 L 15 26 L -15 26 L -19 -16 Z');
      piece.setAttribute('class', 'bd-piece');
      g.appendChild(piece);

      const text = document.createElementNS(SVG_NS, 'text');
      text.setAttribute('class', 'bd-label');
      text.setAttribute('text-anchor', 'middle');
      text.setAttribute('dominant-baseline', 'central');
      text.setAttribute('y', '4');
      text.textContent = def.label ?? nodeName(def.id);
      g.appendChild(text);

      svg.appendChild(g);
      boardState.nodes[def.id] = { g, text, def, promoted: false };
    }

    host.appendChild(svg);
  }

  function setNodeState(nodeId, state) {
    const node = boardState.nodes[boardBaseId(nodeId)];
    if (!node) return;
    node.g.classList.remove('idle', 'active', 'done');
    node.g.classList.add(state);
  }

  function promoteNode(nodeId) {
    const baseId = boardBaseId(nodeId);
    const node = boardState.nodes[baseId];
    if (!node || node.promoted) return;
    node.promoted = true;
    node.g.classList.add('promoted');
    // 表示名を成り駒名に差し替える（例: 銀 → 成銀）
    const promotedId = Object.keys(DEMOTION_MAP).find(k => DEMOTION_MAP[k] === baseId);
    if (promotedId) node.text.textContent = nodeName(promotedId);
  }

  function resetBoard() {
    for (const id of Object.keys(boardState.nodes)) {
      const node = boardState.nodes[id];
      node.g.classList.remove('active', 'done', 'promoted');
      node.g.classList.add('idle');
      node.promoted = false;
      node.text.textContent = node.def.label ?? nodeName(id);
    }
    for (const e of boardState.edges) e.remove();
    boardState.edges = [];
  }

  // from → to の曲線矢印を描き、流れるアニメーションを付ける
  function drawEdge(fromId, toId, kind) {
    if (!boardState.edgeLayer) return;
    const from = boardState.nodes[boardBaseId(fromId)];
    const to   = boardState.nodes[boardBaseId(toId)];
    if (!from || !to) return;

    const x1 = from.def.x, y1 = from.def.y;
    const x2 = to.def.x,   y2 = to.def.y;
    // 中点を法線方向に少し膨らませた二次ベジェ
    const mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
    const dx = x2 - x1, dy = y2 - y1;
    const len = Math.hypot(dx, dy) || 1;
    const bend = Math.min(40, len * 0.18);
    const cx = mx - (dy / len) * bend;
    const cy = my + (dx / len) * bend;

    const path = document.createElementNS(SVG_NS, 'path');
    path.setAttribute('d', \`M \${x1} \${y1} Q \${cx} \${cy} \${x2} \${y2}\`);
    path.setAttribute('class', 'bd-edge edge-' + (kind ?? 'flow'));
    boardState.edgeLayer.appendChild(path);
    boardState.edges.push(path);

    // 古いエッジを間引く（直近8本まで）
    while (boardState.edges.length > 8) {
      const old = boardState.edges.shift();
      old.classList.add('fading');
      setTimeout(() => old.remove(), 600);
    }

    // 一定時間後にフェードアウト
    setTimeout(() => {
      path.classList.add('fading');
      setTimeout(() => {
        path.remove();
        const i = boardState.edges.indexOf(path);
        if (i >= 0) boardState.edges.splice(i, 1);
      }, 600);
    }, 6000);
  }

  // SSE / リプレイからイベントを受けて盤面を動かす
  function animateBoard(ev) {
    switch (ev.type) {
      case 'session-start':
        resetBoard();
        setNodeState('kin', 'active');
        if (ev.from && ev.to) drawEdge(ev.from, ev.to, 'flow');
        break;

      case 'analysis': {
        const pieceId = ev.roleId;
        setNodeState(pieceId, 'active');
        if (pieceId !== 'kin') {
          drawEdge(ev.from ?? pieceId, ev.to ?? 'kin', 'flow');
          // 報告を終えた駒は少し置いて完了表示へ
          setTimeout(() => setNodeState(pieceId, 'done'), 1200);
        }
        break;
      }

      case 'kin-review': {
        const target = ev.targetRoleId ?? ev.to;
        const kind = ev.verdict === 'retry' ? 'retry' : ev.verdict === 'add' ? 'add' : 'approve';
        if (target) drawEdge('kin', target, kind);
        if (ev.verdict === 'retry' && target) setNodeState(target, 'active');
        if (ev.verdict === 'approve' && target) setNodeState(target, 'done');
        if (ev.verdict === 'add' && ev.additionalRoles) {
          for (const r of ev.additionalRoles) setNodeState(r, 'active');
        }
        break;
      }

      case 'impl':
      case 'impl-task': {
        const pieceId = ev.roleId;
        promoteNode(pieceId);
        setNodeState(pieceId, 'active');
        drawEdge(ev.from ?? pieceId, ev.to ?? (ev.type === 'impl' ? 'kin' : 'user'), 'flow');
        setTimeout(() => setNodeState(pieceId, 'done'), 1200);
        break;
      }

      case 'kin-summary':
        drawEdge('kin', 'user', 'approve');
        setNodeState('kin', 'done');
        break;

      case 'session-end':
        setTimeout(() => {
          for (const id of Object.keys(boardState.nodes)) setNodeState(id, 'idle');
        }, 2500);
        break;
    }
  }

  // 履歴セッションを盤上でリプレイする（400ms間隔）
  let replayTimers = [];
  function replayBoard(events) {
    for (const t of replayTimers) clearTimeout(t);
    replayTimers = [];
    resetBoard();
    events.forEach((ev, i) => {
      replayTimers.push(setTimeout(() => animateBoard(ev), i * 400));
    });
  }

  buildBoard();
`;
}
