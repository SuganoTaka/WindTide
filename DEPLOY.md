# Render.com での公開手順

このフォルダは、そのまま GitHub にアップロードして Render で公開できる最小構成です。

## 1. GitHub にアップロード

1. GitHub で新しいリポジトリを作成（Public / Private どちらでも可、README 等は追加しない）
2. 「Add file」→「Upload files」
3. **このフォルダの中身をすべて選択して**ドラッグ（フォルダごとではなく、中身を入れ子にしない）
   - ファイル数は 100 未満なので、Web からのアップロードで問題ありません
4. Commit

## 2. Render で公開

1. https://render.com にサインイン（GitHub 連携）
2. **New +** → **Web Service** → 作成したリポジトリを選択
3. 設定は次のとおり（`render.yaml` があるので自動で入る場合もあります）

| 項目 | 値 |
| --- | --- |
| Language / Runtime | Node |
| Build Command | `npm ci && npm run build` |
| Start Command | `npm start` |
| Health Check Path | `/` |
| Plan | Free |

4. 環境変数は `NODE_VERSION=22` のみ（`NODE_ENV` は**設定しない**。ビルド時に devDependencies が入らなくなります）
5. **Create Web Service** → 3〜5分でビルド完了、`https://<name>.onrender.com` が公開URLになります

## 3. 公開後の注意

- 無料プランは 15 分アクセスが無いとスリープし、次のアクセスで 30〜60 秒かかります
- 位置情報（現在地）は HTTPS 必須ですが、Render は自動で HTTPS になります
- Google マップを使う場合は、Render の Environment に `GOOGLE_MAPS_API_KEY` を追加して再デプロイ
- 独自ドメインは Settings → Custom Domains

## ファイル構成

```
app/            画面とAPI（天気・経路）
components/     UI部品
lib/            計算ロジック
public/data/    港データ・魚データ（JSON）
data/           魚データのひな形
scripts/        港データ再生成スクリプト（デプロイには不要）
```

港データ（3,925件）と魚データ（51種）は `public/data/` に同梱済みなので、
デプロイ時に追加のダウンロードは発生しません。

## トラブルシューティング

### ビルドが `npm error`（使い方の一覧）で落ちる
ビルドが **package.json のない場所**で走っています。原因はほぼ次のどちらかです。

1. **フォルダが入れ子になっている**（リポジトリ直下に `FishingPort_deploy/` がある）
   - GitHub のリポジトリ直下に `app/`、`package.json`、`render.yaml` が**直接**並んでいる必要があります
   - 直っていない場合は、リポジトリ直下で「Add file → Upload files」を開き、
     **`FishingPort_deploy` フォルダの中身を選択して**アップロードし直してください（フォルダごと入れない）
   - フォルダを残したい場合は、Render のサービス設定で **Root Directory** に `FishingPort_deploy` を指定します

2. **package-lock.json と package.json の不整合**
   - `render.yaml` のビルドコマンドを `npm install --no-audit --no-fund && npm run build` にしてあるので、この場合は解消されます

### 起動はするがページが表示されない
- Start Command が `npm start` になっているか確認（`npm run dev` は不可）
- Render のログで `Ready on` が出ているか確認
- 無料プランはスリープ復帰に 30〜60 秒かかります

### ビルドが `npm error Exit handler never called!` で落ちる
`package-lock.json` の `resolved`（取得先URL）が、その環境専用の社内 npm ミラーを指していると発生します。
Render からそのホストに到達できないため、全パッケージの取得に失敗して npm が異常終了します。

- 対処: `resolved` が `https://registry.npmjs.org/...` になっている `package-lock.json` を使う
- 確認方法: `package-lock.json` 内を `"resolved": "https://registry.npmjs.org/` で検索し、
  それ以外のホスト（`http://…/repository/npm-proxy/` など）が無いこと
