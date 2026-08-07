# Changelog

## v1.0.25

- Replaced the bright accent-colored quote marker with a neutral graphite border color so quoted text blends with the theme more naturally.
- Removed the extra rectangular fill behind the new formatting toolbar menu while preserving its rounded outer popover and item states.

## v1.0.24

- Clipped Workspace app iframes to their rounded card shape so the sandbox document’s rectangular black corners no longer show through.

## v1.0.23

- Restored the Soft Graphite canvas color behind Composer suggestion lists after ChatGPT changed their spacing utility classes.
- Restored the Soft Graphite canvas color on the Scheduled page’s sticky header.
- Restored readable contrast for file-card icons using the SVG repaint path verified by the runtime proof probe.

## v1.0.22

- Restored conversation content around the composer’s rounded outer corners by removing the opaque bottom-container background while preserving the existing fade.
- Extended and reshaped the bottom fade so conversation content remains visible around the composer and disappears smoothly shortly before its lower edge.

## v1.0.21

- Restyled the Sources footnote control and removed the redundant native fill behind its nested icon container.
- Smoothed and lowered the bottom fade without changing its transition length, and added a subtle blur to soften visible text bands.

## v1.0.20

- Removed the transient blue line produced when ChatGPT briefly focuses its fallback Composer textarea during initial rendering.

## v1.0.19

- Refined the enabled Composer send and stop actions with a light graphite surface, dark glyph, and flat hover and pressed states.
- Restyled the Activity flyout surfaces and matched its tool-result cards to the code-block background without changing native geometry or syntax colors.

## v1.0.18

- Fixed the footer disclaimer appearing as a dark band by targeting its current semantic container and removing only the obsolete fill and masking shadow.

## v1.0.17

- Added a flat, low-contrast Header Control Style for header actions, using neutral hover, focus, open, and pressed states.
- Applied the Soft Graphite palette to the enabled Composer submit button instead of the default white surface.

## v1.0.16

- Refined hover, selected, and model-selector text states using probe-confirmed interaction behavior.
- Improved surface hierarchy by separating dialogs and Work panels from menus and model popovers.
- Simplified Work rows to transparent idle surfaces with border-only hover and focus feedback.
- Standardized structural, surface, and strong borders while moving remaining palette values into reusable tokens.
- Fixed the Library toolbar background after ChatGPT moved the painted surface to the inner top-controls element.

## v1.0.15

- Strengthened the graphite grain to match the visible texture of the Standard Graphite design guide.

## v1.0.14

- Restored the selected-conversation highlight in the left sidebar by matching the actual empty `data-active` attribute.
- Added a dedicated sidebar-selection token that is darker than the hover surface.
- Added the same subtle 3.5% SVG turbulence grain used by the Arcaia options panel across the themed ChatGPT surface.

## v1.0.13

- Removed localized Japanese `aria-label` dependencies from theme selectors.
- Scoped scrollbar styling to verified and semantic scroll owners.

## v1.0.12

- Disabled the bottom fade on the centered Home splash screen.

## v1.0.11

- Fixed the composer-area stacking and extended the bottom fade.

## v1.0.10

- Strengthened the bottom fade and opaque composer coverage.

## v1.0.9

- Fixed the GPT discovery search-field background cascade.

## v1.0.8

- Restored GPT discovery, Home suggestion, and Projects toolbar surfaces.

## v1.0.7

- Fixed the full-width bottom-fade transform.

## v1.0.6

- Reduced broad selectors, obsolete iframe rules, and redundant overrides.
