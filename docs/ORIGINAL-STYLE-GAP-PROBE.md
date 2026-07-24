# ChatGPT original-style gap probe

`tools/chatgpt-original-style-gap-probe.js` complements the base original-style
probe. It is tailored to the missing coverage found in the supplied Light
report.

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
2. Run `chatgpt-original-style-probe.js` v0.1.1.
3. Run `chatgpt-original-style-gap-probe.js`.
4. The gap probe clears the base probe capture list and immediately scans only
   the missing visible paint owners.
5. Open the model selector, ordinary menus, settings dialogs, and any tooltip
   that should be represented in the theme.
6. Hover each relevant item for roughly 0.3 seconds. The probe automatically
   captures recognized hover targets.
7. Focus the composer editor once, preferably by keyboard.
8. Select **Download gap JSON**.

The panel reports which expected categories remain missing. A missing category
may simply be unavailable on the current route; upload the JSON before doing
additional captures so the next request can be narrowed further.

## Shortcuts

```text
Alt+Shift+K  Scan visible gaps
Alt+Shift+G  Capture the currently hovered recognized target
Alt+Shift+U  Download the gap JSON
```

## Privacy

The gap probe delegates element capture to the base probe. It therefore keeps
the same privacy behavior: no conversation text, document title, full route
identifier, `aria-label`, or `title` value is exported.
