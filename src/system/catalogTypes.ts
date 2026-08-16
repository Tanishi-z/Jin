/**
 * ollama.com のモデル情報スクレイプ結果を表す型。
 * ollamaScrape.ts（実行時フェッチ）と scripts/updateModelCatalog.ts（CI生成）の
 * 両方から参照される共通スキーマ。循環参照を避けるため型のみを持つファイルとして独立させている。
 */
export interface ScrapedModel {
  name: string;
  description: string;
  /** パラメータサイズ（B単位の数値、昇順。例 [0.8, 2, 4, 9, 27]） */
  sizesB: number[];
  /** サイズタグの原文（数値と同順。例 ['0.8b', '2b', ...]） */
  sizeTags: string[];
  capabilities: string[];
  pulls: string;
  /** ollama.com のクラウド提供タグ（bg-cyan-50 の 'cloud' span）。ローカル実行不可を意味しない点に注意 */
  cloud: boolean;
}
