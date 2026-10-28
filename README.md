# EK TeX

**Editor LaTeX lokal untuk penelitian dan penulisan ilmiah.**  
Dikembangkan oleh **EK Instrumentation**.

![EK TeX — logo kucing](public/cat-logo.svg)

EK TeX menyediakan pengelolaan proyek, editor LaTeX multi-file, kompilasi PDF, pratinjau dokumen, serta referensi bibliografi dalam satu aplikasi berbasis web yang berjalan di komputer sendiri.

## Fitur

- **Dashboard proyek:** buat, impor, pilih, dan kelola proyek sebelum membuka editor.
- **Editor LaTeX:** syntax highlighting, multi-file `.tex`/`.bib`, autosave, dan backup lokal.
- **Kompilasi PDF:** pdfLaTeX, XeLaTeX, LuaLaTeX melalui `latexmk`, dengan preview dan ekspor hasil.
- **Referensi online:** cari metadata publikasi melalui Crossref dan tambahkan sitasi berdasarkan DOI.
- **Tampilan fleksibel:** sidebar dapat disembunyikan menggunakan tombol atau `Ctrl+B`.
- **Impor/ekspor:** pindahkan proyek dalam format ZIP.

## Instalasi Windows

**Cara 1 — Unduh dari GitHub**

1. Buka [repository EK TeX](https://github.com/efendiyhy/ek-tex).
2. Klik **Code → Download ZIP**, lalu ekstrak ZIP.
3. Klik dua kali **`install-windows.bat`** di dalam folder hasil ekstraksi.
4. Installer otomatis menempatkan aplikasi di **Documents\EK-TeX**, memasang dependensi yang diperlukan, dan membuat shortcut **EK TeX** di Desktop serta Start Menu.

**Cara 2 — Instal langsung melalui PowerShell**

Jalankan di Windows PowerShell:

```powershell
$setup = Join-Path $env:TEMP 'ek-tex-install.ps1'
Invoke-WebRequest 'https://raw.githubusercontent.com/efendiyhy/ek-tex/main/install-from-github.ps1' -OutFile $setup
powershell -NoProfile -ExecutionPolicy Bypass -File $setup
```

Tidak perlu mengisi username repository atau memilih folder instalasi. Lokasi Documents mengikuti pengaturan Windows, termasuk Documents yang diarahkan ke OneDrive.

> **Prasyarat:** Windows dengan WinGet/App Installer, internet pada instalasi pertama, ruang disk yang memadai, dan izin instalasi perangkat lunak bila diminta. Installer menyiapkan Node.js, MiKTeX, Strawberry Perl, serta `latexmk`. Paket distribusi LaTeX tidak disertakan di dalam repository.

## Menjalankan dan menghentikan

Buka shortcut **EK TeX** di Desktop atau Start Menu. Browser akan membuka `http://127.0.0.1:3457`. Server dijalankan pada **jendela terminal yang tetap terlihat**.

Untuk menghentikan server, tekan **Ctrl+C** di terminal atau tutup terminal. Menutup tab browser saja tidak menghentikan server.

## Lokasi proyek dan pembaruan

Dokumen disimpan di **Documents\EK-TeX\workspace**. Folder ini **tidak ditimpa atau dihapus** selama instalasi ulang atau update. Proyek dari instalasi GitHub versi lama di `%LOCALAPPDATA%\Programs\LaTeXStudioLocal\workspace` akan disalin bila belum tersedia di lokasi baru; file aslinya tetap disimpan.

Untuk memperbarui aplikasi dari GitHub, hentikan server lalu jalankan **`update-windows.cmd`** di folder `Documents\EK-TeX`. Shortcut tidak perlu dibuat ulang secara manual.

Backup proyek penting tetap disarankan sebelum pembaruan sistem atau perangkat.

## Linux (Ubuntu, Debian, Armbian)

```bash
chmod +x setup-linux.sh start-linux.sh
./start-linux.sh
```

Launcher Linux menyiapkan dependensi menggunakan `apt` bila diperlukan. Fitur shortcut otomatis ke Documents saat ini khusus Windows.

## Informasi teknis

- Berjalan secara lokal pada `127.0.0.1` dan tidak membuat Windows Service atau autostart.
- Memerlukan Node.js 18+; Node.js LTS direkomendasikan. Tidak memerlukan database atau dependensi npm eksternal.
- Kompilasi LaTeX membutuhkan instalasi TeX yang berfungsi. Unduhan paket MiKTeX baru dan pencarian DOI memerlukan internet.
- Jangan membuka dokumen LaTeX dari sumber tidak tepercaya tanpa pemeriksaan.
- Pengujian kode: `npm test`. Pengujian compiler: `npm run verify-latex`.
- Installer WinGet dan shortcut Windows perlu diuji pada Windows; pengujian di lingkungan Linux tidak menggantikan pengujian instalasi Windows.

Untuk petunjuk troubleshooting dan instalasi tambahan, baca [Panduan instalasi](INSTALL-DI-LAPTOP-LAIN.md).

---

**EK TeX** · Developed by **EK Instrumentation**  
Source code: [github.com/efendiyhy/ek-tex](https://github.com/efendiyhy/ek-tex)
