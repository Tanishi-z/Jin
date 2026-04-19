import fs from 'fs';
import path from 'path';
import os from 'os';
import type { JinConfig } from './types/index.js';

const CONFIG_DIR  = path.join(os.homedir(), '.jin');
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json');

/** 設定を読み込む。ファイルが存在しない場合は空オブジェクトを返す */
export function loadConfig(): JinConfig {
  try {
    const raw = fs.readFileSync(CONFIG_FILE, 'utf-8');
    return JSON.parse(raw) as JinConfig;
  } catch {
    return {};
  }
}

/** 設定を保存する（既存の設定とマージ） */
export function saveConfig(partial: Partial<JinConfig>): void {
  const current = loadConfig();
  const updated  = { ...current, ...partial };

  fs.mkdirSync(CONFIG_DIR, { recursive: true });
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(updated, null, 2), 'utf-8');
}

/** 設定をリセットする */
export function resetConfig(): void {
  try {
    fs.unlinkSync(CONFIG_FILE);
  } catch {
    // ファイルが存在しない場合は無視
  }
}
