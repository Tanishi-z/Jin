import type { Mode } from '../types/index.js';

/** デモモードのグローバル状態 */
let _demo = false;
let _mode: Mode = 'global';

export function setDemoMode(enabled: boolean): void {
  _demo = enabled;
}

export function isDemoMode(): boolean {
  return _demo;
}

/** デモモード中の表示モードを設定する */
export function setDemoLocaleMode(mode: Mode): void {
  _mode = mode;
}

/** デモモード中の表示モードを返す */
export function getDemoLocaleMode(): Mode {
  return _mode;
}
