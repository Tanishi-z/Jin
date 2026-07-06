import http from 'http';
import { exec } from 'child_process';
import { readDashboardData } from './data.js';
import { buildHtml } from './template.js';
import { subscribe } from './eventBus.js';
import { listSessions, readSession } from '../activity/interactionWriter.js';

// 既定ポート3050。他アプリと衝突する場合は JIN_DASHBOARD_PORT で変更できる
const PORT = Number(process.env.JIN_DASHBOARD_PORT ?? 3050) || 3050;

function openBrowser(url: string): void {
  const cmd =
    process.platform === 'darwin' ? `open "${url}"` :
    process.platform === 'win32'  ? `start "${url}"` :
                                    `xdg-open "${url}"`;
  exec(cmd, (err) => {
    if (err) console.error(`ブラウザを開けませんでした: ${url}`);
  });
}

export function startDashboard(): void {
  const server = http.createServer((req, res) => {
    const url = req.url ?? '/';

    // ── SSE: リアルタイムイベントストリーム ──
    if (url === '/api/events') {
      res.writeHead(200, {
        'Content-Type':  'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection':    'keep-alive',
        'Access-Control-Allow-Origin': '*',
      });

      // 接続確認用の初期pingを送る
      res.write('event: ping\ndata: {}\n\n');

      const unsubscribe = subscribe((event) => {
        res.write(`data: ${JSON.stringify(event)}\n\n`);
      });

      req.on('close', unsubscribe);
      return;
    }

    // ── REST: ログ一覧 ──
    if (url === '/api/logs') {
      res.writeHead(200, {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      });
      res.end(JSON.stringify(listSessions()));
      return;
    }

    // ── REST: ログ詳細 ──
    const logMatch = url.match(/^\/api\/logs\/(.+)$/);
    if (logMatch) {
      const session = readSession(decodeURIComponent(logMatch[1]!));
      if (!session) {
        res.writeHead(404);
        res.end(JSON.stringify({ error: 'not found' }));
        return;
      }
      res.writeHead(200, {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      });
      res.end(JSON.stringify(session));
      return;
    }

    // ── REST: ダッシュボードデータ ──
    if (url === '/api/data') {
      try {
        const data = readDashboardData();
        res.writeHead(200, {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        });
        res.end(JSON.stringify(data));
      } catch (err) {
        res.writeHead(500);
        res.end(JSON.stringify({ error: String(err) }));
      }
      return;
    }

    // ── HTML ダッシュボード ──
    try {
      const data = readDashboardData();
      const html = buildHtml(data);
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(html);
    } catch (err) {
      res.writeHead(500);
      res.end(`<pre>${String(err)}</pre>`);
    }
  });

  server.on('error', (err: NodeJS.ErrnoException) => {
    if (err.code === 'EADDRINUSE') openBrowser(`http://localhost:${PORT}`);
  });

  server.listen(PORT, () => { openBrowser(`http://localhost:${PORT}`); });
  server.unref();
}
