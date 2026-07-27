# ChatGPT Unified Style Probe

Canonical probe:

```text
tools/chatgpt-unified-style-probe.js
```

Current internal version: `2.0.2`

This single DevTools Snippet replaces the former base probe, gap probe, and
integrated-probe builder. No separate source-order or build step is required.
Only one visible probe window is created. The former base and integrated
engines run without their own visible panels, and rerunning the probe removes
legacy or temporary probe windows before creating the unified panel.

## Basic workflow

1. Disable Soft Graphite and every other UserCSS applied to `chatgpt.com` when
   collecting ChatGPT's default styles.
2. Switch ChatGPT to Dark appearance and reload the page.
3. Open DevTools, then open **Sources → Snippets**.
4. Paste and run `tools/chatgpt-unified-style-probe.js`.
5. Display and use the UI that should be captured.
6. Select **JSON保存**.

The probe begins collecting immediately after launch. Manual scanning or
element selection is normally unnecessary.

## Automatic collection

- Initial scans at launch and after 150, 500, and 1,200 milliseconds
- A 1.2-second visible-page rescan
- DOM additions and relevant state-attribute changes
- Hover, focus, pointer, click, and keyboard states
- Scroll and viewport-size changes
- Menus, listboxes, dialogs, tooltips, Composer, Sidebar, Work, and code UI
- Activity flyout stage, screen, scroll surface, painted primary surfaces, and
  visible card candidates
- Visible iframe shells and same-origin availability
- Frame-root, painted-surface, and card candidates when the same probe is run
  from an iframe execution context

Computed styles, matched CSS rules, custom properties, pseudo-elements, and
paint-owning ancestors remain part of each detailed capture.

## Movable panel

Drag the probe window by its header. The panel is clamped to the visible
viewport and does not begin dragging from buttons or form controls.

## iframe use

Cross-origin iframe contents cannot be inspected from ChatGPT's top-page
JavaScript context. To inspect a tool widget later:

1. Select the target iframe in DevTools' JavaScript execution-context menu.
2. Run the same `chatgpt-unified-style-probe.js` file again.

No separate iframe probe is required.

## Live preview

The **Soft Graphiteプレビュー** control applies a temporary preview:

- Top-page context: the Activity flyout's current black base surfaces
- iframe context: common frame surface and text variables

Automatic collection pauses while the preview is active, preventing preview
styles from being mixed into default-style evidence. Select
**プレビュー解除** to restore the page and resume collection.

## Environment warning

The panel warns when Soft Graphite is detected. This warning matters for
default-style collection; preview-only use may keep the theme enabled.

## Privacy

The report does not export conversation text, the page title, full
conversation or project identifiers, query strings, cookies, storage, or
authorization data.
