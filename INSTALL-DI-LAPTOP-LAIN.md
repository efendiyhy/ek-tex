# Instal LaTeXStudio Local di laptop Windows lain

## A. Cara paling mudah (tanpa Git)

1. Buka halaman repository LaTeXStudio Local di GitHub.
2. Klik **Code → Download ZIP** lalu **Extract All**.
3. Pindahkan folder hasil ekstrak ke lokasi permanen, misalnya `C:\LaTeXStudio`.
4. Klik dua kali **`install-windows.bat`**. Saat muncul pertanyaan install, pilih **Y**.
5. Windows memakai `winget` untuk Node.js LTS, MiKTeX, dan Strawberry Perl. Installer kemudian menyiapkan `latexmk` dan menguji kompilasi ke PDF. Proses memerlukan internet; beberapa paket cukup besar.
6. Setelah selesai, ada shortcut **LaTeXStudio Local** di Desktop dan Start Menu.

**Saat menjalankan:** klik shortcut → terminal LaTeXStudio muncul dan browser membuka `http://127.0.0.1:3457` → pilih proyek pada dashboard.

**Saat selesai:** tekan **Ctrl+C** di terminal. Jika Windows menampilkan `Terminate batch job (Y/N)?`, ketik **Y** dan Enter. Anda juga bisa menutup jendela terminal (server lokal ikut berhenti). Jika hanya menutup tab browser, server tetap berjalan di terminal.

Tidak ada layanan background, Windows Service, atau autostart yang dibuat.

## B. Install dari GitHub via PowerShell (tanpa Git)

Hanya untuk repository PUBLIC; ubah `USERNAME` dan nama repo:

```powershell
$repo = 'USERNAME/LaTeXStudio-Local'
$file = "$env:TEMP\install-latexstudio.ps1"
Invoke-WebRequest "https://raw.githubusercontent.com/$repo/main/install-from-github.ps1" -OutFile $file
powershell -NoProfile -ExecutionPolicy Bypass -File $file -Repository $repo
```

Kode aplikasi terpasang di `%LOCALAPPDATA%\Programs\LaTeXStudioLocal`. Shortcut Desktop dan Start Menu otomatis diarahkan ke lokasi ini.

**Keamanan:** periksa isi source dan skrip installer GitHub sebelum menjalankannya. Skrip hanya diperuntukkan bagi repo yang Anda kontrol/percaya.

## C. Update dari GitHub

1. Tutup terminal LaTeXStudio pada laptop yang akan diperbarui.
2. Buka folder aplikasi (`%LOCALAPPDATA%\Programs\LaTeXStudioLocal` jika menggunakan metode B).
3. Klik dua kali **`update-windows.cmd`**. Repository yang digunakan tersimpan di `.latexstudio-install.json` (file ini diabaikan Git).
4. File program diperbarui, shortcut diperiksa ulang, folder **`workspace/` tidak ditimpa atau dihapus**.

Jika sebelumnya hanya mengunduh ZIP (bukan metode GitHub), update dengan ZIP versi baru; salin `workspace/` dari versi lama **setelah server ditutup** dan backup terlebih dahulu.

## D. Masalah umum

| Masalah | Solusi |
|---|---|
| `winget` tidak ditemukan | Update **App Installer** dari Microsoft Store, restart PowerShell, lalu jalankan installer kembali. |
| Instalasi MiKTeX meminta izin administrator | Izinkan elevasi dengan akun Windows Anda. Pastikan internet dan disk memadai. |
| `latexmk belum terpasang` | Ulangi `install-windows.bat`. Jika gagal, buka **MiKTeX Console → Packages → latexmk → Install**, lalu ulangi. |
| Node sudah terpasang tapi `node.exe` belum ditemukan | Buka terminal baru; `run-windows.ps1` memuat PATH terbaru otomatis. Jika perlu restart Windows. |
| Shortcut salah lokasi setelah memindah folder | Jalankan `install-windows.bat` lagi di lokasi folder baru. |
| Browser gagal membuka website | Pastikan terminal masih berjalan dan buka `http://127.0.0.1:3457` manual. Periksa apakah port 3457 dipakai aplikasi lain. |
| Preview PDF gagal | Buka **Compile Log** di editor. Jalankan `node scripts/verify-compiler.js` pada terminal. |

## E. Cadangkan dokumen

Semua paper, template yang diedit, dan file `.bib` disimpan dalam `workspace/`. **Backup folder ini secara berkala** ke disk eksternal / folder sinkronisasi pribadi Anda. Folder `workspace/` tidak akan didorong ke GitHub oleh konfigurasi bawaan.

## F. Verifikasi manual

```powershell
node --version
latexmk -v
pdflatex --version
perl --version
```

Jika compiler tersedia, Anda dapat menjalankan `node scripts/verify-compiler.js` dari folder aplikasi. Hasil yang diharapkan: `[OK] latexmk menghasilkan check.pdf.`.
