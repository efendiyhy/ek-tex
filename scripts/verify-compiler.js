'use strict';
// Real pdfLaTeX + latexmk regression: nested \include output and PDF.
// Runs in a disposable directory, never modifies user projects.
const fs=require('fs'),os=require('os'),path=require('path');
const {spawnSync}=require('child_process');
const {prepareIncludeAuxDirectories}=require('../lib/latex-build-dirs');
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'latexstudio-verify-'));
try {
  fs.mkdirSync(path.join(dir,'Isi','Sub'),{recursive:true});
  fs.mkdirSync(path.join(dir,'parts'),{recursive:true});
  fs.writeFileSync(path.join(dir,'check.tex'),String.raw`\documentclass{report}
\begin{document}
\tableofcontents
\include{Isi/Bab1}
\input{parts/chapters}
\end{document}
`);
  fs.writeFileSync(path.join(dir,'Isi','Bab1.tex'),String.raw`\chapter{Bab Pertama}
Tes pertama.
`);
  fs.writeFileSync(path.join(dir,'parts','chapters.tex'),String.raw`\include{Isi/Sub/Bab2}
`);
  fs.writeFileSync(path.join(dir,'Isi','Sub','Bab2.tex'),String.raw`\chapter{Bab Kedua}
Tes kedua.
`);
  const out=path.join(dir,'.latexstudio-build');
  prepareIncludeAuxDirectories(dir,'check.tex',out);
  const result=spawnSync('latexmk',['-pdf','-interaction=nonstopmode','-file-line-error','-halt-on-error','-no-shell-escape','-outdir='+out,'-cd','check.tex'],{cwd:dir,timeout:180000,encoding:'utf8',windowsHide:true,maxBuffer:1024*1024*4});
  const expected=['check.pdf','Isi/Bab1.aux','Isi/Sub/Bab2.aux'];
  const missing=expected.filter(f=>!fs.existsSync(path.join(out,f)));
  if(result.error||result.status!==0||missing.length){
    console.error('Compile verification failed. Missing: '+missing.join(', '));
    console.error(result.error?.message||'');
    console.error((result.stderr||result.stdout||'').slice(-6500));
    process.exitCode=1;
  } else console.log('[OK] latexmk menghasilkan PDF dan berkas .aux di subfolder Isi/ dan Isi/Sub/.');
} finally {fs.rmSync(dir,{recursive:true,force:true})}
