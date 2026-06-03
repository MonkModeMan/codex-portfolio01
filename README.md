# PMO Meeting Hub

PM/PMO業務における会議後の情報整理を効率化するための、議事録・課題管理Webアプリです。

会議ごとに議事録、決定事項、ToDo、課題を一元管理し、担当者・期限・ステータスを可視化します。Markdown形式での議事録出力とCSVエクスポートにも対応しています。

## アプリ画面

![PMO Meeting Hub SQLite版](screenshot/PMO%20Meeting%20Hub%20SQLite.png)

## 開発コンセプト

このリポジトリは、ポートフォリオとして「UIプロトタイプからDB永続化版へ発展させる流れ」が分かるように構成しています。

最初にLocalStorage版で画面設計と操作感を検証し、その後SQLite + API版へ移行して、CRUD実装とデータベース永続化を追加しました。

## ディレクトリ構成

```text
portfolio01/
  prototype-localstorage/
    LocalStorageで保存するUIプロトタイプ

  sqlite-app/
    SQLite + APIで保存する進化版

  screenshot/
    README掲載用のアプリ画面

  SPEC.md
    アプリ仕様メモ
```

## 主な機能

- 会議一覧の作成・編集・削除
- 議事録の登録・更新
- 決定事項、ToDo、課題の登録
- 担当者、期限、ステータス管理
- 会議ごとのサマリー表示
- Markdown形式での議事録出力
- CSV形式でのタスク・課題エクスポート
- SQLite版ではAPI経由でDBに永続化

## 技術構成

### UIプロトタイプ

```text
Frontend: HTML / CSS / JavaScript
Storage: LocalStorage
```

### SQLite版

```text
Frontend: HTML / CSS / JavaScript
Backend: Node.js HTTP Server
Database: SQLite
```

SQLite版では、Node.jsの組み込みSQLite機能を使い、外部npmパッケージなしで軽量に動作する構成にしています。

## 起動方法

### 1. SQLite版

実務アプリに近いDB保存版です。通常はこちらを確認してください。

```text
sqlite-app/start-sqlite-app.bat
```

起動後、以下のURLを開きます。

```text
http://127.0.0.1:4174/index.html
```

DBファイルは実行時に以下へ作成されます。

```text
sqlite-app/data/pmo-meeting-hub.sqlite
```

### 2. LocalStorage版

初期のUIプロトタイプです。

```text
prototype-localstorage/start-app.bat
```

起動後、以下のURLを開きます。

```text
http://127.0.0.1:4173/index.html
```

## API概要

SQLite版では以下のAPIで会議・項目データを操作します。

```text
GET    /api/meetings
POST   /api/meetings
PUT    /api/meetings/:id
DELETE /api/meetings/:id
POST   /api/meetings/:id/items
PUT    /api/items/:id
DELETE /api/items/:id
```

## 確認済みの動作

- 会議情報の登録・表示
- 決定事項、ToDo、課題の登録・表示
- ステータス変更
- SQLiteへのデータ保存
- Markdown出力
- CSVエクスポート

## 実行時生成ファイル

以下はアプリ実行時や出力確認時に生成されるファイルです。

```text
sqlite-app/data/
sqlite-app/download/
```

公開時は、必要に応じてDBファイルや出力サンプルを含めるか判断します。通常は、DBファイルは実行時生成として扱います。

## 今後の拡張案

- 検索・絞り込み機能
- ステータス別ダッシュボード
- 期限超過の強調表示
- ユーザー認証
- Supabase / PostgreSQLへの移行
- Next.js化

## ポートフォリオでの説明例

PM/PMO業務における会議後の情報整理を効率化するための議事録・課題管理アプリです。議事録、決定事項、ToDo、課題を一元管理し、担当者・期限・ステータスを可視化することで、プロジェクト進行の透明性を高めることを目的としています。

開発では、まずLocalStorageでUIプロトタイプを作成し、その後SQLite + API構成へ移行しました。これにより、画面設計だけでなく、CRUD、DB設計、API実装、データ永続化までを一連の流れとして実装しています。
