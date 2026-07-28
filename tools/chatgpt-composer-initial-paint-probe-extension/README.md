# ChatGPT Composer Initial Paint Probe Extension

Minimal Manifest V3 extension for capturing the transient blue line shown
around the ChatGPT composer during initial rendering.

The extension requests no permissions and does not collect prompt text or
conversation content. Its content script runs at `document_start` in an
isolated extension world and does not modify ChatGPT's JavaScript environment.

## Stability changes in v0.3.0

- Removed `MAIN` world execution and history API patching.
- Replaced continuous animation-frame scanning with 15 scheduled samples.
- Limited computed-style inspection to at most 48 composer-related elements.
- Uses the page-wide observer only for composer discovery and panel recovery.
- Observes attribute changes only inside the detected composer.
- Uses an isolated Shadow DOM panel and restores it if the page removes it.

## Install

1. Extract the distributed ZIP.
2. Open `chrome://extensions`.
3. Remove or reload the older probe extension.
4. Enable **Developer mode**.
5. Select **Load unpacked**.
6. Choose the extracted
   `chatgpt-composer-initial-paint-probe-extension` folder.

## Collect a result

1. Keep the Soft Graphite v1.0.20 candidate enabled.
2. Open or reload `https://chatgpt.com/`.
3. Wait until the transient line has appeared and disappeared.
4. Confirm that the top-right panel changes from `initial` to `passive`.
5. Click **Save JSON**.
6. Attach the downloaded JSON to the ChatGPT conversation.
7. Disable or remove the extension after collection.

## Recorded data

- Composer DOM structure and safe attributes
- Computed outline, border, shadow, background, animation, and transition styles
- `::before` and `::after` computed styles
- Selected focus, border, and Soft Graphite custom properties
- Element stacks sampled along the composer's top edge
- Focus, composer mutation, animation, transition, and document readiness timing

The first 15 seconds use a fixed lightweight sample schedule. After that,
only composer-local mutations and relevant interaction events trigger scans.
