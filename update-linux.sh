#!/usr/bin/env bash
# EK TeX - safe GitHub update. Does not touch workspace/.
set -euo pipefail
cd "$(dirname "$(readlink -f "$0")")"
if [[ ! -d .git ]]; then
  echo '[ERROR] Folder ini bukan hasil git clone.'
  echo 'Untuk instalasi dari ZIP: download ZIP terbaru, ganti file program, tetapi pertahankan workspace/.'
  exit 1
fi
if [[ -n "$(git status --porcelain --untracked-files=no)" ]]; then
  echo '[ERROR] Ada perubahan pada source code lokal. Commit atau backup perubahan sebelum update.'
  exit 1
fi
echo '[EK TeX] Mengambil update dari https://github.com/efendiyhy/ek-tex ...'
git pull --ff-only origin main
echo '[OK] Pembaruan selesai. Proyek di workspace/ tetap tersimpan.'
echo 'Jalankan aplikasi dengan: ./start-linux.sh'
