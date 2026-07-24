# ChatGPT original-style integrated extension

`tools/chatgpt-original-style-gap-probe.js` now provides the automatic
discovery and interaction layer used by Integrated Probe v1.0.0. The legacy
filename is retained to preserve project history.

## Assessment of the supplied report

- 51 captures were present.
- The report contained 10 baseline label types, with repeated scans.
- No capture had hover, focus, active, open, or selected interaction state.
- The composer capture stopped at a transparent `form`.
- The code-block capture stopped at a transparent `pre`.
- Menus, listboxes, dialogs, tooltips, menu items, model options, Work rows,
  and their interaction states were absent.

## Usage

1. Disable Soft Graphite and other UserCSS, then reload ChatGPT.
2. Prefer the generated single-file integrated probe.
3. For source-level testing, run `chatgpt-original-style-probe.js` v0.1.1,
   then run `chatgpt-original-style-gap-probe.js`.
4. The extension clears the base capture list and starts automatic visible and
   stateful capture.
5. Open the model selector, ordinary menus, settings dialogs, and any tooltip
   that should be represented in the theme.
6. Hover and operate the relevant controls normally. The extension captures
   recognized hover, focus, press, click, keyboard, open, and selected states.
7. Focus the composer editor once, preferably by keyboard.
8. Select **Download JSON**.

The panel shows known-component coverage and the number of additional semantic
signatures. Unresolved known categories may simply be unavailable on the
current route and do not block downloading the report.

## Shortcuts

```text
Alt+Shift+K  Scan currently visible UI
Alt+Shift+G  Capture the currently hovered recognized target
Alt+Shift+U  Download the integrated JSON
```

## Privacy

The extension delegates element capture to the base probe. It therefore keeps
the same privacy behavior: no conversation text, document title, full route
identifier, `aria-label`, or `title` value is exported.
