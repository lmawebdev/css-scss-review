# Changelog

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