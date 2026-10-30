# Changelog

## 3.1.0 — Softer editor and PDF layout options (30 October 2026)

- Memperhalus tampilan editor dengan radius panel, toolbar, popup, dan kartu yang lebih konsisten.
- Membuat scrollbar aplikasi mengikuti Light/Dark mode pada setiap tema, termasuk source editor, sidebar, dialog, dan output log.
- Menambahkan kontrol berikon **Split / Tab baru** pada toolbar atas. Preferensi tampilan PDF tersimpan di browser.
- Membuka PDF di tab terpisah ketika tersedia; dalam mode Tab baru, Compile menyiapkan tab sebelum proses asinkron agar tidak terhalang popup blocker.
- Menyediakan Compile, Clean & Recompile, dan Stop pada toolbar editor saat panel pratinjau samping disembunyikan.
- Menghapus kartu GETTING STARTED dan tautan setup compiler dari sidebar editor. Panduan tetap ada di README.
- Memperbarui gambar dokumentasi dan menambahkan pengujian fitur PDF baru.

**Compatibility:** Tidak ada perubahan format proyek, struktur workspace, atau API. Fitur sebelumnya tetap tersedia.

---

## 3.0.0 — Editor redesign and project switcher (30 October 2026)

- Mengubah tombol `+` editor dari pembuatan proyek langsung menjadi menu **Open saved project / New project / Import ZIP**.
- Menambahkan pemilih proyek tersimpan yang mendukung pencarian dan penanda proyek aktif. Pergantian proyek memakai penyimpanan yang sudah tersedia.
- Membuat sistem antarmuka yang lebih konsisten sesuai panduan desain pengguna: palet warna datar, tipografi, grid spacing, ukuran kontrol, radius, state keyboard, dan reduced-motion.
- Memperluas pilihan tampilan menjadi lima palet (Forest, Ocean, Plum, Clay, Graphite) dengan Light/Dark.
- Merapikan dashboard, tab editor, panel PDF, popup referensi, AI Assistant, dan settings tanpa mengubah penyimpanan `workspace/`.
- Menambah pengujian untuk menu dan assets desain serta memperbarui dokumentasi penggunaan.

**Compatibility:** Mempertahankan endpoint dan struktur proyek dari v2.9.2. Tidak memerlukan migrasi file dokumen.

---


## 2.9.2 — Find & Replace and Floating AI Chat

- Introduced Find & Replace for the current file, with one-click Replace, Replace All, case sensitivity and whole-word matching.
- Added keyboard shortcuts Ctrl+F / Ctrl+H and previous/next match navigation.
- Positioned the AI Chat as a compact, minimizable popup in the editor’s bottom-right corner with a floating launcher.
- Introduced explicit **Ganti teks** mode for AI-assisted replacement of selected LaTeX text; the before/after review and backup protections remain.
- Removed the repetitive “AI hanya membantu menyusun kata kunci” notice from the reference search popup. Search, abstract preview and citation workflow are unchanged.
- Updated product documentation and added automated tests for literal replacement and UI elements.


## 2.9.1 — Abstract Preview for Reference Search

- Click a publication result to expand or collapse its abstract before saving or citing.
- Extract readable plain text from Crossref JATS abstract metadata.
- Fall back to OpenAlex DOI lookups and reconstruct its inverted-index abstract when Crossref has none.
- Show the abstract source, unavailable state, and loading/error states without inventing content.
- Keep saving and citation actions distinct from the preview; no change to project files until the user chooses to save.
- Add unit/API-validation and browser interaction tests, plus documentation and preview screenshot.

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
