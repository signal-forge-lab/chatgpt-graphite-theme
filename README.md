# ChatGPT Graphite Themes

[English](README.md) | [日本語](README.ja.md)

Unofficial Stylus/UserCSS themes for ChatGPT.

![ChatGPT Soft Graphite preview](previews/chatgpt-soft-graphite-preview.webp)

## Install Soft Graphite

Install the current stable UserCSS directly from GitHub:

- [Install ChatGPT Soft Graphite](https://raw.githubusercontent.com/signal-forge-lab/chatgpt-graphite-theme/main/chatgpt-soft-graphite.user.css)
- [UserStyles.world mirror](https://userstyles.world/style/29175/chatgpt-soft-graphite)

The root-level `chatgpt-soft-graphite.user.css` is the canonical update source.
Stylus checks its embedded `@updateURL`, so each future release must update the
root file and increment `@version` before it is pushed.

## Stable release

The `main` branch preserves **ChatGPT Soft Graphite v1.0.27** as the current
stable release.

- Stable CSS: `releases/v1.0.27/chatgpt-soft-graphite.user.css`
- Canonical install CSS: `chatgpt-soft-graphite.user.css`
- Stable tag: `v1.0.27`
- Preview: `previews/chatgpt-soft-graphite-preview.webp`
- UserStyles.world note: `docs/USERSTYLES_WORLD_NOTE.md`

## Branch policy

At present, only `main` is published in this fork.

- `main`: published and visually confirmed stable releases only.
- Public feature branches: create only when the work is safe to disclose and needs review before merge; remove them after they are merged or abandoned.
- Tags: immutable published versions such as `v1.0.27`.

Do not keep stale feature branches merely as version storage. Use commits and release tags to separate published versions.

## Public repository boundary

Do not commit credentials, `.env` files, private keys, workstation-specific paths, local runtime state, or generated temporary output. Development-only data belongs outside the repository.
