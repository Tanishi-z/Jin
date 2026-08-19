# Changelog

## [0.3.0](https://github.com/Tanishi-z/Jin/compare/jin-v0.2.0...jin-v0.3.0) (2026-08-19)


### 機能追加

* 「手順を実装する」フローを実LLM接続に（モック廃止） ([2ac5787](https://github.com/Tanishi-z/Jin/commit/2ac57872096daec89ccf09b7293e1329eb7668de))
* Jin CLI 初回コミット ([3f49ef9](https://github.com/Tanishi-z/Jin/commit/3f49ef9d78ee07fc9307ca4a83d19b0eefcb6c17))
* LLMモデル情報の取得・更新機構を刷新 ([691820e](https://github.com/Tanishi-z/Jin/commit/691820e192c6295718de29223c846b12b4a72b0d))
* LLM呼び出しトレースを記録し入力全文・モデル・所要時間をログとTUIに反映 ([cfe8ec5](https://github.com/Tanishi-z/Jin/commit/cfe8ec5eb1fbdd3103297838dab161b152080a51))
* npmパッケージ公開設定を追加 ([126c796](https://github.com/Tanishi-z/Jin/commit/126c796aa35324d90d165e75720285cb74671975))
* ダッシュボードに会話ビューと布陣盤（将棋盤風フロー可視化）を追加 ([b48bd9b](https://github.com/Tanishi-z/Jin/commit/b48bd9bf9ab662a4cfe351fe634ebfdc37dc2ae1))
* ダッシュボードの既定ポートを3050に変更（衝突回避） ([2021b8e](https://github.com/Tanishi-z/Jin/commit/2021b8ea45c5d5018e2c789156ac528436087460))
* ダッシュボードを14インチMacBook基準の1ページレイアウトに再構成 ([bd96433](https://github.com/Tanishi-z/Jin/commit/bd9643350da0f2306698332a4060ce10bc900f68))
* ダッシュボードを画面の90%サイズでフィット表示（上下左右5%余白） ([c30b425](https://github.com/Tanishi-z/Jin/commit/c30b4259bdbe4f7704237b6da2bec76c14f7d6b5))
* モデルカタログの自動更新機構を追加し、リリースワークフローを設定 ([49a0096](https://github.com/Tanishi-z/Jin/commit/49a009669fe22920a85edc227b302c56441a8f32))
* 初回セットアップでモデルを強み別チェックリストから複数選択可能に ([dfd9604](https://github.com/Tanishi-z/Jin/commit/dfd96049ddfa0d985c7a1af1441b21c18b18ce0c))
* 成り駒の実装フェーズ用 .agent.md テンプレートを追加 ([bcb10fa](https://github.com/Tanishi-z/Jin/commit/bcb10fae50a38a44fe7eb82e3c131cbdb85bc3ef))
* 駒の報告欄ではみ出す説明文を右から左へ流れるマーキー表示に ([4e7c513](https://github.com/Tanishi-z/Jin/commit/4e7c51333ec4d03e1b8126bf8a85c9ac877dc9c3))


### 不具合修正

* GitHub Pages deployment ([bd2e06c](https://github.com/Tanishi-z/Jin/commit/bd2e06c2dfa479a459dc3bdd4bf46abd4d100ad9))
* LICENSEの著作権表記をTanishi-zに更新 ([4c6fc7f](https://github.com/Tanishi-z/Jin/commit/4c6fc7f47dfab6d5a53416106fd11732dd2a72fb))
* READMEと紹介サイトの残存していた旧アカウント表記を修正 ([dfcd4b9](https://github.com/Tanishi-z/Jin/commit/dfcd4b9b3e10bef282b9c12ff45e46d6bcb00943))
* 要件定義対話の深掘りしすぎを是正 ([ff02ac7](https://github.com/Tanishi-z/Jin/commit/ff02ac7152b7d8022d97d05b7ce7355b809987b8))
