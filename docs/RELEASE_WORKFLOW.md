# Soft Graphite release workflow

The root-level `chatgpt-soft-graphite.user.css` is the canonical install and
update source for Stylus.

## Release steps

1. Update the CSS and increment its `@version` value.
2. Copy the final CSS to `chatgpt-soft-graphite.user.css`.
3. Archive the same release under `releases/vX.Y.Z/`.
4. Update `SHA256SUMS.txt`, `README.md`, and `CHANGELOG.md`.
5. Commit and push `main`, then create and push the matching immutable tag.
6. Verify that the GitHub Raw URL returns the new UserCSS metadata and version.

Canonical Raw URL:

```text
https://raw.githubusercontent.com/signal-forge-lab/chatgpt-graphite-theme/main/chatgpt-soft-graphite.user.css
```

## UserStyles.world

Use the canonical Raw URL as the original, import, or mirror source when the
editing interface supports it. Keep source and metadata mirroring enabled when
those options are available.

The GitHub Raw installation remains usable even when UserStyles.world is not
available.
