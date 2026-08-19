import type { ScrapedModel } from './catalogTypes.js';
import { fetchSearch } from './ollamaScrape.js';

/**
 * featured だけではコード特化・軽量帯が痩せるため、検索クエリで補完する。
 * 実行時の自動取得（ollamaRegistry.ts）・手動更新（`jin model update`）・
 * CI生成（scripts/updateModelCatalog.ts）の3箇所で同じクエリ集合を共有する。
 */
export const SUPPLEMENT_QUERIES = ['coder', 'reasoning', 'small'];

export interface MergedCatalog {
  models: ScrapedModel[];
  /** featured + 補完クエリが全て成功したか。false の場合は一部クエリが欠けた不完全な結果 */
  complete: boolean;
}

/**
 * featured + 補完クエリ（coder/reasoning/small）を並列取得し、ベース名でマージする（featured優先・先勝ち）。
 * 全クエリが失敗した場合は throw する。
 */
export async function fetchMergedCatalog(): Promise<MergedCatalog> {
  const queries = [undefined, ...SUPPLEMENT_QUERIES];
  const results = await Promise.allSettled(queries.map((q) => fetchSearch(q)));

  const merged = new Map<string, ScrapedModel>();
  let anySucceeded = false;
  let allSucceeded = true;
  for (const r of results) {
    if (r.status !== 'fulfilled') {
      allSucceeded = false;
      continue;
    }
    anySucceeded = true;
    for (const m of r.value) {
      if (!merged.has(m.name)) merged.set(m.name, m);
    }
  }

  if (!anySucceeded) {
    throw new Error('ollama.com への接続にすべて失敗しました');
  }

  return { models: [...merged.values()], complete: allSucceeded };
}
