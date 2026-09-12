# ChatGPT Graphite Themes

[English](README.md) | [日本語](README.ja.md)

ChatGPT向けの非公式 Stylus / UserCSS テーマです。

![ChatGPT Soft Graphite preview](previews/chatgpt-soft-graphite-preview.webp)

## Soft Graphite のインストール

現在の安定版UserCSSはGitHubから直接インストールできます。

- [ChatGPT Soft Graphite をインストール](https://raw.githubusercontent.com/signal-forge-lab/chatgpt-graphite-theme/main/chatgpt-soft-graphite.user.css)
- [UserStyles.world mirror](https://userstyles.world/style/29175/chatgpt-soft-graphite)

ルートの `chatgpt-soft-graphite.user.css` が更新元です。Stylus は埋め込まれた `@updateURL` を参照するため、リリース時はルートファイルを更新し、`@version` も上げます。

## 安定版

`main` は現在の安定版 **ChatGPT Soft Graphite v1.0.27** を保持します。

- 安定版CSS: `releases/v1.0.27/chatgpt-soft-graphite.user.css`
- インストール用CSS: `chatgpt-soft-graphite.user.css`
- tag: `v1.0.27`
- preview: `previews/chatgpt-soft-graphite-preview.webp`
- UserStyles.world向け資料: `docs/USERSTYLES_WORLD_NOTE.md`

## ブランチ方針

現在、このforkで公開している開発線は `main` のみです。

- `main`: 表示確認済みの公開安定版
- 公開feature branch: 公開して問題のない変更をmerge前にレビューする必要がある場合だけ作成し、mergeまたは廃止後は削除
- tag: `v1.0.27` のような変更しない公開版識別子

過去版を保存する目的でfeature branchを残さず、commitとrelease tagを利用します。

## Public repository 境界

資格情報、`.env`、秘密鍵、PC固有パス、ローカルruntime状態、一時生成物はコミットしません。開発環境固有データはリポジトリ外で管理します。
