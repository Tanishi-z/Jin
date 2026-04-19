// ローカルLLM専用に移行済み。localLLMSetup に統合されました。
import type { Mode, NextScreen } from '../types/index.js';

/** @deprecated localLLMSetup を使用してください */
export async function agentSelect(_mode: Mode): Promise<NextScreen> {
  return { screen: 'localLLMSetup' };
}
