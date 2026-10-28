'use strict';
// Smoke test compiles a real minimal PDF using installed latexmk; does not touch projects.
const fs=require('fs'),os=require('os'),path=require('path');
const {spawnSync}=require('child_process');
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'latexstudio-verify-'));
try {
  fs.writeFileSync(path.join(dir,'check.tex'),'\\documentclass{article}\n\\begin{document}\nLaTeXStudio ready! $E=mc^2$.\n\\end{document}\n');
  const result=spawnSync('latexmk',['-pdf','-interaction=nonstopmode','-halt-on-error','-no-shell-escape','check.tex'],{cwd:dir,timeout:180000,encoding:'utf8',windowsHide:true,maxBuffer:1024*1024*4});
  const good=!result.error&&result.status===0&&fs.existsSync(path.join(dir,'check.pdf'));
  if(!good){console.error('Compile verification failed.');console.error(result.error?.message||'');console.error((result.stderr||result.stdout||'').slice(-6500));process.exitCode=1}
  else console.log('[OK] latexmk menghasilkan check.pdf.');
} finally {fs.rmSync(dir,{recursive:true,force:true})}
