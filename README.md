# noteサムネイルメーカー

note記事用のサムネイルを、ブラウザ上で作るための静的HTMLツールです。

固定背景画像を選び、記事タイトルを入力すると、Canvas上で背景と文字を合成します。完成したサムネイルはPNGとしてダウンロードできます。

## できること

- Claude / Codex / 雑談 の3カテゴリ切り替え
- カテゴリごとの背景画像切り替え
- タイトル入力の即時プレビュー
- 長いタイトルの自動2行改行
- 2行でも長い場合の自動フォントサイズ調整
- PNGダウンロード

## ファイル構成

```text
note-thumbnail-maker/
  index.html
  style.css
  script.js
  assets/
    claude.png
    codex.png
    zatsudan.png
```

この構成のままGitHub Pagesで公開できます。ビルドやインストールは不要です。

## ローカルで使う方法

一番簡単な方法は、`index.html` をブラウザで開くことです。

画像読み込みがうまくいかない場合は、ローカルサーバーで開いてください。

```bash
python3 -m http.server 8000
```

ブラウザで以下を開きます。

```text
http://localhost:8000/
```

## 背景画像の置き場所

背景画像は `assets/` フォルダに置きます。

```text
assets/claude.png
assets/codex.png
assets/zatsudan.png
```

3枚とも `1280 x 720` にそろえると、文字位置が安定します。

## 文字位置や色を変える場所

[script.js](script.js) の `templates` を編集します。

例:

```js
claude: {
  background: "assets/claude.png",
  textColor: "#f28c28",
  fontSize: 72,
  minFontSize: 44,
  bandTop: 114,
  bandHeight: 386,
  maxWidth: 1040
}
```

よく変更する項目です。

- `background`: 背景画像のパス
- `textColor`: 文字色
- `fontSize`: 通常の文字サイズ
- `minFontSize`: 自動縮小時の最小文字サイズ
- `bandTop`: 文字エリアの上位置
- `bandHeight`: 文字エリアの高さ
- `maxWidth`: 1行あたりの最大幅

## カテゴリを増やす方法

1. `assets/` に新しい背景画像を追加します。
2. [script.js](script.js) の `templates` にカテゴリ設定を追加します。
3. [index.html](index.html) のカテゴリ選択欄にラジオボタンを追加します。

背景画像のパスは、GitHub Pagesで崩れないように `assets/example.png` のような相対パスで書きます。

## GitHub Pagesで公開する方法

1. GitHubで新しいリポジトリを作成します。
2. このフォルダの中身をリポジトリにアップロードします。
3. `index.html` がリポジトリのルート直下にあることを確認します。
4. GitHubのリポジトリ画面で `Settings` を開きます。
5. 左メニューの `Pages` を開きます。
6. `Build and deployment` の `Source` で `Deploy from a branch` を選びます。
7. `Branch` で `main` と `/(root)` を選び、`Save` を押します。
8. 数十秒から数分待つと、GitHub PagesのURLが表示されます。

公開URLの例:

```text
https://ユーザー名.github.io/リポジトリ名/
```

## GitHub Pages向けの注意点

- CSSは `style.css` のように相対パスで読み込みます。
- JavaScriptは `script.js` のように相対パスで読み込みます。
- 画像は `assets/claude.png` のように相対パスで読み込みます。
- `/assets/claude.png` のように先頭に `/` を付けないでください。
- ビルドコマンドは不要です。
- `node_modules` やフレームワークは不要です。
- 公開元フォルダはリポジトリのルート `/` を選びます。

参考: [GitHub Pages の公開元設定](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site)

## PNG保存のファイル名

ダウンロードされるPNGのファイル名は自動生成されます。

```text
note-thumbnail-claude-2026-06-19.png
note-thumbnail-codex-2026-06-19.png
note-thumbnail-zatsudan-2026-06-19.png
```

日付部分は実行日の年月日になります。
