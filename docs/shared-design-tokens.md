# Shared design tokens: Milestone 1

Implemented October 7, 2026 against baseline `1e1533a`, following the approved [foundation audit](shared-design-foundation-audit.md). Only token extraction is implemented; component consolidation and theme redesign remain deferred.

## Ownership and loading

[tools/shared/tokens.css](../tools/shared/tokens.css) contains the existing neutral, coral, cyan/teal and gold colors and alpha variants; semantic surface, border, text, accent, success, warning and error roles; Crimson Pro/Readex Pro font families; a 4/8/12/16px spacing scale; and 4/8/10px radii. Error aliases the existing accent. The new spacing/control-radius foundations do not change component dimensions.

The shared sheet supplies dark defaults and `body.light` overrides. Semantic references are declared on both `:root` and `body` so values resolve on the theme element. It contains no resets, component styles, font downloads or behavior.

The [Builder](../tools/resume-tailor.html) loads `shared/tokens.css` before its embedded styles; [Radar](../tools/career-radar/index.html) loads `../shared/tokens.css` before [its local styles](../tools/career-radar/styles.css). Both paths work under the GitHub Pages repository subdirectory. No workflow, package or dependency changes are needed.

## Compatibility

Legacy variable names remain local aliases, declared on `:root` and `body`. Existing consumers need no class or selector changes.

| Alias | Shared role | Dark | Light |
| --- | --- | --- | --- |
| Builder `--muted` | Tertiary text | `#94918D` | `#7a7870` |
| Builder `--muted-light` | Secondary text | `#BAB8B5` | `#4F4D4A` |
| Radar `--muted` | Secondary text | `#BAB8B5` | `#4F4D4A` |
| Both `--radius` | Panel radius | `10px` | `10px` |

Other aliases preserve their former values. Radar retains its local `color-scheme` declarations; Builder retains its existing native-control behavior. Font-loading URLs, body/label density, hover/focus states and theme JavaScript remain unchanged.

## Validation

Local Chrome comparisons use disposable synthetic Radar data and synthetic résumé/cover-letter content, with no AI calls or hosted database writes. Baseline and updated pages were checked in dark/light modes at **1280×900** and **390×844** for Builder form/résumé preview and Radar board/expanded editor; cover-letter previews were also compared in both desktop themes.

All 18 view comparisons match legacy token values (normalizing equivalent decimal formatting), computed typography, component styling and document-relative geometry after matching interaction states and allowing existing transitions to settle. Source checks confirm Builder JavaScript, preview/export definitions and component CSS are byte-identical, as is Radar's component CSS. Shared extraction introduces no intended visual differences.

Fifteen screenshot pairs are pixel-identical. Three mobile captures differ by 33–346 pixels in small regions, with identical computed styles and geometry; no substantive visual difference was observed. Expanded editor fields were explicitly verified visible in both themes and widths. Screenshots and comparison measurements are temporary local validation artifacts, not committed fixtures.

The scoped Radar typecheck, lint, SDK vendor verification, Edge Function typecheck/lint, **79 Node tests** and **5 Deno tests** pass. Relative assets and documentation links are checked separately; `git diff --check` passes.

## Remaining risks

- The résumé page now depends on a sibling CSS file. A single downloaded HTML file is no longer sufficient; copy the shared stylesheet too. Local HTTP serving and Pages need no build step.
- Publishing must include the shared asset and both entry points. Existing browser caches may need a reload after publishing. Hosted deployment is outside this milestone.
- Existing accessibility, contrast, narrow-header and theme-control debt is unchanged. This validation is a Chrome fixture comparison, not real-device or screen-reader acceptance.
- Exports were not regenerated: export code and preview styling are unchanged, and both document previews were compared directly.

Stop here for review before any shared primitive, JavaScript, typography or palette changes.
