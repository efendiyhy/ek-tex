# Changelog

## 2.8.0 — Reference Discovery and Academic Search

- Replaced the legacy references sidebar form with a dedicated reference search popup, available from dashboard, toolbar, and references rail icon.
- The reference popup remains open on backdrop clicks and Escape; only its X button dismisses it.
- Added separate title, author, and DOI inputs. Title and author queries use appropriate Crossref metadata search fields.
- Added contextual **Cari Referensi** action for selected LaTeX text and study-title-aware keyword suggestions.
- Integrated optional Hermes Agent for read-only keyword suggestions and an offline lexical fallback when Hermes is unavailable.
- Added user-editable keyword query, safe BibTeX saving, and optional citation insertion without changing the active source tab.
- Added release documentation with developer logo, screenshots, table of contents, installation and update instructions, and official EK Instrumentation website.
- Extended automated tests for reference search and keyword extraction routes.

## 2.7.0 — Smart Editor and Themes

- LaTeX autocomplete with keyboard navigation.
- Highlighting compiler errors in source lines and line number gutter.
- Four theme palettes, each with light and dark modes.

Earlier features preserved: project management, active-file compilation, Hermes debugger, Pandoc converters, include AUX directory preparation and safe project backups.
