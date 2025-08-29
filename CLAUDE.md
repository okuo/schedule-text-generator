# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## プロジェクト概要

このプロジェクトはVanilla JavaScriptベースのスケジュールテキスト生成ツールです。外部フレームワークに依存せず、純粋なHTML、CSS、JavaScriptで実装されています。

## コマンド

### 開発環境
- **ローカルサーバー起動**: `python -m http.server 8000` または `npx serve .`
- **ファイル監視**: Live Server拡張機能を使用するかブラウザで直接HTMLファイルを開く

### テスト
- **単体テスト**: テストフレームワークが設定されている場合、通常のJavaScriptテスト実行
- **ブラウザテスト**: 開発者ツールのコンソールでテスト

## アーキテクチャ

### ディレクトリ構造
典型的な構造:
```
/
├── index.html          # メインエントリーポイント
├── css/               # スタイルシート
│   └── style.css
├── js/                # JavaScriptモジュール
│   ├── main.js        # メインロジック
│   ├── scheduler.js   # スケジュール処理
│   └── textGenerator.js # テキスト生成
└── assets/            # 静的リソース
```

### 設計パターン
- **モジュールパターン**: 機能ごとにJSファイルを分離
- **イベント駆動**: DOM操作とユーザーインタラクション
- **関数型アプローチ**: 純粋関数でのデータ変換

### 主要コンポーネント
- **Scheduler**: スケジュールデータの管理と操作
- **TextGenerator**: スケジュールからテキスト形式への変換
- **UI Controller**: DOM操作とユーザーイベント処理

### データフロー
1. ユーザー入力 → スケジュールデータ構造
2. スケジュールデータ → テキスト生成処理
3. 生成されたテキスト → UI表示/エクスポート

## 開発時の注意点

- ES6+モジュール構文を使用する場合は `type="module"` を指定
- ブラウザ互換性を考慮したJavaScript記述
- CORSエラー対策のためローカルサーバーを使用
- デバッグにはブラウザの開発者ツールを活用