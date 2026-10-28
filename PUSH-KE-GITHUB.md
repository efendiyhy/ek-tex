# Panduan push LaTeXStudio ke GitHub

## A. Persiapan

1. Unduh dan ekstrak paket `LaTeXStudio-Local-v2.1-GitHub.zip` ke folder `C:\LaTeXStudio`, atau gabungkan paket tambahan ke folder v2.0.
2. Buat repository GitHub **baru dan kosong**. Contoh nama: `LaTeXStudio-Local`; jangan centang inisialisasi README agar tidak ada konflik commit pertama.
3. Jika Git belum ada, instal dari https://git-scm.com/download/win atau `winget install --id Git.Git -e --source winget`.
4. Buka PowerShell pada direktori ekstrak (folder yang mengandung `server.js`).

## B. Kirim source code

Ganti `USERNAME` dengan username/organisasi GitHub Anda:

```powershell
cd C:\LaTeXStudio
git init
git branch -M main
git add .
git status --short
git commit -m "Initial release LaTeXStudio Local v2.1"
git remote add origin https://github.com/USERNAME/LaTeXStudio-Local.git
git push -u origin main
```

`git status --short` **tidak boleh** memuat `workspace/<nama-proyek>/...`. File `.gitignore` akan mengabaikan folder tersebut; hanya `workspace/.gitkeep` yang boleh muncul. Jika proyek sudah pernah ditambahkan ke Git sebelum ada `.gitignore`, hapus dari index dengan `git rm -r --cached workspace` dan ulangi `git add workspace/.gitkeep` (file di komputer tetap ada).

Jika Git meminta login, gunakan autentikasi GitHub (browser/Git Credential Manager), bukan password akun biasa.

Jika muncul `remote origin already exists`, cek `git remote -v` dan ganti dengan `git remote set-url origin https://github.com/USERNAME/LaTeXStudio-Local.git` **hanya jika yakin repository tujuan benar**.

Jika repo tidak kosong dan muncul `non-fast-forward`, jangan gunakan `git push --force`; cek riwayat dahulu atau gunakan repo baru yang kosong.

## C. Perbarui setelah edit program

```powershell
git status
git add .
git commit -m "Update LaTeXStudio"
git push origin main
```

Disarankan menjalankan `npm test` sebelum push. Proyek lokal dalam `workspace/` tetap tidak ikut.

## D. Cara install di laptop lain

Pilihan mudah: **GitHub → Code → Download ZIP → Extract → klik `install-windows.bat`**.

Atau instal dari public GitHub dengan PowerShell, tanpa Git:

```powershell
$repo = 'USERNAME/LaTeXStudio-Local'
$installer = Join-Path $env:TEMP 'install-latexstudio.ps1'
Invoke-WebRequest "https://raw.githubusercontent.com/$repo/main/install-from-github.ps1" -OutFile $installer
powershell -NoProfile -ExecutionPolicy Bypass -File $installer -Repository $repo
```

Shortcut `LaTeXStudio Local` otomatis muncul di Desktop dan Start Menu setelah instalasi selesai. Saat digunakan, jendela terminal terbuka: **Ctrl+C** untuk stop. Internet diperlukan ketika mengunduh source dan memasang dependensi.

## E. Mengatur source publik

Jangan memasukkan private token/API key, berkas riset/data pribadi, password, atau isi `workspace/` ke repository publik. LaTeXStudio dapat dijalankan local tanpa mengunggah dokumen ke layanan cloud.
