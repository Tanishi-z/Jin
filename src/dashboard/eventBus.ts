import { EventEmitter } from 'events';
import type { InteractionEvent } from '../activity/interactionWriter.js';

const emitter = new EventEmitter();
emitter.setMaxListeners(100);

const EVENT_NAME = 'interaction';

/** ダッシュボードクライアントへのブロードキャスト */
export function broadcast(event: InteractionEvent): void {
  emitter.emit(EVENT_NAME, event);
}

/**
 * イベントを購読する。
 * 戻り値の関数を呼ぶと購読を解除する。
 */
export function subscribe(callback: (event: InteractionEvent) => void): () => void {
  emitter.on(EVENT_NAME, callback);
  return () => emitter.off(EVENT_NAME, callback);
}
