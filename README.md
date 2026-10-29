# EK TeX

**A local LaTeX workspace for academic writing**  
Developed by **EK Instrumentation**

EK TeX adalah editor LaTeX berbasis browser yang berjalan di komputer pengguna. Proyek, naskah, bibliografi, dan hasil kompilasi disimpan secara lokal. Server hanya mendengarkan pada `127.0.0.1` dan tidak memerlukan akun cloud.

![EK TeX](public/cat-logo.svg)

## Fitur

| Area | Kemampuan |
| --- | --- |
| Dashboard | Daftar proyek vertikal, pencarian, buat/import proyek, **Rename**, dan **Delete** dengan konfirmasi |
| Editor | Multi-file `.tex`/`.bib`, autosave, backup, syntax highlighting, sidebar yang dapat disembunyikan |
| Kompilasi | `latexmk` dengan pdfLaTeX, XeLaTeX, LuaLaTeX, log langsung, Stop, Clean & Recompile |
| PDF | Preview hasil **file `.tex` yang sedang aktif**, bukan selalu `main.tex` |
| Referensi | Pencarian Crossref, impor DOI, dan pembaruan metadata `.bib` |
| Debugger | Diagnosis error LaTeX umum; Hermes Agent opsional dengan peninjauan diff sebelum perubahan diterapkan |
| Konverter | DOCX, ODT, Markdown, HTML, LaTeX melalui Pandoc; **konversi ke `.tex` membuat proyek baru** |
| Pertukaran proyek | Import/export ZIP proyek |

### Perubahan v2.6

- **Konversi terpisah.** Tombol **Konversi dokumen** tersedia di dashboard maupun sidebar editor. Hasil konversi menuju LaTeX selalu dibuat sebagai **proyek baru** dengan `converted.tex`, `references.bib`, dan folder `media/` bila diperlukan. Proyek yang sedang dibuka tidak ditambah atau ditimpa. Output DOCX, Markdown, dan HTML diunduh sebagai file.
- **Pengelolaan proyek.** Dashboard menampilkan proyek sebagai daftar satu kolom, dengan aksi **Rename** dan **Delete** pada setiap baris. Rename mengubah nama tampilan, bukan ID atau lokasi folder proyek. Penghapusan mengharuskan pengguna mengetik ulang nama proyek dan menghapus seluruh isi folder proyek secara permanen. **Ekspor ZIP terlebih dahulu** untuk proyek yang perlu disimpan.
- **Kompilasi tab aktif.** Saat menekan **Compile** atau **Clean & Recompile**, EK TeX mengompilasi file `.tex` pada tab editor aktif. Tab `.bib`/file non-TeX tidak dapat dikompilasi. Preview PDF dibatasi pada file yang benar-benar dikompilasi.
- **Konsistensi build.** Saat berpindah target `.tex`, cache hasil kompilasi lama dibersihkan untuk menghindari PDF tertukar. Persiapan subfolder `.latexstudio-build/` untuk `\include{...}` tetap dilakukan sebelum setiap kompilasi.
- **Ringkasan dashboard lebih ringkas.** Jumlah proyek, status compiler, dan pintasan impor diletakkan di bagian atas tanpa memenuhi ruang daftar proyek.

> **File bab `.tex` yang hanya berisi isi bab, tanpa `\documentclass` dan `\begin{document}`, biasanya tidak dapat dikompilasi secara mandiri.** Buka file induk yang lengkap untuk mengompilasi seluruh tesis, atau beri file bab struktur LaTeX mandiri jika memang ingin membuat PDF terpisah. Pemilihan tab aktif tidak otomatis mengubah isi file atau menambahkan preamble.

## Persyaratan

- Node.js **18+**.
- TeX Live (Linux) atau MiKTeX (Windows) dengan `latexmk` dan compiler yang digunakan.
- Pandoc untuk konversi dokumen. Hermes Agent opsional untuk saran AI.
- Internet saat memasang dependensi, memperbarui kode, atau memakai Crossref. Editor dan compiler lokal dapat digunakan offline setelah dependensi terpasang.

## Instalasi Windows

Jalankan PowerShell:

```powershell
$setup = Join-Path $env:TEMP 'ek-tex-install.ps1'
Invoke-WebRequest 'https://raw.githubusercontent.com/efendiyhy/ek-tex/main/install-from-github.ps1' -OutFile $setup
powershell -NoProfile -ExecutionPolicy Bypass -File $setup
```

Alternatif: unduh repository dari [GitHub](https://github.com/efendiyhy/ek-tex) sebagai ZIP, ekstrak, kemudian jalankan `install-windows.bat`.

Installer memasang aplikasi ke folder **Documents\EK-TeX** dan memeriksa dependensi yang dibutuhkan. Launcher membuat shortcut di Desktop dan Start Menu. Saat shortcut dijalankan, terminal server tetap terlihat. Tekan **Ctrl+C** pada terminal untuk menghentikan aplikasi.

Instalasi pertama dapat memerlukan WinGet, internet, ruang disk yang cukup, serta konfirmasi izin administrator. Hermes tidak dipasang otomatis.

## Instalasi Ubuntu / Debian

```bash
sudo apt update
sudo apt install -y git
mkdir -p ~/Documents
cd ~/Documents
git clone https://github.com/efendiyhy/ek-tex.git EK-TeX
cd EK-TeX
chmod +x start-linux.sh setup-linux.sh update-linux.sh
./start-linux.sh
```

Launcher akan memeriksa dependensi dan menawarkan instalasi melalui `apt` jika diperlukan. Untuk menjalankan kembali:

```bash
cd ~/Documents/EK-TeX
./start-linux.sh
```

Buka **http://127.0.0.1:3457** pada browser. Server berjalan di terminal sampai Anda menekan **Ctrl+C**. Installer Linux saat ini tidak otomatis membuat shortcut Desktop.

## Cara memperbarui EK TeX

**Selalu hentikan server (Ctrl+C) sebelum memperbarui.** Disarankan membuat cadangan folder `workspace/` untuk proyek penting.

**Windows** — jalankan `update-windows.cmd` di folder `Documents\EK-TeX`. Setelah berhasil, buka kembali shortcut **EK TeX**. Script akan mengambil source terbaru dari repository resmi dan mempertahankan `workspace/`.

**Ubuntu / Debian** — untuk instalasi melalui `git clone`:

```bash
cd ~/Documents/EK-TeX
./update-linux.sh
./start-linux.sh
```

Updater Linux memakai `git pull --ff-only` dan akan berhenti jika source yang dilacak Git memiliki perubahan lokal, untuk menghindari penimpaan perubahan. Pada versi lama tanpa `update-linux.sh`, jalankan `git pull --ff-only origin main` sekali, lalu jalankan launcher.

**Instalasi manual dari ZIP** — unduh source baru dan perbarui hanya file program; **jangan hapus atau timpa `workspace/`**. Proyek yang telah disimpan tetap berada di sana. Pembaruan tidak memerlukan instalasi ulang LaTeX jika compiler sudah tersedia.

## Alur kerja

### Membuat dan mengelola proyek

Pada dashboard, klik **Proyek baru** untuk memulai dari template Article, Report, Thesis, Beamer, atau Blank. Klik nama proyek pada daftar untuk masuk ke editor. Setiap baris memiliki tombol **Rename** dan **Delete**. Penghapusan bersifat permanen dan memerlukan konfirmasi nama proyek; ekspor ZIP dari editor terlebih dahulu jika ingin menyimpan arsip.

### Mengonversi dokumen

Klik **Konversi dokumen** pada dashboard atau **✦ Debug & Convert → Konversi ke proyek baru** dalam editor. Pilih input DOCX/ODT/Markdown/HTML/LaTeX dan output:

- **LaTeX (.tex):** menghasilkan proyek baru dengan file `converted.tex`, file `.bib` awal, dan media yang diekstrak bila ada. Nama proyek bisa ditentukan sebelum konversi.
- **Word (.docx), Markdown (.md), HTML (.html):** menghasilkan file unduhan, tanpa mengubah proyek mana pun.

Pandoc tidak menjamin hasil konversi identik dengan tampilan Word, khususnya untuk persamaan kompleks, referensi, tabel, dan gambar. Tinjau hasil sebelum publikasi.

### Mengompilasi file `.tex`

Buka tab `.tex` yang hendak dikompilasi, pilih engine, kemudian klik **Compile**. Teks `Target: nama-file.tex` tampil di toolbar. **Clean & Recompile** membersihkan cache build lalu mengompilasi file yang sama. PDF ditampilkan untuk file tersebut; memilih file `.tex` lain yang belum dikompilasi tidak akan menampilkan PDF yang keliru.

Untuk proyek multi-file dengan `\include{Isi/Bab1}`, aplikasi menyiapkan direktori pendukung seperti `.latexstudio-build/Isi/` sebelum pemanggilan `latexmk`, termasuk sesudah Clean & Recompile. Folder `.aux` dibuat oleh compiler; EK TeX hanya menyiapkan direktorinya.

### Debugger dan Hermes

Setelah kesalahan kompilasi, gunakan panel Debugger untuk membaca error dan solusi yang terdeteksi. Jika CLI `hermes` telah terpasang dan dikonfigurasi, pengguna dapat meminta saran AI. EK TeX memperlihatkan perubahan yang diusulkan dan meminta persetujuan; file sumber dibackup sebelum penerapan. Hermes dapat menggunakan model/provider eksternal sesuai konfigurasi di komputer, sehingga perhatikan privasi isi dokumen yang dikirim.

## Penyimpanan dan privasi

| Lokasi | Isi |
| --- | --- |
| `workspace/<id-proyek>/` | File sumber penelitian dan konfigurasi proyek |
| `workspace/<id-proyek>/.latexstudio-build/` | PDF, log, file AUX, dan cache kompilasi |
| `workspace/<id-proyek>/.latexstudio-backups/` | Backup otomatis yang dibuat saat diperlukan |

`workspace/` dikecualikan dari Git melalui `.gitignore`; isinya tidak boleh dimasukkan ke repository publik. EK TeX merupakan layanan **lokal tanpa autentikasi**, bukan aplikasi untuk dibuka langsung ke internet. Jangan menjalankan kompilasi atau konversi pada dokumen tidak tepercaya karena TeX/Pandoc/Hermes berjalan sebagai proses lokal dengan izin pengguna sistem.

## Pengujian dan pemecahan masalah

```bash
npm test
npm run verify-latex
```

Jika PDF gagal dibuat, periksa panel log dan jalankan **Clean & Recompile** setelah mengatasi error. Jika `algorithmic.sty` tidak tersedia di Ubuntu, instal `texlive-science`. Jika CSS tidak tampil, jalankan aplikasi melalui `http://127.0.0.1:3457` dan jangan membuka `public/index.html` langsung dengan `file://`.

---

**EK TeX** · Developed by **EK Instrumentation**  
Repository: https://github.com/efendiyhy/ek-tex
