# EK TeX

**Local LaTeX workspace for scientific writing.**  
Developed by **EK Instrumentation**.

![EK TeX cat logo](public/cat-logo.svg)

EK TeX adalah editor LaTeX berbasis browser yang dijalankan pada komputer sendiri. Halaman awal menampilkan daftar proyek; setelah memilih proyek, pengguna dapat mengedit file `.tex`, mengelola BibTeX, melakukan kompilasi PDF, dan melihat pratinjau di sebelah editor.

## Fitur utama

- **Project dashboard:** buat, buka, cari, dan impor proyek ZIP.
- **Source editor:** penyuntingan banyak file, autosave, pencarian, backup lokal, dan sidebar yang bisa diminimalkan (`Ctrl+B`).
- **PDF compiler:** pdfLaTeX, XeLaTeX, dan LuaLaTeX menggunakan `latexmk`; log langsung, navigasi error ke nomor baris, Stop Compile, dan Clean & Recompile.
- **Bibliografi:** pencarian Crossref melalui judul/DOI dan pembaruan metadata `references.bib`.
- **Debugger bawaan:** identifikasi beberapa masalah umum dari log, termasuk paket `.sty` yang tidak ditemukan, font, dan perintah LaTeX yang tidak dikenal. Memberikan langkah perbaikan—**tidak menjalankan `sudo apt` diam-diam**.
- **Hermes Agent (opsional):** jika perintah `hermes` tersedia dan model telah dikonfigurasi, pengguna dapat meminta analisis AI pada log/error dan file `.tex`. Perubahan yang diusulkan ditampilkan sebagai perbandingan teks lama/baru, **memerlukan persetujuan untuk diterapkan**, dan file awal dibackup. Jika berkas berubah sejak saran dibuat, penerapan ditolak.
- **Document converter:** Pandoc untuk DOCX / ODT / Markdown / HTML / LaTeX menuju `.tex`, `.docx`, `.md`, atau `.html`. File `.tex` disimpan pada subfolder baru `imports/` dalam proyek dan gambar DOCX diekstrak ke `media/`. Konversi ke format lain diunduh sebagai file.

## Instalasi Windows

**Instal dari GitHub (disarankan):** jalankan Windows PowerShell:

```powershell
$setup = Join-Path $env:TEMP 'ek-tex-install.ps1'
Invoke-WebRequest 'https://raw.githubusercontent.com/efendiyhy/ek-tex/main/install-from-github.ps1' -OutFile $setup
powershell -NoProfile -ExecutionPolicy Bypass -File $setup
```

Atau unduh **Code → Download ZIP** dari [repository EK TeX](https://github.com/efendiyhy/ek-tex), ekstrak, lalu jalankan `install-windows.bat`.

Installer menempatkan aplikasi di **Documents\EK-TeX**, memeriksa Node.js, MiKTeX, Perl/latexmk, serta memasang **Pandoc** melalui WinGet jika belum tersedia. Paket LaTeX lain dapat diunduh oleh MiKTeX saat diperlukan. Koneksi internet, WinGet, dan kadang izin administrator diperlukan untuk instalasi pertama. Hermes **tidak dipasang otomatis** karena memerlukan pengaturan model/provider tersendiri.

Shortcut **EK TeX** akan dibuat di Desktop dan Start Menu. Menjalankan shortcut membuka terminal server yang tetap terlihat. Untuk berhenti, tekan **Ctrl+C** pada terminal.

## Instalasi Ubuntu / Debian

```bash
sudo apt update
sudo apt install -y git
mkdir -p ~/Documents
cd ~/Documents
git clone https://github.com/efendiyhy/ek-tex.git EK-TeX
cd EK-TeX
chmod +x setup-linux.sh start-linux.sh update-linux.sh
./start-linux.sh
```

Script akan memeriksa Node.js, TeX Live, `latexmk`, `biber`, `texlive-science` (termasuk `algorithmic.sty`), dan **Pandoc**, lalu memasang yang belum ada memakai `apt`. Instalasi pertama membutuhkan internet dan ruang disk yang cukup. Script Linux menggunakan `apt`, sehingga tidak otomatis cocok untuk Fedora/Arch.

Setelah instalasi pertama, jalankan lagi dengan:

```bash
cd ~/Documents/EK-TeX
./start-linux.sh
```

Aplikasi tersedia di **http://127.0.0.1:3457**. Terminal harus tetap terbuka selama server digunakan; hentikan dengan **Ctrl+C**. Shortcut Desktop otomatis saat ini disediakan oleh installer Windows, bukan Linux.

## Pembaruan dari GitHub

Hentikan server terlebih dahulu menggunakan **Ctrl+C**. Pembaruan kode tidak dirancang untuk menghapus proyek yang tersimpan di `workspace/`, namun backup proyek penting tetap disarankan.

**Windows** — klik dua kali `update-windows.cmd` dalam folder `Documents\EK-TeX`, kemudian buka aplikasi melalui shortcut Desktop atau Start Menu. Alternatif PowerShell:

```powershell
& (Join-Path ([Environment]::GetFolderPath('MyDocuments')) 'EK-TeX\update-windows.cmd')
```

**Ubuntu / Debian** — pada instalasi yang berasal dari `git clone`:

```bash
cd ~/Documents/EK-TeX
./update-linux.sh
./start-linux.sh
```

Jika versi yang digunakan masih belum memiliki `update-linux.sh`, pakai `git pull --ff-only origin main` untuk pembaruan pertama. Jika instalasi berasal dari **Download ZIP**, unduh paket terbaru dan ganti file aplikasi saja, **jangan timpa `workspace/`**. Hindari menjalankan `git pull` jika terdapat perubahan source lokal yang belum disimpan.

## Debugger dan saran perbaikan Hermes

1. Buka salah satu proyek, lalu **Compile** seperti biasa.
2. Klik **⚑ Debug** pada panel Compile Log atau buka sidebar **✦ Debug & Convert**, lalu **Analisis error LaTeX**.
3. Debugger bawaan menampilkan penjelasan dan, bila diketahui, perintah instalasi paket yang hilang.
4. Jika Hermes Agent sudah terpasang dan berfungsi, klik **Minta saran perbaikan AI**. Tinjau penjelasan dan teks pengganti yang disarankan sebelum memilih **Terapkan perbaikan**.
5. Periksa hasilnya lalu jalankan **Clean & Recompile**. Perbaikan AI tidak menjamin semua error atau ketidaktepatan akademik teratasi.

Contoh jika `algorithmic.sty` tidak ditemukan di Ubuntu:

```bash
sudo apt install -y texlive-science
```

**Hermes bersifat opsional.** EK TeX hanya memanggil Hermes bila pengguna menekan tombol diagnosis AI. File dan cuplikan log terkait akan dikirimkan ke model/provider Hermes yang dikonfigurasi pada komputer; koneksi dan kebijakan privasi mengikuti pengaturan Hermes. EK TeX tidak memasukkan API key ke source. Proses Hermes berjalan dengan hak akses pengguna sistem; gunakan hanya pada komputer dan dokumen tepercaya. EK TeX tidak memberikan akses tulis melalui API saran, tetapi tidak dapat menjamin Hermes tidak memiliki alat/izin lain melalui konfigurasi miliknya.

Untuk menyiapkan Hermes secara terpisah, ikuti [dokumentasi Hermes Agent](https://hermes-agent.nousresearch.com/docs), lalu pastikan:

```bash
hermes --version
hermes chat --oneshot -q "Hello"
```

Jika belum dikonfigurasi, selesaikan `hermes setup --portal` atau metode model/provider lain sesuai instalasi Anda. Hermes dapat membutuhkan internet atau server model lokal, tergantung provider. Jika Hermes tidak tersedia, debugger berbasis aturan tetap berfungsi tanpa AI.

## Converter dokumen

Buka proyek → sidebar **✦ Debug & Convert** → **Konversi DOCX / LaTeX / Markdown** → pilih file dan output. `DOCX → LaTeX` menghasilkan file baru seperti `imports/nama-file-xxxxx/converted.tex`, termasuk media bila tersedia. File lain tidak ditimpa.

- Input: `.docx`, `.odt`, `.md`, `.markdown`, `.html`, `.htm`, `.tex` (maks. 12 MB).
- Output: `.tex`, `.docx`, `.md`, `.html`.
- Konversi `.tex` ke Word tidak selalu mempertahankan macro khusus, layout jurnal, bibliografi, atau gambar yang bergantung pada file lain.
- Persamaan, tabel kompleks, style Word, dan citations perlu diperiksa manual setelah konversi. **Pandoc bukan penyalin tata letak 1:1.**

Jika Pandoc sudah terinstal tetapi tidak terdeteksi, tutup dan buka kembali terminal/shortcut supaya PATH diperbarui. Cek dengan `pandoc --version`.

## Data dan pemeliharaan

- Workspace lokal: `Documents/EK-TeX/workspace` (Windows) atau `~/Documents/EK-TeX/workspace` (Ubuntu dengan instruksi di atas).
- Backup file sebelum penerapan AI: `workspace/<proyek>/.latexstudio-backups/`.
- File kompilasi sementara: `workspace/<proyek>/.latexstudio-build/`.
- Server hanya mengikat ke `127.0.0.1:3457`; tidak menyediakan akun, sinkronisasi cloud, atau kolaborasi real-time.
- Tidak disarankan menggunakan dokumen atau arsip yang tidak dipercaya karena proses LaTeX, Pandoc, dan agent berjalan sebagai proses lokal pengguna.

Pengujian source (dengan Node.js): `npm test`. Pengujian kompilasi: `npm run verify-latex`.

---

**EK TeX** · Developed by **EK Instrumentation**  
[github.com/efendiyhy/ek-tex](https://github.com/efendiyhy/ek-tex)
