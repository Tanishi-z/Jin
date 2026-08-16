import os from 'os';
import { execSync } from 'child_process';

export interface SystemSpecs {
  /** 総RAM（GB） */
  ramGB: number;
  /** Apple Silicon かどうか */
  isAppleSilicon: boolean;
  /** NVIDIA GPU の有無 */
  hasNvidiaGpu: boolean;
  /** AMD GPU の有無 */
  hasAmdGpu: boolean;
}

/** システムスペックを検出する */
export function detectSpecs(): SystemSpecs {
  const ramGB = Math.floor(os.totalmem() / (1024 ** 3));

  const isAppleSilicon =
    process.platform === 'darwin' &&
    (os.cpus()[0]?.model.includes('Apple') ?? false);

  const hasNvidiaGpu = checkCommand('nvidia-smi');
  const hasAmdGpu    = checkCommand('rocm-smi');

  return { ramGB, isAppleSilicon, hasNvidiaGpu, hasAmdGpu };
}

function checkCommand(cmd: string): boolean {
  try {
    execSync(`which ${cmd}`, { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

/** モデルの強み分類（セットアップ画面のグループ表示に使う） */
export type ModelStrength = 'coding' | 'reasoning' | 'light' | 'balanced' | 'large';

/** スペックに応じて推奨モデルのリストを返す */
export interface ModelRecommendation {
  /** Ollama のモデル名（`ollama pull` に使う） */
  name: string;
  /** 表示名 */
  label: string;
  /** 必要な目安RAM（GB） */
  requiredRamGB: number;
  /** 説明 */
  description: string;
  /** 強み分類（省略時は 'balanced' 扱い） */
  strength?: ModelStrength;
  /** 能力タグ（'tools' | 'vision' | 'thinking' | 'audio' など） */
  capabilities?: string[];
  /** 人気度（'16.6M' など表示用の文字列） */
  pulls?: string;
}

/**
 * 静的推奨リストは modelCatalog.ts の builtinRecommendations() に統合された。
 * こちらは modelCatalog.generated.ts（CI週次生成）+ modelMeta.ts（手書き日本語説明）
 * から動的に組み立てられるため、二重管理を避けるためにこのファイルには置かない。
 */
