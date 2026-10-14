# Shared Gravity UI icons

Both static applications can use the 799 icons from `@gravity-ui/icons` **2.22.0**. The official package provides [raw SVGs](https://github.com/gravity-ui/icons#svg); this repository vendors them as a single, same-origin SVG sprite. npm tooling stays scoped to Radar. GitHub Pages serves the committed assets without a build step or runtime CDN dependency.

The assets, MIT license, catalog and package integrity are in [shared/vendor/gravity-icons](../tools/shared/vendor/gravity-icons/). The sprite preserves upstream view boxes and namespaces repeated clip-path IDs. The shared stylesheet is loaded by both apps; icons inherit their surrounding text color.

## Use an icon

In a Radar module:

```js
import { gravityIcon, gravityIconNames } from '../shared/icons.mjs';

const icon = gravityIcon('arrow-right'); // decorative alongside a text label
sendButton.append(icon);

const labeled = gravityIcon('circle-info', { size: 20, label: 'Information' });
```

In a Builder module script, use `./shared/icons.mjs` instead. `gravityIconNames` lists the supported kebab-case names, matching the upstream SVG filenames. Unknown names and invalid sizes throw rather than render silently empty icons. Icons are non-focusable; a label supplies an accessible image name, while unlabeled icons are hidden from assistive technology.

Static HTML also works; use the appropriate relative sprite path:

```html
<svg class="gravity-icon" width="16" height="16" viewBox="0 0 16 16"
     aria-hidden="true" focusable="false">
  <use href="../shared/vendor/gravity-icons/sprite.svg#arrow-right"
       width="16" height="16"></use>
</svg>
```

## Regenerate or update

From `tools/prospect-tracker/`:

```sh
npm ci
npm run icons:generate
npm run icons:check
```

To update, install an exact `@gravity-ui/icons` version as a dev dependency, regenerate the assets, run the checks and review the diff. Commit the lockfile and all generated assets together. The generator checks installed/package/lockfile versions, and the scoped vendor test verifies the sprite, catalog, license and provenance against the pinned package.
