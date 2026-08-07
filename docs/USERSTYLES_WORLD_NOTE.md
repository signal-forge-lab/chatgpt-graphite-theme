## ChatGPT Soft Graphite

A refined, unofficial dark theme for ChatGPT built around a calm, low-contrast Soft Graphite color palette.

### Features

* Supports regular ChatGPT conversations, Projects, Work, and Library
* Restyles the composer, primary actions, and user message bubbles
* Refines header actions with flat, low-contrast interaction states
* Refines menus, tooltips, model selectors, and content surfaces
* Restyles code blocks, inline code, and Activity tool-result cards
* Supports the Chat / Work segmented control
* Supports temporary chat controls
* Highlights the currently selected conversation in the sidebar
* Adds a subtle graphite-like grain across the interface
* Makes no external font or image requests and includes no scripts or tracking

### Requirements

* A browser extension that supports UserCSS, such as Stylus
* ChatGPT dark mode

### Installation

Recommended: install the canonical UserCSS directly from GitHub Raw.

* [Install from GitHub](https://raw.githubusercontent.com/signal-forge-lab/chatgpt-graphite-theme/main/chatgpt-soft-graphite.user.css)
* [Install from UserStyles.world](https://userstyles.world/style/29175/chatgpt-soft-graphite)

The GitHub version remains available when UserStyles.world is unavailable and
can receive updates through the embedded `@updateURL`.

Disable older release-candidate versions before enabling the stable version.

### Compatibility

ChatGPT may change its interface or DOM structure without notice.
Some elements may require updates after a ChatGPT interface change.

### Changelog

#### v1.0.25

* Replaced the bright accent-colored quote marker with a neutral graphite border color so quoted text blends with the theme more naturally.
* Removed the extra rectangular fill behind the new formatting toolbar menu while preserving its rounded outer popover and item states.

#### v1.0.24

* Fixed the black corners around Workspace tool-result cards by clipping their sandbox iframes to the cards’ rounded shape.

#### v1.0.23

* Restored the Soft Graphite canvas color behind Home prompt suggestions after ChatGPT changed their spacing utility classes.
* Restored the Soft Graphite canvas color on the Scheduled page’s sticky header.
* Restored readable contrast for file-card icons using the runtime-verified SVG repaint path.

#### v1.0.22

* Fixed conversation content being hidden outside the composer’s rounded corners by restoring the transparent bottom container.
* Extended and reshaped the bottom fade so conversation content remains visible around the composer and disappears smoothly shortly before its lower edge.

#### v1.0.21

* Restyled the Sources footnote control and refined the fade above the composer for a smoother, less visibly stepped transition.

#### v1.0.20

* Removed the transient blue line produced when ChatGPT briefly focuses its fallback composer textarea during initial rendering.

#### v1.0.19

* Refined the enabled composer send and stop actions with a light graphite surface and dark center glyph.
* Restyled the Activity flyout and matched its tool-result cards to the code-block background.

#### v1.0.18

* Fixed the footer disclaimer appearing as a dark band while preserving its native spacing, typography, and alignment.

#### v1.0.17

* Added flat, low-contrast interaction states for header actions, including hover, focus, open, and pressed states.
* Applied the Soft Graphite palette to the enabled composer send button, replacing the default white surface.

#### v1.0.16

* Refined hover, selected, panel, menu, Work, and model selector styling for better visual consistency.
* Fixed the black toolbar background on the Library page.

#### v1.0.15

* Strengthened the graphite grain for a more visible textured finish across the interface.

#### v1.0.14

* Added a visible highlight for the currently selected conversation in the left sidebar, using a dedicated color darker than the hover state.
* Added a subtle graphite-like grain across the interface using a lightweight embedded SVG texture.

#### v1.0.13

* Removed Japanese `aria-label` dependencies from all theme selectors.
* Replaced translated UI labels with structural roles, stable IDs, state attributes, and test IDs.
* Replaced universal scrollbar styling with scoped rules for verified scrollable areas.
* Preserved the Home splash exception, normal conversation fade, and GPT search styling.

#### v1.0.12

* Disabled the bottom fade on the centered Home screen.
* Prevented the fade from overlapping the greeting above the chat composer.
* Kept the stronger bottom fade and opaque composer area in normal conversations.

#### v1.0.11

* Fixed messages showing through behind the chat composer.
* Added an isolated, fully opaque bottom composer area.
* Extended the bottom fade slightly higher for a smoother transition.

#### v1.0.10

* Strengthened the bottom fade above the chat composer.
* Expanded the fade area and added a fully opaque zone behind the input field.

#### v1.0.9

* Fixed the GPT discovery search field remaining black.
* Increased selector specificity only for the affected search input.
* Preserved the existing border, focus, and rounded-corner styling.

#### v1.0.8

* Restored styling on the GPT discovery page header.
* Applied Soft Graphite styling to the GPT search field and sticky search/category areas.
* Fixed the Home suggestion panel background.
* Fixed the black toolbar strip on the Projects directory page.

#### v1.0.7

* Fixed the bottom fade appearing only on the left half of the chat area.
* Removed the inherited horizontal transform from the full-width fade surface.

#### v1.0.6

* Refactored and reduced overly broad selectors.
* Removed obsolete workspace iframe-card rules.
* Narrowed header, Project, composer, code, Work, tooltip, and menu styling.
* Removed all class-substring selectors.
* Reduced redundant overrides while preserving the existing color palette and interaction design.

#### v1.0.5

* Fixed the black background behind the header action buttons.
* Reduced the fix to a single `background-color` override.

#### v1.0.4

* Updated the header action wrapper styling.
* Superseded by v1.0.5.

#### v1.0.3

* Restored Share and Options as separate rounded buttons.
* Stabilized their hover, focus, and open states.

#### v1.0.2

* Attempted to fix workspace tool-result card backgrounds.
* Later found that the actual UI was inside a cross-origin iframe.

#### v1.0.1

* Fixed a square background appearing behind the rounded model selector.
* Excluded Radix popper wrappers from the broad page canvas background rule.
* Improved transparent background handling for popup wrappers.

#### v1.0.0

* Initial stable release.
* Added support for regular ChatGPT conversations, Projects, and Work.
* Added Soft Graphite styling for the composer, user message bubbles, menus, tooltips, model selectors, and code blocks.
* Added styling for the Chat / Work segmented control and temporary chat controls.

### License

MIT License

Copyright (c) 2026 meio-dia

You may use, modify, redistribute, or commercially use this style under the terms of the MIT License.

### Disclaimer

This is an unofficial userstyle.
It is not affiliated with, endorsed by, or sponsored by OpenAI.

### Issues and Updates

Please report display issues with:

* The affected ChatGPT page
* A screenshot
* The browser name
* The installed style version
