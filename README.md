# EK TeX

**Local LaTeX Editor**  
Developed by **EK Instrumentation**

EK TeX adalah editor LaTeX berbasis browser yang dijalankan di komputer sendiri. Aplikasi menyediakan manajemen proyek, editor multi-file, kompilasi PDF, navigasi error, pencarian referensi berbasis DOI, bantuan debugging opsional melalui Hermes Agent, serta konversi dokumen dengan Pandoc.

Dokumen proyek disimpan secara lokal di `workspace/`. Akses internet diperlukan untuk instalasi dependensi dan fitur metadata referensi online; penyuntingan dan kompilasi dapat berjalan offline setelah dependensi lengkap tersedia.

## Fitur utama

| Area | Kemampuan |
|---|---|
| Workspace | Dashboard proyek berbentuk daftar, buat/rename/hapus proyek, impor dan ekspor ZIP |
| Editor | Syntax highlighting, autosave, multi-tab, pencarian, snippet, sidebar yang dapat diminimalkan |
| **Autocomplete LaTeX (v2.7)** | Saat mengetik `\`, tampilkan saran perintah; filter ketika nama perintah diketik; navigasi dengan panah dan Enter/Tab |
| **Penanda error (v2.7)** | Baris sumber yang memiliki nomor error ditandai merah di kode dan gutter nomor baris; klik error di panel Output untuk membuka file terkait |
| **Tema (v2.7)** | Empat palet: Emerald, Ocean Blue, Amethyst, Copper; tiap palet memiliki mode terang dan gelap; tersimpan per browser |
| Kompilasi | pdfLaTeX, XeLaTeX, LuaLaTeX melalui `latexmk`, preview PDF, log langsung, Stop Compile, Clean & Recompile |
| Bibliografi | Pencarian metadata online melalui Crossref, impor DOI ke BibTeX |
| Debugging | Petunjuk kesalahan berbasis aturan dan integrasi Hermes Agent jika tersedia dan dikonfigurasi |
| Converter | DOCX / ODT / Markdown / HTML → LaTeX melalui Pandoc; hasil LaTeX selalu menjadi **proyek baru** |

## Persyaratan

- **Windows:** Windows 10/11, PowerShell, WinGet dan koneksi internet untuk setup awal. Installer menyiapkan Node.js, MiKTeX, Strawberry Perl dan `latexmk` jika diperlukan.
- **Ubuntu/Debian:** Git, Node.js, TeX Live, `latexmk`, dan paket LaTeX yang dipakai dokumen. Setup Linux dapat membantu memasang dependensi melalui APT.
- **Opsional:** Pandoc untuk konversi; Hermes Agent untuk saran perbaikan AI. Hermes harus sudah dikonfigurasi di komputer; EK TeX tidak menyertakan model atau akun AI.

## Instalasi Windows

Unduh source repository atau paket ZIP EK TeX, lalu ekstrak. Jalankan **`install-windows.bat`** dari direktori hasil ekstraksi.

Installer menyalin aplikasi ke folder **Documents\EK-TeX**, menyiapkan dependensi, dan membuat shortcut Desktop/Start Menu. Gunakan shortcut tersebut untuk membuka aplikasi. Terminal server akan terlihat dan tetap aktif selama EK TeX digunakan; **Ctrl+C** menghentikan server.

Untuk menjalankan source tanpa memasang shortcut, gunakan `start-windows.bat`.

## Instalasi Ubuntu

Jalankan perintah berikut di Terminal:

```bash
sudo apt update
sudo apt install -y git
mkdir -p ~/Documents
cd ~/Documents
git clone https://github.com/efendiyhy/ek-tex.git EK-TeX
cd EK-TeX
chmod +x setup-linux.sh start-linux.sh update-linux.sh
./setup-linux.sh --yes
./start-linux.sh
```

Buka **http://127.0.0.1:3457** jika browser tidak terbuka otomatis. Hentikan server dengan **Ctrl+C**.

## Memperbarui aplikasi

Hentikan server sebelum melakukan pembaruan. Proyek lokal berada di `workspace/` dan tidak dilacak Git; tetap buat cadangan proyek penting secara terpisah.

**Ubuntu (instalasi dari GitHub)**

```bash
cd ~/Documents/EK-TeX
./update-linux.sh
./start-linux.sh
```

Atau gunakan `git pull --ff-only origin main` di folder repository sebelum menjalankan `./start-linux.sh`.

**Windows**

Jalankan `update-windows.cmd` dari folder instalasi `Documents\EK-TeX`, kemudian jalankan shortcut EK TeX. Jika memperbarui source secara manual melalui ZIP, ekstrak paket *Update Only* ke folder repository source dan ganti file program yang lama, **bukan** folder `workspace/`.

Jika perubahan CSS/JS tidak langsung terlihat, muat ulang browser dengan **Ctrl+Shift+R**.

## Penggunaan editor

1. Buka atau buat proyek dari dashboard.
2. Pilih file `.tex` pada sidebar. **Compile menargetkan file `.tex` yang sedang aktif**, bukan selalu `main.tex`.
3. Tekan **Ctrl+Enter** atau tombol Compile. Output PDF ditampilkan jika build berhasil.
4. Saat mengetik `\` di file `.tex`, pilih saran perintah dengan **↑/↓** kemudian **Enter** atau **Tab**. Perintah seperti `\section{}` menempatkan kursor di dalam kurung kurawal.
5. Bila build gagal dan `latexmk` melaporkan file serta nomor baris, baris bermasalah akan berwarna merah pada editor dan gutter. Klik entri error di panel **Output** untuk berpindah ke file/baris terkait.
6. Untuk mengganti tampilan, buka **Pengaturan** dari dashboard atau ikon roda gigi di editor. Pilih palet dan mode terang/gelap. Preferensi tersimpan di browser masing-masing.

### Batasan diagnostik

Penandaan baris memerlukan lokasi file dan nomor baris yang berhasil diidentifikasi dari log LaTeX. Beberapa kesalahan (misalnya paket `.sty` tidak ditemukan) tidak selalu menyertakan lokasi yang dapat ditandai. Dalam kasus tersebut, gunakan pesan di Output atau Debugger. Penanda berasal dari hasil kompilasi terakhir dan akan diperbarui pada compile berikutnya.

### File bab dan `\include`

Sebelum setiap compile, EK TeX menyiapkan subfolder `.latexstudio-build` sesuai struktur sumber untuk mendukung file `.aux` dari `\include{Isi/Bab1}`. *Clean & Recompile* menyiapkan kembali subfolder tersebut sesudah cache dibersihkan. File `.tex` yang hanya berisi potongan bab tanpa preamble tidak dapat selalu dikompilasi secara mandiri; buka file induk untuk menghasilkan seluruh dokumen.

## Pintasan keyboard

| Pintasan | Tindakan |
|---|---|
| `Ctrl+S` | Simpan semua file |
| `Ctrl+Enter` | Compile file `.tex` aktif |
| `Ctrl+F` | Cari dalam file |
| `Ctrl+B` | Sembunyikan / tampilkan sidebar |
| `\` | Buka saran perintah LaTeX |
| `↑` / `↓` | Pindah pilihan autocomplete |
| `Enter` / `Tab` | Sisipkan saran yang dipilih |
| `Esc` | Tutup popup / dialog |

## Pemeriksaan aplikasi

Dari folder source:

```bash
node --check server.js
node --check public/app.js
npm test
```

Pengujian memeriksa API proyek, compiler, pembuatan folder `.aux`, alur konverter, dan autocomplete/tema. Kompilasi PDF memerlukan `latexmk` dan engine LaTeX pada sistem.

## Privasi dan keamanan

Server dimaksudkan untuk penggunaan lokal. Jangan menaruhnya di jaringan publik tanpa perlindungan akses tambahan. Saran perbaikan Hermes harus ditinjau sebelum diterapkan; perubahan yang disetujui akan dibackup. Konversi DOCX ke LaTeX tidak selalu sempurna untuk persamaan, tabel, dan sitasi yang kompleks.

**Developer:** EK Instrumentation  
**Repository:** https://github.com/efendiyhy/ek-tex  
**Versi:** 2.7.0
