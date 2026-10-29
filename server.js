'use strict';
// LaTeXStudio Local — no npm dependencies. Local-only API and static assets.
const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const {spawn, spawnSync} = require('child_process');
const ROOT = __dirname;
const PUBLIC = path.join(ROOT, 'public');
const WORKSPACE = path.join(ROOT, 'workspace');
const PORT = Number(process.env.PORT) || 3457;
const HOST = '127.0.0.1';
const TEXT_EXT = new Set(['.tex','.bib','.sty','.cls','.txt','.md','.csv','.json','.tikz','.pgf','.def','.cfg','.bst','.latexmkrc']);
const UPLOAD_EXT = new Set([...TEXT_EXT,'.png','.jpg','.jpeg','.pdf','.svg','.eps','.webp','.dat']);
fs.mkdirSync(WORKSPACE,{recursive:true});
const fail = (status,message) => Object.assign(new Error(message), {status});
function safeProject(id){
  if (!/^[a-z0-9][a-z0-9_-]{0,63}$/.test(id)) throw fail(400,'ID proyek tidak valid.');
  const d=path.join(WORKSPACE,id);
  if (!fs.existsSync(d)||!fs.statSync(d).isDirectory())throw fail(404,'Proyek tidak ditemukan.');
  return d;
}
function safePath(base,rel){
  if(typeof rel!=='string'||!rel||rel.includes('\0')||rel.includes('\\')||path.isAbsolute(rel)||rel.split('/').some(p=>!p||p==='.'||p==='..'||p.startsWith('.latexstudio')))throw fail(400,'Path tidak diizinkan.');
  const target=path.resolve(base,rel); if(!target.startsWith(base+path.sep))throw fail(400,'Path di luar proyek.');
  // Don't follow symlinks: walk each existing component, not just the final path.
  let cur=base;
  for(const part of rel.split('/')){cur=path.join(cur,part); if(fs.existsSync(cur)&&fs.lstatSync(cur).isSymbolicLink())throw fail(400,'Symlink tidak diperbolehkan.');}
  return target;
}
function send(res,status,data,headers={}){
  const body=Buffer.from(typeof data==='string'?data:JSON.stringify(data));
  res.writeHead(status,{'Content-Type':typeof data==='string'?'text/plain; charset=utf-8':'application/json; charset=utf-8','Content-Length':body.length,'Cache-Control':'no-store','X-Content-Type-Options':'nosniff',...headers});res.end(body);
}
const json=(res,data,status=200)=>send(res,status,data);
function body(req,limit=20*1024*1024){return new Promise((resolve,reject)=>{
  let size=0,parts=[];
  req.on('data',ch=>{size+=ch.length;if(size>limit){reject(fail(413,'Ukuran data terlalu besar.'));req.destroy();return;}parts.push(ch)});
  req.on('end',()=>{try{resolve(JSON.parse(Buffer.concat(parts).toString('utf8')||'{}'));}catch{reject(fail(400,'JSON tidak valid.'));}});
  req.on('error',reject);
});}
function slug(str){return String(str||'').toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,48)||'proyek';}
function template(which,title){
 const esc=title.replace(/[{}\\%$&#_]/g,'').slice(0,90);
 const common=`\\usepackage[utf8]{inputenc}\n\\usepackage[T1]{fontenc}\n\\usepackage{lmodern}\n\\usepackage{graphicx}\n\\usepackage{amsmath,amssymb}\n\\usepackage{hyperref}\n`;
 if(which==='beamer')return `\\documentclass[aspectratio=169]{beamer}\n\\usetheme{Madrid}\n\\usepackage[utf8]{inputenc}\n\\usepackage{amsmath,graphicx}\n\\title{${esc}}\n\\author{Nama Penulis}\n\\date{\\today}\n\n\\begin{document}\n\\begin{frame}\n  \\titlepage\n\\end{frame}\n\n\\begin{frame}{Pendahuluan}\n  \\begin{itemize}\n    \\item Poin pertama\n    \\item Poin kedua\n  \\end{itemize}\n\\end{frame}\n\\end{document}\n`;
 if(which==='thesis')return `\\documentclass[12pt,a4paper,oneside]{report}\n${common}\\usepackage[margin=3cm]{geometry}\n\\title{${esc}}\n\\author{Nama Penulis}\n\\date{\\today}\n\\begin{document}\n\\maketitle\n\\tableofcontents\n\\chapter{Pendahuluan}\nTulis latar belakang penelitian Anda di sini.\n\\chapter{Metodologi}\nContoh persamaan:\n\\begin{equation}\n  \\frac{dx}{dt}=ax-bx^2.\n\\end{equation}\n\\chapter{Hasil dan Pembahasan}\nHasil penelitian.\n% Aktifkan jika menggunakan sitasi (memerlukan BibTeX):\n% \\bibliographystyle{plain}\n% \\bibliography{references}\n\\end{document}\n`;
 if(which==='report')return `\\documentclass[11pt,a4paper]{report}\n${common}\\title{${esc}}\n\\author{Nama Penulis}\n\\date{\\today}\n\\begin{document}\n\\maketitle\n\\tableofcontents\n\\chapter{Pendahuluan}\nMulai menulis laporan Anda di sini.\n\\chapter{Hasil}\nContoh: $E=mc^2$.\n% Aktifkan jika menggunakan sitasi (memerlukan BibTeX):\n% \\bibliographystyle{plain}\n% \\bibliography{references}\n\\end{document}\n`;
 return `\\documentclass[11pt,a4paper]{article}\n${common}\\usepackage[margin=2.8cm]{geometry}\n\\title{${esc}}\n\\author{Nama Penulis} \n\\date{\\today}\n\n\\begin{document}\n\\maketitle\n\n\\begin{abstract}\nTulis abstrak artikel Anda di sini.\n\\end{abstract}\n\n\\section{Introduction}\nSelamat datang di LaTeXStudio Local! Edit teks dan klik \\textbf{Compile} untuk menghasilkan PDF.\n\n\\section{Methods}\nContoh persamaan matematis:\n\\begin{equation}\n  E = mc^2 \\label{eq:einstein}\n\\end{equation}\nRujuk Persamaan~\\eqref{eq:einstein}.\n\n\\section{Results and Discussion}\nTulis pembahasan di sini. Tambahkan kutipan melalui menu Cite, misalnya: % \\cite{lamport1994}\n\n\\section{Conclusion}\nKesimpulan penelitian.\n\n% Aktifkan jika menggunakan sitasi (memerlukan BibTeX):\n% \\bibliographystyle{plain}\n% \\bibliography{references}\n\\end{document}\n`;
}
const SAMPLE_BIB=`@book{lamport1994,\n  author = {Leslie Lamport},\n  title = {LaTeX: A Document Preparation System},\n  publisher = {Addison-Wesley},\n  year = {1994},\n  edition = {2}\n}\n`;
function listProjects(){return fs.readdirSync(WORKSPACE,{withFileTypes:true}).filter(d=>d.isDirectory()&&/^[a-z0-9][a-z0-9_-]{0,63}$/.test(d.name)).map(d=>{
  const dir=path.join(WORKSPACE,d.name);let info={name:d.name,main:'main.tex'};
  try{info={...info,...JSON.parse(fs.readFileSync(path.join(dir,'.latexstudio.json'),'utf8'))}}catch{}
  const dates=[fs.statSync(dir).mtimeMs];for(const f of [info.main||'main.tex','.latexstudio.json']){try{dates.push(fs.statSync(path.join(dir,f)).mtimeMs)}catch{}}
  return {id:d.name,name:info.name,main:info.main||'main.tex',updated:Math.max(...dates)};
 }).sort((a,b)=>b.updated-a.updated);}
function createProject(name,kind='article'){
 name=String(name||'Untitled').trim().slice(0,100);kind=['article','report','thesis','beamer','blank'].includes(kind)?kind:'article';
 let id=slug(name),n=2;while(fs.existsSync(path.join(WORKSPACE,id)))id=slug(name).slice(0,42)+'-'+n++;
 const dir=path.join(WORKSPACE,id);fs.mkdirSync(dir);
 fs.writeFileSync(path.join(dir,'main.tex'),kind==='blank'?'% Dokumen LaTeX baru\n':template(kind,name));
 fs.writeFileSync(path.join(dir,'references.bib'),SAMPLE_BIB);
 fs.writeFileSync(path.join(dir,'.latexstudio.json'),JSON.stringify({name,main:'main.tex',engine:'pdf'},null,2));
 return {id,name,main:'main.tex'};
}
function tree(dir,relative='',depth=0){
 if(depth>6)return [];
 return fs.readdirSync(path.join(dir,relative),{withFileTypes:true}).filter(e=>!e.name.startsWith('.')&&e.name!=='node_modules').map(e=>{
  const rel=[relative,e.name].filter(Boolean).join('/');
  if(e.isSymbolicLink())return null;
  if(e.isDirectory())return {name:e.name,path:rel,type:'folder',children:tree(dir,rel,depth+1)};
  return {name:e.name,path:rel,type:'file',size:fs.statSync(path.join(dir,rel)).size};
 }).filter(Boolean).sort((a,b)=>Number(b.type==='folder')-Number(a.type==='folder')||a.name.localeCompare(b.name));
}
function commandAvailable(cmd){try{const r=spawnSync(cmd,['-version'],{timeout:5500,encoding:'utf8',windowsHide:true});return !r.error&&r.status===0;}catch{return false;}}
// One job per project. /build/status exposes progress without waiting for the POST response.
const buildJobs=new Map();
const BUILD_TIMEOUT_MS=120000;
const MAX_BUILD_LOG=700000;
function removeBuildCache(dir){
 const out=path.join(dir,'.latexstudio-build');
 if(fs.existsSync(out)){
  if(fs.lstatSync(out).isSymbolicLink())throw fail(400,'Folder cache build tidak boleh berupa symlink.');
  fs.rmSync(out,{recursive:true,force:true});
 }
 fs.mkdirSync(out,{recursive:true});
 return out;
}
function appendBuildLog(job,content){
 const str=String(content);
 if(job.log.length>=MAX_BUILD_LOG){if(!job.logTruncated){job.log+='\n[Log terlalu panjang; output selanjutnya tidak ditampilkan.]\n';job.logTruncated=true;}return;}
 job.log+=str.slice(0,MAX_BUILD_LOG-job.log.length);
}
function latexDiagnostics(dir,main,log){
 const logfile=path.join(dir,'.latexstudio-build',path.basename(main,'.tex')+'.log');
 let source=log;
 try{if(fs.existsSync(logfile))source+='\n'+fs.readFileSync(logfile,'utf8').slice(-500000)}catch{}
 const lines=source.split(/\r?\n/),diagnostics=[],seen=new Set();
 for(let i=0;i<lines.length&&diagnostics.length<12;i++){
  const line=lines[i].trim();let file='',number=null,message='';
  let m=line.match(/^(.+?\.tex):(\d+):\s*(.+)$/i);
  if(m){file=m[1].replace(/^\.\//,'');number=Number(m[2]);message=m[3];}
  else if(/^!\s+/.test(line))message=line.replace(/^!\s+/, '');
  else if(/^(?:LaTeX|Package [\w-]+|Class [\w-]+) Error:/.test(line))message=line;
  else if(/^(?:Emergency stop|Fatal error occurred)/i.test(line))message=line;
  if(!message||/^==>/.test(message))continue;
  // Ignore generic latexmk cache-history messages; they are not the underlying LaTeX error.
  if(/gave an error in previous invocation/i.test(message))continue;
  const key=file+':'+number+':'+message;
  if(seen.has(key))continue;seen.add(key);
  // Only allow navigation to project-relative sources (not TeX system paths).
  const navFile=file&&!path.isAbsolute(file)&&!file.includes('..')&&!file.includes('\\')?file:'';
  diagnostics.push({file:navFile,line:number,message:message.slice(0,400)});
 }
 return diagnostics;
}
function stopBuildJob(job,reason){
 if(!job?.running||!job.child)return false;
 if(reason==='user')job.stopped=true;
 if(reason==='timeout')job.timedOut=true;
 try{
  if(process.platform==='win32'){
   // latexmk starts child compiler processes: terminate the full Windows process tree.
   spawn('taskkill',['/PID',String(job.child.pid),'/T','/F'],{windowsHide:true}).on('error',()=>{try{job.child.kill()}catch{}});
  }else{
   // Compiler and its children share a detached process group.
   try{process.kill(-job.child.pid,'SIGTERM')}catch{job.child.kill('SIGTERM')}
   const pid=job.child.pid;
   const force=setTimeout(()=>{if(job.child?.pid===pid){try{process.kill(-pid,'SIGKILL')}catch{}}},3000);force.unref();
  }
 }catch{try{job.child.kill()}catch{}}
 return true;
}
function compileAttempt(job,dir,engine,main){return new Promise(resolve=>{
 const out=path.join(dir,'.latexstudio-build');
 const args=['-'+({pdf:'pdf',xelatex:'xelatex',lualatex:'lualatex'}[engine]||'pdf'),'-interaction=nonstopmode','-file-line-error','-halt-on-error','-no-shell-escape','-outdir='+out,'-cd',main];
 let child,spawnError='';
 try{child=spawn('latexmk',args,{cwd:dir,shell:false,windowsHide:true,detached:process.platform!=='win32',env:{...process.env,max_print_line:'1200'}})}
 catch(e){appendBuildLog(job,'Gagal menjalankan latexmk: '+e.message+'\n');return resolve(-1)}
 job.child=child;
 const timer=setTimeout(()=>{appendBuildLog(job,'\n[Batas waktu 120 detik tercapai, menghentikan compiler.]\n');stopBuildJob(job,'timeout');},BUILD_TIMEOUT_MS);
 const collect=data=>appendBuildLog(job,data.toString('utf8'));
 child.stdout.on('data',collect);child.stderr.on('data',collect);
 child.on('error',e=>{spawnError=e.message;appendBuildLog(job,'\nGagal menjalankan latexmk: '+e.message+'\n')});
 child.on('close',(code)=>{clearTimeout(timer);job.child=null;resolve(spawnError?-1:code??-1)});
});}
async function compile(dir,engine,main,clean=false){
 const id=path.basename(dir),previous=buildJobs.get(id);
 if(previous?.running)return {ok:false,log:'Proyek sedang dikompilasi.',busy:true};
 const job={running:true,log:'',logTruncated:false,child:null,stopped:false,timedOut:false,startedAt:Date.now(),mode:clean?'clean':'normal'};
 buildJobs.set(id,job);
 try{
  if(clean){removeBuildCache(dir);appendBuildLog(job,'[Clean & Recompile] Cache build lama dihapus. File sumber tetap aman.\n\n');}
  else{
   const out=path.join(dir,'.latexstudio-build');
   if(fs.existsSync(out)&&fs.lstatSync(out).isSymbolicLink())throw fail(400,'Folder cache build tidak boleh berupa symlink.');
   fs.mkdirSync(out,{recursive:true});
  }
  let code=await compileAttempt(job,dir,engine,main);
  // When latexmk only remembers a previous failed invocation, retry once from a clean cache.
  const stale=code!==0&&!job.stopped&&!job.timedOut&&/Nothing to do for/i.test(job.log)&&/gave an error in previous invocation/i.test(job.log);
  if(stale){
   appendBuildLog(job,'\n[EK TeX] Error build lama terdeteksi. Membersihkan cache dan mengompilasi ulang otomatis.\n\n');
   removeBuildCache(dir);
   code=await compileAttempt(job,dir,engine,main);
  }
  const out=path.join(dir,'.latexstudio-build'),pdf=path.join(out,path.basename(main,'.tex')+'.pdf');
  const diagnostics=latexDiagnostics(dir,main,job.log);
  const ok=code===0&&!job.stopped&&!job.timedOut&&fs.existsSync(pdf);
  const summary=job.stopped?'Kompilasi dihentikan oleh pengguna.':job.timedOut?'Kompilasi melebihi 120 detik dan dihentikan.':ok?'Kompilasi berhasil.':diagnostics.length?diagnostics[0].message:'Kompilasi gagal. Periksa log untuk mencari penyebabnya.';
  const result={ok,exitCode:code,log:job.log,diagnostics,summary,pdfExists:fs.existsSync(pdf),timestamp:Date.now(),autoCleaned:stale,clean};
  job.result=result;return result;
 }catch(e){appendBuildLog(job,'\n[EK TeX] '+e.message+'\n');const result={ok:false,log:job.log,summary:e.message,diagnostics:[],pdfExists:false};job.result=result;return result;}
 finally{job.running=false;job.child=null;try{fs.writeFileSync(path.join(dir,'.latexstudio-build','build.log'),job.log)}catch{}}
}
function httpsJson(url){return new Promise((resolve,reject)=>{
 const req=https.get(url,{headers:{'Accept':'application/json','User-Agent':'LaTeXStudioLocal/1.0 (local research editor)'},timeout:14000},res=>{
  if(res.statusCode!==200){res.resume();return reject(fail(502,'Crossref memberikan respons HTTP '+res.statusCode));}
  let n=0,chunks=[];res.on('data',c=>{n+=c.length;if(n>3*1024*1024){req.destroy();return;}chunks.push(c)});
  res.on('end',()=>{try{resolve(JSON.parse(Buffer.concat(chunks).toString('utf8')))}catch{reject(fail(502,'Respons metadata tidak valid.'))}});
 });req.on('timeout',()=>req.destroy(new Error('Koneksi ke Crossref timeout')));req.on('error',reject);
});}
function escapeBib(s){return String(s||'').replace(/[\r\n]+/g,' ').replace(/[{}]/g,'').replace(/\\/g,'').replace(/\s+/g,' ').trim();}
function crossrefBib(m){
 const doi=String(m.DOI||'').toLowerCase();const authors=(m.author||[]).map(a=>[a.given,a.family].filter(Boolean).map(escapeBib).join(' ')).join(' and ');
 const year=m.published?.['date-parts']?.[0]?.[0]||m.issued?.['date-parts']?.[0]?.[0]||'';
 const title=escapeBib((m.title||[])[0]||'Untitled');const venue=escapeBib((m['container-title']||[])[0]||'');
 const family=m.author?.[0]?.family||'ref';const key=slug(family).replace(/-/g,'')+(year||'nd')+(doi.replace(/[^a-z0-9]/gi,'').slice(-5));
 let fields={author:authors,title,year,journal:venue,volume:m.volume,number:m.issue,pages:m.page,doi,url:m.URL,publisher:m.publisher};
 const type=m.type==='book'?'book':m.type==='proceedings-article'?'inproceedings':m.type==='book-chapter'?'incollection':'article';
 if(type==='inproceedings'||type==='incollection'){fields.booktitle=fields.journal;delete fields.journal;}
 const bib=`@${type}{${key},\n`+Object.entries(fields).filter(([k,v])=>v).map(([k,v])=>`  ${k} = {${escapeBib(v)}},`).join('\n').replace(/,$/,'')+`\n}\n`;
 return {key,doi,title,authors,year,venue,type,bib};
}
function filesForZip(dir,rel=''){
 let all=[];for(const e of fs.readdirSync(path.join(dir,rel),{withFileTypes:true})){
  if(e.name.startsWith('.latexstudio')||e.name==='node_modules'||e.isSymbolicLink())continue;
  const child=[rel,e.name].filter(Boolean).join('/');
  if(e.isDirectory()){all.push(...filesForZip(dir,child));continue;}
  if(e.isFile()){let b=fs.readFileSync(path.join(dir,child));if(b.length>12*1024*1024)throw fail(413,'Satu file terlalu besar untuk export ZIP.');all.push([child,b]);}
  if(all.length>400)throw fail(413,'Terlalu banyak file untuk ZIP.');
 }return all;
}
// Portable ZIP writer (deflate, UTF-8). No dependency on external zip utility.
const crcTable=(()=>{let t=[];for(let i=0;i<256;i++){let c=i;for(let k=0;k<8;k++)c=(c&1)?0xedb88320^(c>>>1):c>>>1;t.push(c>>>0);}return t;})();
function crc32(b){let c=0xffffffff;for(let x of b)c=crcTable[(c^x)&255]^(c>>>8);return(c^0xffffffff)>>>0;}
function zipFiles(files){let local=[],central=[],offset=0;
 for(const [name,data] of files){const nb=Buffer.from(name),def=zlib.deflateRawSync(data),crc=crc32(data),a=Buffer.alloc(30),b=Buffer.alloc(46);
 a.writeUInt32LE(0x04034b50,0);a.writeUInt16LE(20,4);a.writeUInt16LE(0x800,6);a.writeUInt16LE(8,8);a.writeUInt32LE(crc,14);a.writeUInt32LE(def.length,18);a.writeUInt32LE(data.length,22);a.writeUInt16LE(nb.length,26);
 b.writeUInt32LE(0x02014b50,0);b.writeUInt16LE(20,4);b.writeUInt16LE(20,6);b.writeUInt16LE(0x800,8);b.writeUInt16LE(8,10);b.writeUInt32LE(crc,16);b.writeUInt32LE(def.length,20);b.writeUInt32LE(data.length,24);b.writeUInt16LE(nb.length,28);b.writeUInt32LE(offset,42);
 local.push(a,nb,def);central.push(b,nb);offset+=a.length+nb.length+def.length;}
 const cd=Buffer.concat(central),end=Buffer.alloc(22);end.writeUInt32LE(0x06054b50,0);end.writeUInt16LE(files.length,8);end.writeUInt16LE(files.length,10);end.writeUInt32LE(cd.length,12);end.writeUInt32LE(offset,16);
 return Buffer.concat([...local,cd,end]);
}
// Bounded zip import: detects ZIP slip and ZIP bombs, supports store/deflate.
function unzipArchive(data){
 const b=Buffer.from(data,'base64');if(b.length>15*1024*1024)throw fail(413,'ZIP melebihi 15MB.');
 let eocd=-1;for(let i=b.length-22;i>=Math.max(0,b.length-65557);i--){if(b.readUInt32LE(i)===0x06054b50){eocd=i;break;}}
 if(eocd<0)throw fail(400,'Arsip ZIP tidak valid.');
 const count=b.readUInt16LE(eocd+10),start=b.readUInt32LE(eocd+16);
 if(count>400)throw fail(413,'Terlalu banyak file dalam ZIP.');
 let ptr=start,total=0,files=[];
 for(let i=0;i<count;i++){
  if(ptr+46>b.length||b.readUInt32LE(ptr)!==0x02014b50)throw fail(400,'Central directory ZIP rusak.');
  const flags=b.readUInt16LE(ptr+8),method=b.readUInt16LE(ptr+10),csize=b.readUInt32LE(ptr+20),usize=b.readUInt32LE(ptr+24);
  const nl=b.readUInt16LE(ptr+28),xl=b.readUInt16LE(ptr+30),cl=b.readUInt16LE(ptr+32),off=b.readUInt32LE(ptr+42),mode=b.readUInt32LE(ptr+38)>>>16;
  const name=b.subarray(ptr+46,ptr+46+nl).toString('utf8');ptr+=46+nl+xl+cl;
  if(name.endsWith('/'))continue;
  if(flags&1||![0,8].includes(method)||((mode&0xf000)===0xa000))throw fail(400,'ZIP terenkripsi/symlink tidak didukung.');
  if(usize>12*1024*1024||csize>12*1024*1024||total+usize>28*1024*1024)throw fail(413,'Arsip ZIP terlalu besar.');
  if(!name||name.includes('\\')||name.startsWith('/')||name.split('/').some(p=>!p||p==='.'||p==='..'))throw fail(400,'Path berbahaya dalam ZIP.');
  if(off+30>b.length||b.readUInt32LE(off)!==0x04034b50)throw fail(400,'ZIP file header rusak.');
  const on=b.readUInt16LE(off+26),ox=b.readUInt16LE(off+28),dataStart=off+30+on+ox;
  if(dataStart+csize>b.length)throw fail(400,'ZIP entry tidak lengkap.');
  const compressed=b.subarray(dataStart,dataStart+csize);
  let raw;try{raw=method===8?zlib.inflateRawSync(compressed,{maxOutputLength:12*1024*1024}):compressed;}catch{throw fail(400,'Gagal mendekompresi ZIP.');}
  if(raw.length!==usize)throw fail(400,'Ukuran file dalam ZIP tidak sesuai.');total+=raw.length;files.push([name,raw]);
 }
 if(!files.length)throw fail(400,'ZIP kosong.');
 // One top-level folder is common in exported ZIP projects.
 const top=files[0][0].split('/')[0];if(files.every(([n])=>n.startsWith(top+'/')))files=files.map(([n,b])=>[n.slice(top.length+1),b]);
 return files.filter(([n])=>!n.split('/').some(p=>p.startsWith('.latexstudio')));
}
function importProject(obj){
 if(typeof obj.data!=='string'||obj.data.length>22*1024*1024)throw fail(413,'ZIP terlalu besar.');
 const files=unzipArchive(obj.data);
 const project=createProject(String(obj.name||'Imported LaTeX project'),'blank');const dir=safeProject(project.id);
 try{
  fs.rmSync(path.join(dir,'main.tex'));fs.rmSync(path.join(dir,'references.bib'));
  for(const [name,data] of files){if(!UPLOAD_EXT.has(path.extname(name).toLowerCase()))continue;const target=safePath(dir,name);fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,data);}
  const all=files.filter(([n])=>n.endsWith('.tex')).map(([n])=>n);
  const main=all.includes('main.tex')?'main.tex':all.includes('paper.tex')?'paper.tex':all[0];
  if(!main)throw fail(400,'Tidak ditemukan file .tex dalam ZIP.');
  if(!fs.existsSync(path.join(dir,'references.bib')))fs.writeFileSync(path.join(dir,'references.bib'),'');
  fs.writeFileSync(path.join(dir,'.latexstudio.json'),JSON.stringify({name:project.name,main,engine:'pdf'},null,2));project.main=main;
  return project;
 }catch(e){fs.rmSync(dir,{recursive:true,force:true});throw e;}
}
const backupStamps=new Map();
function snapshotIfDue(dir,rel,file){
 if(!fs.existsSync(file)||!fs.statSync(file).isFile())return;
 const key=dir+'/'+rel,now=Date.now();if(now-(backupStamps.get(key)||0)<5*60*1000)return;
 const back=path.join(dir,'.latexstudio-backups');fs.mkdirSync(back,{recursive:true});
 const name=rel.replace(/[^a-zA-Z0-9._-]/g,'_')+'--'+new Date(now).toISOString().replace(/[:.]/g,'-')+'.bak';
 fs.copyFileSync(file,path.join(back,name));backupStamps.set(key,now);
 const prior=fs.readdirSync(back).filter(n=>n.startsWith(rel.replace(/[^a-zA-Z0-9._-]/g,'_')+'--')).sort().reverse();
 for(const old of prior.slice(10))fs.rmSync(path.join(back,old));
}

const MIME={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'application/javascript; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.ico':'image/x-icon'};
async function router(req,res){
 const url=new URL(req.url,'http://127.0.0.1');const p=url.pathname,method=req.method;
 if(p==='/api/status'&&method==='GET')return json(res,{latexmk:commandAvailable('latexmk'),pdflatex:commandAvailable('pdflatex'),perl:commandAvailable('perl'),bibtex:commandAvailable('bibtex'),xelatex:commandAvailable('xelatex'),lualatex:commandAvailable('lualatex'),node:process.version,workspace:WORKSPACE});
 if(p==='/api/projects'&&method==='GET')return json(res,listProjects());
 if(p==='/api/projects'&&method==='POST'){const d=await body(req);return json(res,createProject(d.name,d.template),201);}
 if(p==='/api/projects/import'&&method==='POST'){const d=await body(req);return json(res,importProject(d),201);}
 if(p==='/api/search'&&method==='GET'){
   const q=String(url.searchParams.get('q')||'').trim().slice(0,250);if(q.length<3)throw fail(400,'Masukkan minimal 3 karakter.');
   const data=await httpsJson('https://api.crossref.org/works?rows=10&query.bibliographic='+encodeURIComponent(q));
   return json(res,(data.message?.items||[]).map(crossrefBib));
 }
 if(p==='/api/doi'&&method==='GET'){
   const doi=String(url.searchParams.get('doi')||'').trim().replace(/^https?:\/\/(?:dx\.)?doi\.org\//i,'').replace(/^doi:/i,'');
   if(!/^10\.\d{4,9}\/\S{1,200}$/i.test(doi))throw fail(400,'Format DOI tidak valid.');
   const data=await httpsJson('https://api.crossref.org/works/'+encodeURIComponent(doi));return json(res,crossrefBib(data.message));
 }
 const control=p.match(/^\/api\/projects\/([a-z0-9_-]+)\/build\/(status|stop)$/);
 if(control){
  const dir=safeProject(control[1]),job=buildJobs.get(path.basename(dir));
  if(control[2]==='status'&&method==='GET')return json(res,job?{running:job.running,log:job.log,startedAt:job.startedAt,summary:job.result?.summary||null,diagnostics:job.result?.diagnostics||[],stopped:job.stopped,timedOut:job.timedOut}:{running:false,log:'',summary:null,diagnostics:[]});
  if(control[2]==='stop'&&method==='POST')return json(res,{stopping:stopBuildJob(job,'user')});
  throw fail(405,'Metode tidak didukung.');
 }
 const m=p.match(/^\/api\/projects\/([a-z0-9_-]+)(?:\/(tree|file|upload|build|pdf|export|config))?$/);
 if(m){const id=m[1],route=m[2]||'',dir=safeProject(id);
  if(route==='tree'&&method==='GET')return json(res,tree(dir));
  if(route==='config'&&method==='GET')return json(res,JSON.parse(fs.readFileSync(path.join(dir,'.latexstudio.json'),'utf8')));
  if(route==='config'&&method==='PATCH'){
   const d=await body(req);const fp=path.join(dir,'.latexstudio.json');const cfg=JSON.parse(fs.readFileSync(fp,'utf8'));
   if(d.name!==undefined)cfg.name=String(d.name).slice(0,100);
   if(d.main!==undefined){const t=safePath(dir,d.main);if(path.extname(t)!=='.tex'||!fs.existsSync(t))throw fail(400,'Main harus file .tex yang ada.');cfg.main=d.main;}
   if(d.engine!==undefined){if(!['pdf','xelatex','lualatex'].includes(d.engine))throw fail(400,'Engine tidak valid.');cfg.engine=d.engine;}
   fs.writeFileSync(fp,JSON.stringify(cfg,null,2));return json(res,cfg);
  }
  if(route==='file'&&method==='GET'){
   const rel=url.searchParams.get('path')||'';const f=safePath(dir,rel);if(!fs.existsSync(f)||!fs.statSync(f).isFile())throw fail(404,'File tidak ditemukan.');
   if(!TEXT_EXT.has(path.extname(f).toLowerCase())&&path.basename(f)!=='.latexmkrc')throw fail(400,'File biner tidak bisa dibuka sebagai teks.');
   if(fs.statSync(f).size>3*1024*1024)throw fail(413,'File terlalu besar untuk editor.');
   return json(res,{path:rel,content:fs.readFileSync(f,'utf8')});
  }
  if(route==='file'&&method==='PUT'){
   const d=await body(req);const f=safePath(dir,d.path);if(!TEXT_EXT.has(path.extname(f).toLowerCase()))throw fail(400,'Hanya file teks yang dapat diedit.');
   if(typeof d.content!=='string'||Buffer.byteLength(d.content,'utf8')>3*1024*1024)throw fail(413,'Konten tidak valid/terlalu besar.');
   fs.mkdirSync(path.dirname(f),{recursive:true});snapshotIfDue(dir,d.path,f);fs.writeFileSync(f,d.content,'utf8');return json(res,{ok:true});
  }
  if(route==='file'&&method==='POST'){
   const d=await body(req);const f=safePath(dir,d.path);const ext=path.extname(f).toLowerCase();if(!TEXT_EXT.has(ext))throw fail(400,'Ekstensi file teks tidak didukung.');
   if(fs.existsSync(f))throw fail(409,'Nama file sudah ada.');fs.mkdirSync(path.dirname(f),{recursive:true});fs.writeFileSync(f,String(d.content||''),'utf8');return json(res,{ok:true},201);
  }
  if(route==='file'&&method==='DELETE'){
   const d=await body(req);const f=safePath(dir,d.path);if(!fs.existsSync(f))throw fail(404,'File tidak ada.');
   if(fs.statSync(f).isDirectory())throw fail(400,'Hapus file satu per satu.');
   const cfg=JSON.parse(fs.readFileSync(path.join(dir,'.latexstudio.json'),'utf8'));if(d.path===cfg.main)throw fail(400,'Tidak boleh menghapus main file.');
   fs.unlinkSync(f);return json(res,{ok:true});
  }
  if(route==='file'&&method==='PATCH'){
   const d=await body(req);const old=safePath(dir,d.path),f=safePath(dir,d.newPath);
   if(!fs.existsSync(old)||!fs.statSync(old).isFile())throw fail(404,'File tidak ada.');
   if(fs.existsSync(f))throw fail(409,'Nama tujuan sudah digunakan.');
   fs.mkdirSync(path.dirname(f),{recursive:true});fs.renameSync(old,f);
   let cfg=JSON.parse(fs.readFileSync(path.join(dir,'.latexstudio.json'),'utf8'));if(cfg.main===d.path){cfg.main=d.newPath;fs.writeFileSync(path.join(dir,'.latexstudio.json'),JSON.stringify(cfg,null,2));}
   return json(res,{ok:true});
  }
  if(route==='upload'&&method==='POST'){
   const d=await body(req);const f=safePath(dir,d.path);if(!UPLOAD_EXT.has(path.extname(f).toLowerCase()))throw fail(400,'Ekstensi file tidak didukung.');
   if(typeof d.data!=='string'||d.data.length>16*1024*1024||!/^[A-Za-z0-9+/]*={0,2}$/.test(d.data))throw fail(413,'Data upload tidak valid.');
   const b=Buffer.from(d.data,'base64');if(b.length>12*1024*1024)throw fail(413,'File melebihi batas 12 MB.');
   fs.mkdirSync(path.dirname(f),{recursive:true});snapshotIfDue(dir,d.path,f);fs.writeFileSync(f,b);return json(res,{ok:true});
  }
  if(route==='build'&&method==='POST'){
   const d=await body(req);let cfg=JSON.parse(fs.readFileSync(path.join(dir,'.latexstudio.json'),'utf8'));
   const main=safePath(dir,cfg.main),engine=d.engine||cfg.engine||'pdf';
   if(!fs.existsSync(main)||path.extname(main)!=='.tex')throw fail(400,'Main .tex tidak ditemukan.');
   if(!['pdf','xelatex','lualatex'].includes(engine))throw fail(400,'Engine tidak valid.');
   if(!commandAvailable('latexmk'))throw fail(422,'latexmk belum siap. Tutup server lalu jalankan install-windows.bat (Windows) atau start-linux.sh (Linux) untuk setup otomatis.');
   return json(res,await compile(dir,engine,cfg.main,d.clean===true));
  }
  if(route==='pdf'&&(method==='GET'||method==='HEAD')){
   let cfg=JSON.parse(fs.readFileSync(path.join(dir,'.latexstudio.json'),'utf8'));
   const f=path.join(dir,'.latexstudio-build',path.basename(cfg.main,'.tex')+'.pdf');
   if(!fs.existsSync(f))throw fail(404,'PDF belum tersedia.');
   res.writeHead(200,{'Content-Type':'application/pdf','Content-Length':fs.statSync(f).size,'Content-Disposition':'inline; filename="preview.pdf"','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});if(method==='HEAD')return res.end();return fs.createReadStream(f).pipe(res);
  }
  if(route==='export'&&method==='GET'){
   let files=filesForZip(dir);let b=zipFiles(files);res.writeHead(200,{'Content-Type':'application/zip','Content-Disposition':`attachment; filename="${id}.zip"`,'Content-Length':b.length,'Cache-Control':'no-store'});return res.end(b);
  }
 }
 if(method!=='GET')throw fail(404,'Endpoint tidak ditemukan.');
 const name=p==='/'?'index.html':p.slice(1);
 if(name.includes('..')||name.startsWith('/')||name.includes('\\'))throw fail(403,'Terlarang.');
 const f=path.resolve(PUBLIC,name);if(!f.startsWith(PUBLIC+path.sep)||!fs.existsSync(f)||!fs.statSync(f).isFile())throw fail(404,'Halaman tidak ditemukan.');
 const ext=path.extname(f);res.writeHead(200,{'Content-Type':MIME[ext]||'application/octet-stream','Cache-Control':'no-cache','X-Content-Type-Options':'nosniff'});fs.createReadStream(f).pipe(res);
}
// HTTP requests only on loopback, no network exposure.
const server=http.createServer((req,res)=>{Promise.resolve().then(()=>router(req,res)).catch(e=>{
 if(res.headersSent)return res.end();const status=e.status||500;
 if(status>=500)console.error('[ERROR]',e.message);
 json(res,{error: e.message||'Kesalahan server.'},status);
});});
if(!listProjects().length)createProject('Artikel Pertama','article');
server.listen(PORT,HOST,()=>console.log(`\nLaTeXStudio Local: http://${HOST}:${PORT}\nFolder proyek: ${WORKSPACE}\nTekan Ctrl+C untuk berhenti.\n`));
