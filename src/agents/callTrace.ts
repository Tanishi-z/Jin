/**
 * LLM呼び出しのトレースバッファ。
 *
 * callAgent（runner.ts）が1回のLLM呼び出しごとに recordCall() で記録し、
 * interactionLog.ts の各 logXxx() が emit 直前に drainCalls() で回収して
 * InteractionEvent に添付する。
 *
 * LLM呼び出しは逐次実行（例外は角の自己一貫性3視点のみで、これらは
 * 同一イベントに束ねられる）ため、モジュールレベルのバッファで混線しない。
 */

/** 1回のLLM呼び出しの完全な記録 */
export interface LlmCallRecord {
  /** 使用したモデル名 */
  model: string;
  /** 推論温度 */
  temperature: number;
  /** プロジェクトコンテキスト込みのシステムプロンプト全文 */
  systemPrompt: string;
  /** Few-Shot 等適用後のユーザープロンプト全文 */
  userPrompt: string;
  /** LLMの生の応答全文（失敗時は undefined） */
  responseText?: string;
  /** 所要時間（ミリ秒） */
  durationMs: number;
  /** 呼び出し開始時刻（ISO 8601） */
  startedAt: string;
  /** 呼び出しが成功したか */
  ok: boolean;
  /** 補足ラベル（角の自己一貫性の「視点1」等） */
  label?: string;
}

let buffer: LlmCallRecord[] = [];

/** 呼び出し記録をバッファに追加する */
export function recordCall(rec: LlmCallRecord): void {
  buffer.push(rec);
}

/** バッファの全記録を取得して空にする */
export function drainCalls(): LlmCallRecord[] {
  const calls = buffer;
  buffer = [];
  return calls;
}
