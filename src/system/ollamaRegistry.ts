import type { SystemSpecs, ModelRecommendation } from './specs.js';
import { buildRecommendations, builtinRecommendations } from './modelCatalog.js';
import { fetchSearch } from './ollamaScrape.js';
import { loadModelCache, saveModelCache, isFresh } from './modelCache.js';
import { isDemoMode } from '../demo/state.js';

/** モデル情報の取得元。UI表示の文言切替に使う */
export type ModelSource = 'web' | 'cache' | 'stale-cache' | 'builtin';

/**
 * Ollama ライブラリから最新の注目モデルを取得し、スペックでフィルタして返す。
 * 取得順: 新鮮なキャッシュ → ウェブ取得（成功時キャッシュ更新） → 期限切れキャッシュ → 内蔵スナップショット。
 * デモモード・JIN_NO_NETWORK=1 時はネットワーク・キャッシュ書き込みを一切行わず内蔵スナップショットを返す。
 */
export async function fetchOllamaModels(
  specs: SystemSpecs,
): Promise<{ source: ModelSource; fetchedAt?: string; models: ModelRecommendation[] }> {
  if (isDemoMode() || process.env.JIN_NO_NETWORK === '1') {
    return { source: 'builtin', models: builtinRecommendations(specs) };
  }

  const cache = loadModelCache();
  if (cache && isFresh(cache)) {
    return { source: 'cache', fetchedAt: cache.fetchedAt, models: buildRecommendations(cache.models, specs) };
  }

  try {
    const scraped = await fetchSearch();
    saveModelCache(scraped, 'featured');
    const models = buildRecommendations(scraped, specs);
    if (models.length === 0) throw new Error('RAM要件を満たすモデルがありません');
    return { source: 'web', models };
  } catch {
    // ウェブ取得失敗時: 期限切れでもキャッシュがあればそれを使う
    if (cache) {
      const models = buildRecommendations(cache.models, specs);
      if (models.length > 0) {
        return { source: 'stale-cache', fetchedAt: cache.fetchedAt, models };
      }
    }
    // 最終フォールバック：内蔵スナップショット
    return { source: 'builtin', models: builtinRecommendations(specs) };
  }
}
