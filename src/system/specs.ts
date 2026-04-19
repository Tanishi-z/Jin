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
}

export function recommendModels(specs: SystemSpecs): ModelRecommendation[] {
  const all: ModelRecommendation[] = [
    {
      name: 'llama3.2:3b',
      label: 'Llama 3.2 3B',
      requiredRamGB: 4,
      description: '軽量・高速。RAM 4GB 以上で動作 / Lightweight and fast, runs on 4GB+ RAM',
    },
    {
      name: 'phi4-mini',
      label: 'Phi-4 Mini',
      requiredRamGB: 4,
      description: 'Microsoft製。小型ながら高精度 / Small but high quality by Microsoft',
    },
    {
      name: 'llama3.1:8b',
      label: 'Llama 3.1 8B',
      requiredRamGB: 8,
      description: 'バランス型。精度と速度のベストバランス / Best balance of quality and speed',
    },
    {
      name: 'qwen2.5:7b',
      label: 'Qwen 2.5 7B',
      requiredRamGB: 8,
      description: 'Alibaba製。日本語対応が良好 / Good Japanese support by Alibaba',
    },
    {
      name: 'gemma3:12b',
      label: 'Gemma 3 12B',
      requiredRamGB: 16,
      description: 'Google製。高精度 / High quality by Google',
    },
    {
      name: 'llama3.1:70b',
      label: 'Llama 3.1 70B',
      requiredRamGB: 40,
      description: '最高精度。大容量RAMが必要 / Highest quality, requires large RAM',
    },
  ];

  // RAMで動作可能なモデルに絞る
  // Apple SiliconはGPU統合のため1段階上のモデルまで推奨
  const effectiveRam = specs.isAppleSilicon ? specs.ramGB * 1.2 : specs.ramGB;

  return all.filter((m) => m.requiredRamGB <= effectiveRam);
}
