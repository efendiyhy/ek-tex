# Changelog

## 2.9.0 — Project-aware AI Writing Assistant

- Added a writing assistant drawer with model/provider detection (configured Hermes Agent or installed local Ollama models).
- Added chat modes: Ask, Grammar, Academic Rewrite, Clarity, LaTeX, Explain; supports selected text and active `.tex` file context.
- Added safe before/after proposals, one-click approval with automatic backup, stale-file protection, and project-scoped browser conversation history.
- Added bounded inputs, timeouts, a loopback-only Ollama connection, no arbitrary tool execution, and explicit AI data-sharing notices.
- Added assistant integration tests, product documentation, and new static assets.

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
