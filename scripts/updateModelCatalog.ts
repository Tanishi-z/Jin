#!/usr/bin/env tsx
/**
 * ollama.com からモデル情報を取得し、src/system/modelCatalog.generated.ts を再生成する。
 * GitHub Actions の週次 cron（.github/workflows/model-catalog.yml）から実行される他、
 * 手動更新の `jin model update` とは独立した「内蔵フォールバックリストの更新」を担う。
 *
 * 使い方:
 *   npx tsx scripts/updateModelCatalog.ts            # ファイルを再生成
 *   npx tsx scripts/updateModelCatalog.ts --dry-run   # 標準出力に結果を表示するのみ
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { fetchSearch, isUsableLocally } from '../src/system/ollamaScrape.js';
import type { ScrapedModel } from '../src/system/catalogTypes.js';

const __dirname  = path.dirname(fileURLToPath(import.meta.url));
const OUT_FILE   = path.join(__dirname, '../src/system/modelCatalog.generated.ts');

// featured だけではコード特化・軽量帯が痩せるため、検索クエリで補完する
const SUPPLEMENT_QUERIES = ['coder', 'reasoning', 'small'];

const MIN_TOTAL_MODELS = 15;
const MIN_LOCAL_MODELS = 5;

async function main(): Promise<void> {
  const dryRun = process.argv.includes('--dry-run');

  const results = await Promise.all([
    fetchSearch(),
    ...SUPPLEMENT_QUERIES.map((q) => fetchSearch(q)),
  ]);

  // ベース名でマージ（featured を優先。先勝ち）
  const merged = new Map<string, ScrapedModel>();
  for (const list of results) {
    for (const m of list) {
      if (!merged.has(m.name)) merged.set(m.name, m);
    }
  }

  const all = [...merged.values()].sort((a, b) => a.name.localeCompare(b.name));
  const localCount = all.filter(isUsableLocally).length;

  console.log(`取得件数: ${all.length} 件（うちローカル実行可: ${localCount} 件）`);

  if (all.length < MIN_TOTAL_MODELS || localCount < MIN_LOCAL_MODELS) {
    console.error(
      `健全性チェックに失敗しました（総数 >= ${MIN_TOTAL_MODELS} かつ ローカル実行可 >= ${MIN_LOCAL_MODELS} が必要）。\n` +
      'ollama.com のHTML構造が変わった可能性があります。src/system/ollamaScrape.ts のセレクタを確認してください。',
    );
    process.exit(1);
  }

  const body = renderFile(all);

  if (dryRun) {
    console.log('--- --dry-run: ファイルには書き込みません ---');
    console.log(body);
    return;
  }

  fs.writeFileSync(OUT_FILE, body, 'utf-8');
  console.log(`書き込み完了: ${OUT_FILE}`);
}

function renderFile(models: ScrapedModel[]): string {
  const lines: string[] = [];
  lines.push('/**');
  lines.push(' * このファイルは scripts/updateModelCatalog.ts が生成します。手で編集しないでください。');
  lines.push(' * GitHub Actions の週次 cron（.github/workflows/model-catalog.yml）が ollama.com の');
  lines.push(' * featured + 検索結果から再生成し、差分があればPRを自動作成します。');
  lines.push(' *');
  lines.push(` * 生成日時: ${new Date().toISOString()}`);
  lines.push(' *');
  lines.push(' * 日本語の説明・強み分類の上書きは src/system/modelMeta.ts に書いてください。');
  lines.push(' */');
  lines.push("import type { ScrapedModel } from './catalogTypes.js';");
  lines.push('');
  lines.push('export const MODEL_CATALOG: ScrapedModel[] = [');
  for (const m of models) {
    lines.push('  {');
    lines.push(`    name: ${JSON.stringify(m.name)},`);
    lines.push(`    description: ${JSON.stringify(m.description)},`);
    lines.push(`    sizesB: ${JSON.stringify(m.sizesB)},`);
    lines.push(`    sizeTags: ${JSON.stringify(m.sizeTags)},`);
    lines.push(`    capabilities: ${JSON.stringify(m.capabilities)},`);
    lines.push(`    pulls: ${JSON.stringify(m.pulls)},`);
    lines.push(`    cloud: ${m.cloud},`);
    lines.push('  },');
  }
  lines.push('];');
  lines.push('');
  return lines.join('\n');
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
