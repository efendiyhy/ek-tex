# Changelog

## 2.6.0 — Project workflow update

- Converter to LaTeX now creates a separate project, including media extraction and project metadata. Accessible from dashboard and editor.
- Added project rename and deletion to dashboard, with exact-name confirmation for permanent deletion.
- Reworked dashboard into a compact summary and vertical project list.
- Compile and Clean & Recompile now target the currently opened `.tex` file, with source-specific PDF preview.
- Reset build cache when changing compilation targets to avoid stale or mismatched PDFs.
- Preserved debugger, optional Hermes suggestions, Pandoc converters, Bibliography, nested `\include` AUX preparation, and Windows/Linux installers.
- Updated automated tests for project management, conversion isolation, active-file compilation, and PDF routing.
- Rewritten README with installation, update, usage, limitations, and privacy guidance.

## 2.5.1

- Prepare `.latexstudio-build/` subdirectories before each compile for `\include` AUX files.

## 2.5.0

- Offline LaTeX debugger, optional Hermes suggestions with review/backup, Pandoc document conversion.

## 2.4.0

- Live compile logs, Clean & Recompile, Stop Compile, diagnostic navigation, and stale latexmk recovery.

## 2.3.0

- Simplified local and GitHub installers; default installation under Documents.

## 2.2.0

- EK Instrumentation developer branding and cat logo.
