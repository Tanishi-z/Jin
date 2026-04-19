import { execSync, spawn } from 'child_process';

/** Ollama がインストール済みかどうかを確認する */
export function isOllamaInstalled(): boolean {
  try {
    execSync('which ollama', { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

/** Ollama サービスが起動中かどうかを確認する */
export async function isOllamaRunning(): Promise<boolean> {
  try {
    const res = await fetch('http://localhost:11434/api/tags', { signal: AbortSignal.timeout(2000) });
    return res.ok;
  } catch {
    return false;
  }
}

/** Ollama サービスをバックグラウンドで起動する */
export function startOllama(): void {
  const child = spawn('ollama', ['serve'], {
    detached: true,
    stdio:    'ignore',
  });
  child.unref();
}

/** インストール済みモデルの情報 */
export interface InstalledModel {
  name:   string;
  /** バイト単位のサイズ */
  size:   number;
  /** 表示用サイズ文字列（例: "4.7 GB"） */
  sizeLabel: string;
}

/** Ollama にインストール済みのモデル一覧を返す */
export async function listInstalledModels(): Promise<InstalledModel[]> {
  try {
    const res  = await fetch('http://localhost:11434/api/tags', { signal: AbortSignal.timeout(3000) });
    if (!res.ok) return [];
    const data = await res.json() as { models: Array<{ name: string; size: number }> };
    return (data.models ?? []).map((m) => ({
      name:      m.name,
      size:      m.size,
      sizeLabel: formatBytes(m.size),
    }));
  } catch {
    return [];
  }
}

/** 指定したモデルが既にローカルに存在するかを確認する */
export async function isModelPulled(modelName: string): Promise<boolean> {
  try {
    const res  = await fetch('http://localhost:11434/api/tags');
    const data = await res.json() as { models: Array<{ name: string }> };
    return data.models.some((m) => m.name.startsWith(modelName.split(':')[0]!));
  } catch {
    return false;
  }
}

/** バイト数を人間が読みやすい文字列に変換する */
function formatBytes(bytes: number): string {
  if (bytes >= 1_000_000_000) return `${(bytes / 1_000_000_000).toFixed(1)} GB`;
  if (bytes >= 1_000_000)     return `${(bytes / 1_000_000).toFixed(0)} MB`;
  return `${bytes} B`;
}

/** モデルをプルする。進捗コールバックで状況を通知する */
export async function pullModel(
  modelName: string,
  onProgress: (status: string) => void,
): Promise<void> {
  const res = await fetch('http://localhost:11434/api/pull', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ name: modelName, stream: true }),
  });

  if (!res.ok || !res.body) {
    throw new Error(`モデルの取得に失敗しました: ${res.statusText}`);
  }

  const reader  = res.body.getReader();
  const decoder = new TextDecoder();

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const lines = decoder.decode(value).split('\n').filter(Boolean);
    for (const line of lines) {
      try {
        const json = JSON.parse(line) as { status?: string; completed?: number; total?: number };
        if (json.status) {
          const progress =
            json.completed && json.total
              ? ` (${Math.round((json.completed / json.total) * 100)}%)`
              : '';
          onProgress(`${json.status}${progress}`);
        }
      } catch {
        // JSONパース失敗行は無視
      }
    }
  }
}

/** プラットフォームに応じたOllamaインストール手順を返す */
export function getInstallInstructions(): string {
  switch (process.platform) {
    case 'darwin':
      return 'brew install ollama';
    case 'linux':
      return 'curl -fsSL https://ollama.com/install.sh | sh';
    case 'win32':
      return 'https://ollama.com/download から Windows版をダウンロードしてください';
    default:
      return 'https://ollama.com からインストーラーをダウンロードしてください';
  }
}
