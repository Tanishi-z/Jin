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
import { isUsableLocally } from '../src/system/ollamaScrape.js';
import { fetchMergedCatalog } from '../src/system/catalogFetch.js';
import { MODEL_META } from '../src/system/modelMeta.js';
import type { ScrapedModel } from '../src/system/catalogTypes.js';

const __dirname  = path.dirname(fileURLToPath(import.meta.url));
const OUT_FILE   = path.join(__dirname, '../src/system/modelCatalog.generated.ts');

const MIN_TOTAL_MODELS = 15;
const MIN_LOCAL_MODELS = 5;

async function main(): Promise<void> {
  const dryRun = process.argv.includes('--dry-run');

  const { models: merged, complete } = await fetchMergedCatalog();
  if (!complete) {
    console.warn('警告: 一部の検索クエリが失敗しました（結果が不完全な可能性があります）');
  }

  const all = [...merged].sort((a, b) => a.name.localeCompare(b.name));
  const localCount = all.filter(isUsableLocally).length;

  console.log(`取得件数: ${all.length} 件（うちローカル実行可: ${localCount} 件）`);

  if (all.length < MIN_TOTAL_MODELS || localCount < MIN_LOCAL_MODELS) {
    console.error(
      `健全性チェックに失敗しました（総数 >= ${MIN_TOTAL_MODELS} かつ ローカル実行可 >= ${MIN_LOCAL_MODELS} が必要）。\n` +
      'ollama.com のHTML構造が変わった可能性があります。src/system/ollamaScrape.ts のセレクタを確認してください。',
    );
    process.exit(1);
  }

  reportUnknownModels(all);

  const body = renderFile(all);

  if (dryRun) {
    console.log('--- --dry-run: ファイルには書き込みません ---');
    console.log(body);
    return;
  }

  fs.writeFileSync(OUT_FILE, body, 'utf-8');
  console.log(`書き込み完了: ${OUT_FILE}`);
}

/**
 * MODEL_META（src/system/modelMeta.ts、手書き専用ファイル）に日本語説明が
 * 未登録のローカル実行可モデルを一覧し、標準出力と GITHUB_STEP_SUMMARY に書き出す。
 * 自動マージ運用（.github/workflows/model-catalog.yml）でPR本文が読まれなくなる分の代替。
 */
function reportUnknownModels(models: ScrapedModel[]): void {
  const unknown = models
    .filter(isUsableLocally)
    .filter((m) => !MODEL_META[m.name])
    .map((m) => m.name);

  if (unknown.length === 0) {
    console.log('MODEL_META未登録のモデルはありません。');
    return;
  }

  const lines = [
    `MODEL_META未登録のモデル（${unknown.length} 件）— 日本語説明の追記を検討してください:`,
    ...unknown.map((name) => `  - ${name}`),
  ];
  console.log(lines.join('\n'));

  const summaryFile = process.env.GITHUB_STEP_SUMMARY;
  if (summaryFile) {
    const summary = [
      '## MODEL_META 未登録モデル',
      '',
      `以下 ${unknown.length} 件は \`src/system/modelMeta.ts\` に日本語説明が未登録です（ヒューリスティックで代替表示されます）。`,
      '',
      ...unknown.map((name) => `- \`${name}\``),
      '',
    ].join('\n');
    fs.appendFileSync(summaryFile, summary + '\n', 'utf-8');
  }
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
