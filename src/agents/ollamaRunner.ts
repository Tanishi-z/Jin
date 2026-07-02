/**
 * Ollama API を呼び出してテキストを返す。
 * system/ollama.ts のセットアップ機能とは別に、テキスト生成専用の関数。
 */
export interface OllamaOptions {
  /** 推論温度（省略時 0.3） */
  temperature?: number;
  /** タイムアウト（省略時 120秒） */
  timeoutMs?: number;
}

export async function callOllama(
  systemPrompt: string,
  userPrompt: string,
  model: string,
  opts: OllamaOptions = {},
): Promise<string> {
  const { temperature = 0.3, timeoutMs = 120_000 } = opts;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch('http://localhost:11434/api/chat', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user',   content: userPrompt   },
        ],
        stream: false,
        options: { temperature },
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      throw new Error(`Ollama API エラー ${res.status}: ${res.statusText}`);
    }

    const data = await res.json() as {
      message?: { content: string };
    };

    const content = data.message?.content;
    if (!content) throw new Error('Ollama からの応答が空でした');

    return content.trim();
  } finally {
    clearTimeout(timer);
  }
}
