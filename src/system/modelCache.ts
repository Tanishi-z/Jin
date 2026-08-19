import fs from 'fs';
import path from 'path';
import os from 'os';
import type { ScrapedModel } from './catalogTypes.js';

const CONFIG_DIR = path.join(os.homedir(), '.jin');
const CACHE_FILE = path.join(CONFIG_DIR, 'model-cache.json');

/**
 * キャッシュのスキーマバージョン。互換性を壊す変更をした場合はこの数値を上げる。
 * v2: source の意味を変更（'featured' 単独取得を廃止し 'full'/'partial' に統一）したため、
 * 旧バージョンのキャッシュは破棄させて再取得させる。
 */
const CACHE_VERSION = 2;

/** キャッシュの有効期限（24時間） */
export const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

/**
 * 'full': featured + 補完クエリ（coder/reasoning/small）が全て成功した完全な取得結果。
 * 'partial': 一部クエリが失敗した不完全な取得結果（既存の 'full' キャッシュを上書きしない）。
 */
export type ModelCacheSource = 'full' | 'partial';

export interface ModelCache {
  version:   number;
  fetchedAt: string;
  source:    ModelCacheSource;
  models:    ScrapedModel[];
}

/** モデルキャッシュを読み込む。ファイルが無い・壊れている・バージョン不一致の場合は null */
export function loadModelCache(): ModelCache | null {
  try {
    const raw = fs.readFileSync(CACHE_FILE, 'utf-8');
    const parsed = JSON.parse(raw) as ModelCache;
    if (parsed.version !== CACHE_VERSION) return null;
    return parsed;
  } catch {
    return null;
  }
}

/** モデルキャッシュを保存する */
export function saveModelCache(models: ScrapedModel[], source: ModelCacheSource): void {
  const cache: ModelCache = {
    version:   CACHE_VERSION,
    fetchedAt: new Date().toISOString(),
    source,
    models,
  };
  fs.mkdirSync(CONFIG_DIR, { recursive: true });
  fs.writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 2), 'utf-8');
}

/** モデルキャッシュを削除する */
export function clearModelCache(): void {
  try {
    fs.unlinkSync(CACHE_FILE);
  } catch {
    // ファイルが存在しない場合は無視
  }
}

/** キャッシュが TTL 内かどうかを判定する */
export function isFresh(cache: ModelCache): boolean {
  const age = Date.now() - Date.parse(cache.fetchedAt);
  return Number.isFinite(age) && age < CACHE_TTL_MS;
}
