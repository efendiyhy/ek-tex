#!/usr/bin/env bash
# Requires apt-based Linux (Debian, Ubuntu, Armbian, Orange Pi Debian/Ubuntu).
set -euo pipefail
cd "$(dirname "$(readlink -f "$0")")"
if ! command -v apt-get >/dev/null 2>&1; then
  echo '[ERROR] Installer otomatis saat ini hanya untuk distro apt (Ubuntu/Debian/Armbian).'
  echo 'Instal Node.js 18+, texlive-latex-extra, texlive-fonts-recommended, latexmk, texlive-xetex, texlive-luatex, biber melalui package manager distro Anda.'
  exit 1
fi
packages=()
command -v node >/dev/null 2>&1 || packages+=(nodejs)
command -v latexmk >/dev/null 2>&1 || packages+=(latexmk)
command -v pdflatex >/dev/null 2>&1 || packages+=(texlive-latex-base)
command -v xelatex >/dev/null 2>&1 || packages+=(texlive-xetex)
command -v lualatex >/dev/null 2>&1 || packages+=(texlive-luatex)
command -v biber >/dev/null 2>&1 || packages+=(biber)
# Templates rely on the following common LaTeX packages.
if ! command -v kpsewhich >/dev/null 2>&1 || ! kpsewhich lmodern.sty >/dev/null 2>&1 || ! kpsewhich geometry.sty >/dev/null 2>&1 || ! kpsewhich beamer.cls >/dev/null 2>&1; then
  packages+=(texlive-latex-recommended texlive-latex-extra texlive-fonts-recommended lmodern)
fi
if ((${#packages[@]})); then
  printf 'Paket yang akan dipasang: %s\n' "${packages[*]}"
  echo 'Perlu internet, ruang disk (bisa >1 GB), dan izin sudo.'
  if [[ "${1:-}" != '--yes' && "${1:-}" != '--start' ]]; then
    read -r -p 'Lanjutkan instalasi? [Y/n] ' answer
    case "${answer:-Y}" in Y|y|yes|YES|ya) ;; *) echo 'Instalasi dibatalkan.'; exit 1;; esac
  fi
  if (( EUID == 0 )); then run=( ); else run=(sudo); fi
  "${run[@]}" apt-get update
  DEBIAN_FRONTEND=noninteractive "${run[@]}" apt-get install -y "${packages[@]}"
fi
node scripts/verify-compiler.js
echo '[OK] LaTeXStudio siap digunakan.'
