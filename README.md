# ChatGPT Graphite Themes

Unofficial Stylus/UserCSS themes for ChatGPT.

## Stable release

The `main` branch preserves **ChatGPT Soft Graphite v1.0.15** as the current
stable release.

- Stable CSS: `releases/v1.0.15/chatgpt-soft-graphite.user.css`
- Stable tag: `v1.0.15`

## Next development line

The `feature/dual-graphite-palettes` branch develops one UserCSS with two
palette modes:

- ChatGPT Light setting → **Soft Graphite**
- ChatGPT Dark setting → **Graphite**

The feature branch is intentionally separate from the stable release until its
visual regression checks are complete.

## Branch policy

- `main`: published and visually confirmed stable releases only
- `feature/dual-graphite-palettes`: the single integration branch for the
  dual-style architecture
- tags: immutable published versions such as `v1.0.15`

Do not create a new branch for every patch version. Use commits and release
tags to separate versions.
