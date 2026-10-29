# Changelog

## 2.4.0 — Improved LaTeX compilation

- Stream compiler logs while compilation runs via project-local build status polling.
- Add **Clean & Recompile** and **Stop** controls.
- Retry one clean build automatically for stale `latexmk` previous-invocation errors.
- Show actionable diagnostics with file and line numbers.
- Preserve source files while clearing only the build cache.
- Document Windows and Ubuntu GitHub updates directly in README.

## 2.3.0 — Windows installation and documentation

- Simplified the public README and removed repository initialization instructions.
- Bound GitHub installation to `efendiyhy/ek-tex` by default.
- Installed the application automatically to the Windows Documents known folder under `EK-TeX`.
- Created **EK TeX** shortcuts for Desktop and Start Menu, preserving the visible server console.
- Preserved user projects in `workspace/` during reinstall/update.
- Added non-destructive migration for projects from the previous AppData installation location.
- Added static release checks for installation defaults and project preservation.
- Preserved the cat branding and EK Instrumentation developer attribution.
