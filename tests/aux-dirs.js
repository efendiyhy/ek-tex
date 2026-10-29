'use strict';
const fs=require('fs');
const os=require('os');
const path=require('path');
const assert=require('node:assert/strict');
const {prepareIncludeAuxDirectories,parseSourceReferences}=require('../lib/latex-build-dirs');
const root=fs.mkdtempSync(path.join(os.tmpdir(),'ektex-aux-'));
const add=(file,content)=>{const p=path.join(root,file);fs.mkdirSync(path.dirname(p),{recursive:true});fs.writeFileSync(p,content)};
try{
  add('main.tex',String.raw`\documentclass{report}
% \include{Commented/Out}
\begin{document}
\include{Isi/Bab1}
\include{Isi/Sub/Bab2}
\input{parts/second}
\end{document}
`);
  add('Isi/Bab1.tex','Chapter 1');
  add('Isi/Sub/Bab2.tex','Chapter 2');
  add('parts/second.tex',String.raw`\include{Lampiran/AppendixA}
\include{../unsafe/try}
\include{/tmp/absolute/file}
\include{Hidden/../../traversal}
\include{Isi/Bab1}
% \include{NotAReal/Chapter}
`);
  add('Lampiran/AppendixA.tex','Appendix');
  const dirs=path.join(root,'.latexstudio-build');
  let result=prepareIncludeAuxDirectories(root,'main.tex');
  assert.deepEqual(result.folders,['Isi','Isi/Sub','Lampiran','parts']);
  assert.equal(result.filesScanned,5);
  for(const p of result.folders)assert(fs.statSync(path.join(dirs,p)).isDirectory());
  assert(!fs.existsSync(path.join(dirs,'Commented')));
  assert(!fs.existsSync(path.join(dirs,'NotAReal')));
  assert(!fs.existsSync(path.join(root,'unsafe')));
  assert(!fs.existsSync(path.join(root,'traversal')));
  // Clean & Recompile must rebuild exactly the directories it needs.
  fs.rmSync(dirs,{recursive:true,force:true});
  assert.equal(prepareIncludeAuxDirectories(root,'main.tex').folders.length,4);
  assert(fs.existsSync(path.join(dirs,'Isi/Sub')));
  assert.deepEqual(parseSourceReferences(String.raw`\% escaped \include{A/B}
% \include{Ignored/C}
`),[{kind:'include',target:'A/B'}]);
  // Refuse to write through symlinks already present inside the build output.
  fs.rmSync(path.join(dirs,'Isi'),{recursive:true,force:true});
  fs.symlinkSync(root,path.join(dirs,'Isi'),'dir');
  assert.throws(()=>prepareIncludeAuxDirectories(root,'main.tex'),/tidak aman/);
  console.log('[PASS] AUX directories: nested includes, nested inputs, clean reset, comments, traversal and symlink protection');
}finally{fs.rmSync(root,{recursive:true,force:true})}
