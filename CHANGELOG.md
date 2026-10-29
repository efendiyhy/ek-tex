# Changelog

## 2.7.0 — Editor Assistance & Themes (2026-10-29)

- Menambahkan autocomplete perintah LaTeX setelah karakter `\\` dengan pilihan berbasis keyboard/mouse dan template yang menempatkan kursor secara otomatis.
- Menambahkan highlight merah di kode dan gutter untuk kesalahan kompilasi yang menyertakan nama file dan nomor baris.
- Memperbarui navigasi diagnostik: klik pesan error untuk membuka file dan berpindah ke baris terkait.
- Menyediakan empat palet tema (Emerald, Ocean Blue, Amethyst, Copper), masing-masing tersedia dalam mode Dark dan Light.
- Menyimpan preferensi tema di browser, tersedia dari halaman dashboard maupun editor.
- Menambah pengujian fitur editor dan memperbarui README instalasi/pembaruan.

## 2.6.0 — Project Workflow

- Dashboard proyek berbentuk daftar dengan rename/delete dan ringkasan compact.
- Konverter dokumen menghasilkan proyek LaTeX baru tanpa mencampurkan hasilnya dengan proyek terbuka.
- Compile mengikuti tab `.tex` yang aktif dan pratinjau PDF terkait.

## 2.5.1 — Nested AUX Directories

- Menyiapkan direktori `.latexstudio-build` sebelum compile biasa dan sesudah Clean & Recompile agar `\\include` bersubfolder dapat menulis `.aux`.

## 2.5.0 — Debugging & Converter

- Integrasi Hermes Agent opsional, debugger offline, dan konversi dengan Pandoc.
