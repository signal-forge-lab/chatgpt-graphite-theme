# Git workflow

## Stable policy

`main` must always contain a publishable, visually confirmed UserCSS.

The current baseline is:

```text
ChatGPT Soft Graphite v1.0.15
tag: v1.0.15
```

## Dual-style work

All Soft Graphite / Graphite architecture work stays on:

```text
feature/dual-graphite-palettes
```

Recommended sequence:

1. Split the stable CSS into metadata, palettes, and shared core.
2. Keep the generated Soft Graphite result visually equivalent to v1.0.15.
3. Add the Graphite palette without changing shared geometry or selectors.
4. Test Home, Chat, Project, Work, menus, dialogs, GPT discovery, code blocks,
   scrolling, hover, and focus-visible in both ChatGPT appearance modes.
5. Merge only after the dual-style output is publishable.
6. Tag the merged release, for example `v1.1.0`.

## Release commands

```powershell
git switch main
git merge --no-ff feature/dual-graphite-palettes
git tag -a v1.1.0 -m "ChatGPT Graphite dual palette v1.1.0"
git push origin main --tags
```

## Hotfixes while dual-style work continues

For an urgent stable fix:

```powershell
git switch main
# apply and verify the fix
git commit -am "fix ..."
git tag -a v1.0.16 -m "ChatGPT Soft Graphite v1.0.16"
git switch feature/dual-graphite-palettes
git merge main
```

This keeps stable fixes from being lost while avoiding version-specific branch
sprawl.
