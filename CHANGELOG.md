# Changelog

## v2.5.0 — Debugger, Hermes, and Pandoc

- Added offline LaTeX problem analyzer with actionable suggestions for several missing `.sty` packages, font errors, and stale `latexmk` state.
- Added optional Hermes Agent integration via local CLI, review-before-apply code fixes, hash-based stale-file protection, and timestamped source backups.
- Added document conversion via Pandoc for DOCX, ODT, Markdown, HTML, and LaTeX with multiple output choices.
- Updated Linux setup to include `texlive-science` and Pandoc, and Windows setup to include Pandoc from WinGet.
- Added integrated Debug & Convert sidebar panel and detailed GitHub upgrade instructions in README.
- Preserved all v2.4 compiler controls and UI branding.

## v2.4.0 — Compilation diagnostics

- Live compile log, error locations, Clean & Recompile, Stop Compile, stale `latexmk` recovery.
