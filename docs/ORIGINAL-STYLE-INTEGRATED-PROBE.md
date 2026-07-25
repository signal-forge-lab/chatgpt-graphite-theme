# ChatGPT original-style integrated probe

The downloadable integrated probe is a single DevTools Snippet. Its maintained
sources are:

- `tools/chatgpt-original-style-probe.js`: style and matched-rule capture engine
- `tools/chatgpt-original-style-gap-probe.js`: integrated automatic discovery
  and interaction extension
- `tools/build-original-style-integrated-probe.mjs`: single-file builder

## What it automates

- Captures known visible ChatGPT surfaces immediately after startup.
- Periodically discovers newly visible semantic components.
- Captures menus, model lists, dialogs, tooltips, and route-specific UI when
  they appear.
- Captures hover, focus, focus-visible, pointer-down, click, and keyboard
  interaction states.
- Captures `open`, `selected`, `checked`, `pressed`, `highlighted`, and active
  attribute changes.
- Captures visible original-site components even when Soft Graphite does not
  currently define a matching override.
- Keeps the base probe's computed styles, matched CSS rules, CSS variables,
  pseudo-elements, inline styles, and paint-owning ancestor chain.

## Dark capture procedure

1. Disable Soft Graphite and every other UserCSS applied to `chatgpt.com`.
2. Switch ChatGPT to Dark appearance and reload the page.
3. Run the generated or downloadable
   `chatgpt-original-style-integrated-probe-v1.0.1.js` as one DevTools Snippet.
4. Open each model selector, ordinary menu, settings surface, dialog,
   tooltip, Work surface, and code-block control that should be represented.
5. Use the controls normally. Hover, focus, press, open, and selection states
   are captured automatically.
6. Select **Download JSON**.

The **Scan now** button is optional. Mutation monitoring, interaction hooks,
post-action scans, and a 1.2-second visible-page rescan are enabled by default.

## Output

The output filename begins with:

```text
chatgpt-original-style-integrated-dark-
```

The report includes known-component coverage and additional semantic captures.
There is no capture-count cutoff. Exact duplicate semantic signatures are
deduplicated, while every newly observed component/state signature remains in
the report.

## Privacy

The probe does not export conversation text, the page title, full route IDs,
`aria-label`, or `title` values.

## Build

```text
node tools/build-original-style-integrated-probe.mjs <output.js>
```

The builder concatenates the capture engine and automatic extension without
fetching external resources.
