# Changelog

## 1.0.19
### Added
- **Interactive Webview Dashboard**: Displays CSS coverage, selector stats, dynamic SVG charts, and a detailed interactive table sorted by confidence score.
- **Smart Confidence Heuristics**: Added a confidence score (0-100%) to reduce false positives by evaluating selector usage probability.
- **Modular Extractors**: Complete architectural rewrite introducing specialized, framework-specific extractors for HTML, JSX/React, Vue, Angular, Svelte, Astro, Pug, CSS Modules, and standard DOM APIs.
- **Performance & Limits**: Added concurrency limits and file size limit configurations to optimize speed and prevent high memory usage.
- **Export Reports**: Added command `CSS: Export analysis results` to export selector analysis directly to a file.

### Improved
- Substantially optimized codebase scanning speed through parsed files concurrency.
- Enhanced selector parsing precision using isolated specificity analysis.

## 1.0.18
### Fixed
- Fixed false positives in complex selectors like `.prose a`.
- Fixed incorrect unused detection for selector lists like `h1, h2, h3, h4, h5, h6`.
- Fixed keyframe steps (`from`, `to`, `%`) being treated as regular selectors.

### Improved
- Improved selector analysis for comma-separated rules.
- Improved rule status accuracy with better `confirmed`, `probable`, and `unused` detection.
- Improved reference counting to avoid misleading matches from partial selector atoms.

## 1.0.17
- Fixed tags detection for CSS/SCSS files.
- Metadata improvements for better extension discoverability.

## 1.0.16
- Initial release.