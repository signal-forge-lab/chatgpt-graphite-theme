# ChatGPT original-style probe

Current probe version: `0.1.1`

`0.1.1` fixes the probe panel controls so button clicks reach their handlers
before page-level event propagation is stopped.

`tools/chatgpt-original-style-probe.js` captures the browser styles that are
actually applied to selected ChatGPT elements before Graphite overrides are
added.

It is intended to provide a reliable baseline for the Soft Graphite / Graphite
dual-palette work. It does not copy conversation text.

## What it captures

- Computed visual and layout properties
- Matching CSS rules and their source stylesheets
- Inline style declarations
- Active media/support conditions
- `::before` and `::after` computed styles and matching rules
- Computed CSS custom properties
- Ancestor background, opacity, filter, and blend-mode chain
- Element tag, classes, stable state attributes, and geometry
- Current ChatGPT Light/Dark appearance
- Stylesheets that could not be read because of browser security restrictions

The probe deliberately omits text content, the document title, full links,
`aria-label`, and `title` values to avoid collecting conversation data. Route
identifiers such as conversation, GPT, share, and project IDs are replaced by
placeholders.

## Recommended capture procedure

1. Disable ChatGPT Soft Graphite and all other UserCSS for `chatgpt.com`.
2. Reload ChatGPT.
3. Select ChatGPT **Light** appearance.
4. Open DevTools, select **Sources → Snippets**, create a snippet, paste the
   probe, and run it.
5. Use **Scan known UI** for the currently visible baseline components.
6. For stateful components, enter a label such as `hover`, `open`, `selected`,
   or `focus`, then capture the element while that state is visibly active.
7. Select **Download JSON**.
8. Repeat the process using ChatGPT **Dark** appearance.

Upload both JSON files for comparison before implementing the dual palettes.

## Controls

- **Pick element**: highlight an element and click it to capture.
- **Scan known UI**: capture the first visible match for common ChatGPT
  surfaces.
- **Download JSON**: save all current captures.
- **Clear**: discard the current capture list.
- **Close**: remove the probe UI and listeners.

Keyboard shortcuts are useful when opening a menu would otherwise be disturbed
by clicking the probe panel:

```text
Alt+Shift+P  Toggle the element picker
Alt+Shift+C  Capture the currently hovered element
Alt+Shift+J  Download the JSON report
```

The API is also available at:

```js
window.__chatgptOriginalStyleProbe
```

## Limitations

- Cross-origin stylesheets can be reported but cannot be read through CSSOM.
- Cross-origin iframe contents cannot be inspected from the top ChatGPT page.
- Closed shadow roots are not accessible.
- Container-query activation cannot always be identified directly; the
  resulting computed style is still captured.
- The rule index reflects the stylesheets loaded when the probe starts. Call
  `rebuildRuleIndex()` after a major route change if ChatGPT loads additional
  stylesheets.
