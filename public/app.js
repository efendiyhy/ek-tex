'use strict';
const $=id=>document.getElementById(id);
const localPref={get(k){try{return localStorage.getItem(k)}catch{return null}},set(k,v){try{localStorage.setItem(k,v)}catch{}}};
const esc=s=>String(s).replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const state={project:null,config:null,projects:[],tabs:[],active:null,docs:new Map(),saveTimers:new Map(),build:false,log:'',preview:false,selectedTemplate:'article',side:'files',sidebarCollapsed:localPref.get('latexstudio-sidebar-collapsed')==='1',view:'dashboard'};
let toastTimer;
const snippets=[
 {title:'Section',short:'\\section{...}',code:'\\section{Judul Bagian}\n'},
 {title:'Equation',short:'\\begin{equation}',code:'\\begin{equation}\n  E = mc^2\n  \\label{eq:contoh}\n\\end{equation}\n'},
 {title:'Align',short:'\\begin{align}',code:'\\begin{align}\n  a &= b + c \\\\\n  d &= e + f\n\\end{align}\n'},
 {title:'Figure',short:'\\includegraphics{...}',code:'\\begin{figure}[htbp]\n  \\centering\n  \\includegraphics[width=0.75\\linewidth]{gambar.png}\n  \\caption{Keterangan gambar}\n  \\label{fig:contoh}\n\\end{figure}\n'},
 {title:'Table',short:'\\begin{tabular}',code:'\\begin{table}[htbp]\n  \\centering\n  \\caption{Judul tabel}\n  \\begin{tabular}{lcc}\n    \\hline\n    Parameter & Nilai & Satuan \\\\\n    \\hline\n    A & 1.0 & m \\\\\n    \\hline\n  \\end{tabular}\n  \\label{tab:contoh}\n\\end{table}\n'},
 {title:'Itemize',short:'\\begin{itemize}',code:'\\begin{itemize}\n  \\item Poin pertama\n  \\item Poin kedua\n\\end{itemize}\n'},
 {title:'Cite',short:'\\cite{key}',code:'\\cite{lamport1994}'},
 {title:'Math inline',short:'$...$',code:'$x^2 + y^2 = z^2$'},
 {title:'Referensi',short:'\\bibliography{...}',code:'\\bibliographystyle{plain}\n\\bibliography{references}\n'},
];
async function request(route,opts={}){
 const options={...opts,headers:{'Content-Type':'application/json',...(opts.headers||{})}};
 const res=await fetch(route,options);let data;
 try{data=await res.json()}catch{throw new Error('Server tidak merespons dengan JSON.');}
 if(!res.ok)throw new Error(data.error||`HTTP ${res.status}`);
 return data;
}
const api=(route,method='GET',data)=>request(route,{method,...(data!==undefined?{body:JSON.stringify(data)}:{})});
const pathUrl=p=>encodeURIComponent(p);
function toast(message,error=false){let node=$('toast');node.textContent=message;node.className='toast'+(error?' error':'');$('toast-inline').textContent=message;clearTimeout(toastTimer);toastTimer=setTimeout(()=>node.classList.add('hidden'),3600)}
function modal(title,body,footer='',kicker='LATEXSTUDIO'){ $('dialog-title').textContent=title;$('dialog-kicker').textContent=kicker;$('dialog-content').innerHTML=`<div class="dialog-body">${body}</div>`;$('dialog-footer').innerHTML=footer;$('overlay').classList.remove('hidden');}
function closeModal(){$('overlay').classList.add('hidden')}
function modalButtons(primary='Simpan',cancel='Batal') {return `<button class="btn" data-cancel>${cancel}</button><button class="btn primary" id="modal-apply">${primary}</button>`;}
$('dialog-close').onclick=closeModal;$('overlay').onclick=e=>{if(e.target===$('overlay'))closeModal()};
$('dialog-footer').addEventListener('click',e=>{if(e.target.closest('[data-cancel]'))closeModal()});
function statusText(content){$('file-type').textContent=state.active?.endsWith('.bib')?'BibTeX':state.active?.endsWith('.tex')?'LaTeX':'Plain text';$('file-status').textContent=content||'Ready';}
function renderTabs(){const host=$('tabs');host.innerHTML='';for(const p of state.tabs){const item=document.createElement('button');item.className='tab'+(p===state.active?' active':'');const doc=state.docs.get(p);const name=p.split('/').pop();item.innerHTML=`<span class="file-icon ${p.endsWith('.bib')?'bib':''}">${p.endsWith('.tex')?'T':p.endsWith('.bib')?'B':'F'}</span><span title="${esc(p)}">${esc(name)}</span>${doc?.dirty?'<span class="tab-dot"></span>':''}<span class="close" title="Tutup tab">×</span>`;
 item.onclick=e=>{if(e.target.classList.contains('close'))closeTab(p);else openFile(p)};host.append(item);}}
function renderTree(items){const host=$('file-tree');host.innerHTML='';
 const add=(list,depth=0)=>{for(const f of list){const b=document.createElement('button');b.className='tree-file'+(f.path===state.active?' selected':'');b.style.paddingLeft=(9+depth*13)+'px';const ext=f.name.split('.').pop().toLowerCase();const icon=f.type==='folder'?'▸':ext==='tex'?'T':ext==='bib'?'B':['png','jpg','jpeg','svg','webp','pdf'].includes(ext)?'◈':'F';
 b.innerHTML=`<span class="file-icon ${f.type==='folder'?'folder':ext==='bib'?'bib':['png','jpg','jpeg','svg','webp','pdf'].includes(ext)?'image':''}">${icon}</span><span>${esc(f.name)}</span>`;
 b.title=f.path;b.oncontextmenu=e=>{e.preventDefault();if(f.type==='file')fileActions(f.path)};b.onclick=()=>{if(f.type==='folder'){const group=b.nextElementSibling;if(group)group.classList.toggle('hidden');return}if(['png','jpg','jpeg','pdf','svg','eps','webp'].includes(ext)){toast('File gambar tersedia untuk \\includegraphics: '+f.path);return;}openFile(f.path)};host.append(b);
 if(f.type==='folder'){const sub=document.createElement('div');sub.className='folder-contents';host.append(sub);// Nested collections are rendered below their parent folder.
 const prev=host;const walker=(lst,el,d)=>{for(const child of lst){const cb=document.createElement('button');cb.className='tree-file'+(child.path===state.active?' selected':'');cb.style.paddingLeft=(9+d*13)+'px';cb.innerHTML=`<span class="file-icon ${child.type==='folder'?'folder':child.name.endsWith('.bib')?'bib':''}">${child.type==='folder'?'▸':child.name.endsWith('.tex')?'T':child.name.endsWith('.bib')?'B':'F'}</span><span>${esc(child.name)}</span>`;cb.oncontextmenu=e=>{e.preventDefault();if(child.type==='file')fileActions(child.path)};cb.onclick=()=>{if(child.type==='folder'){cb.nextElementSibling?.classList.toggle('hidden')}else openFile(child.path)};el.append(cb);if(child.type==='folder'){const x=document.createElement('div');el.append(x);walker(child.children||[],x,d+1)}}};walker(f.children||[],sub,depth+1);
 }
 }};add(items)}
async function reloadTree(){if(!state.project)return;renderTree(await api(`/api/projects/${state.project.id}/tree`));}
function setSide(name){if(state.sidebarCollapsed)toggleSidebar(false);state.side=name;document.querySelectorAll('.railbtn[data-side]').forEach(b=>b.classList.toggle('active',b.dataset.side===name));for(const p of ['files','references','templates'])$('side-'+p).classList.toggle('hidden',p!==name);}
document.querySelectorAll('.railbtn[data-side]').forEach(b=>b.onclick=()=>setSide(b.dataset.side));
async function loadProjects(){state.projects=await api('/api/projects');renderDashboard();}
function fmtDate(n){return new Date(n).toLocaleDateString('id-ID',{day:'numeric',month:'short',year:'numeric'});}
function renderDashboard(){
 const host=$('dashboard-projects');if(!host)return;
 const q=($('dashboard-search').value||'').trim().toLowerCase();
 const list=state.projects.filter(p=>p.name.toLowerCase().includes(q)||p.id.includes(q));
 $('dash-count').textContent=state.projects.length;
 $('dash-subtitle').textContent=q?`${list.length} hasil ditemukan`:`${state.projects.length} proyek tersedia`;
 if(!list.length){host.innerHTML=`<div class="dash-no-results">${state.projects.length?'Tidak ada proyek yang cocok.':'Belum ada proyek. Klik Proyek baru untuk memulai.'}</div>`;return}
 const symbols=['∑','∫','λ','π','α','β'];
 host.innerHTML='';list.forEach((p,i)=>{
  const card=document.createElement('button');card.className='dash-project';card.type='button';
  card.innerHTML=`<div class="dash-card-top"><span class="dash-project-icon">${symbols[i%symbols.length]}</span><span class="dash-open-arrow">↗</span></div><div class="dash-project-name">${esc(p.name)}</div><div class="dash-project-main">⌁ &nbsp; ${esc(p.main||'main.tex')}</div><div class="dash-project-bottom"><span>◷ &nbsp; ${fmtDate(p.updated)}</span><span>Buka proyek →</span></div>`;
  card.onclick=()=>chooseProject(p.id).catch(e=>toast(e.message,true));host.append(card);
 });
 const add=document.createElement('button');add.className='dash-add-card';add.type='button';add.innerHTML='<span class="dash-add-icon">＋</span><strong>Buat proyek baru</strong><small>Article · Thesis · Beamer</small>';
 add.onclick=newProjectDialog;host.append(add);
}
function showDashboard(){
 state.view='dashboard';document.body.classList.add('mode-dashboard');document.body.classList.remove('mode-editor');
 $('editor-workspace').classList.add('hidden');$('dashboard').classList.remove('hidden');
 renderDashboard();
}
async function goDashboard(){await saveAll();await loadProjects();showDashboard();}
function showEditor(){
 state.view='editor';document.body.classList.remove('mode-dashboard');document.body.classList.add('mode-editor');
 $('dashboard').classList.add('hidden');$('editor-workspace').classList.remove('hidden');
 $('editor-workspace').classList.toggle('sidebar-collapsed',state.sidebarCollapsed);
 $('toggle-sidebar').textContent=state.sidebarCollapsed?'☷':'☰';
 $('toggle-sidebar').title=state.sidebarCollapsed?'Tampilkan sidebar (Ctrl+B)':'Minimalkan sidebar (Ctrl+B)';
}
function toggleSidebar(force){
 if(state.view!=='editor')return;
 state.sidebarCollapsed=typeof force==='boolean'?force:!state.sidebarCollapsed;
 $('editor-workspace').classList.toggle('sidebar-collapsed',state.sidebarCollapsed);
 $('toggle-sidebar').textContent=state.sidebarCollapsed?'☷':'☰';
 $('toggle-sidebar').title=state.sidebarCollapsed?'Tampilkan sidebar (Ctrl+B)':'Minimalkan sidebar (Ctrl+B)';
 localPref.set('latexstudio-sidebar-collapsed',state.sidebarCollapsed?'1':'0');
}
$('toggle-sidebar').onclick=()=>toggleSidebar();
$('dashboard-new').onclick=newProjectDialog;
$('dashboard-import').onclick=()=>$('zip-input').click();
$('dashboard-search').oninput=renderDashboard;
async function chooseProject(id){await saveAll();const project=state.projects.find(x=>x.id===id);if(!project)throw new Error('Proyek tidak ditemukan.');state.project=project;state.config=await api(`/api/projects/${id}/config`);state.docs.clear();state.tabs=[];state.active=null;state.preview=false;$('pdf-frame').classList.add('hidden');$('pdf-empty').classList.remove('hidden');$('preview-version').textContent='Belum dikompilasi';$('project-name').textContent=state.config.name||project.name;$('sidebar-project').textContent=state.config.name||project.name;$('engine').value=state.config.engine||'pdf';showEditor();await reloadTree();await openFile(state.config.main||'main.tex');try{const r=await fetch(`/api/projects/${id}/pdf`,{method:'HEAD'});if(r.ok)refreshPdf()}catch{}}
function syncSaveIndicator(){const dirty=[...state.docs.values()].some(x=>x.dirty);$('dirty-indicator').textContent=dirty?'● Unsaved':'● Saved';$('dirty-indicator').classList.toggle('dirty',dirty);renderTabs();}
async function openFile(p){if(!state.project)return;
 if(state.active===p)return;
 if(state.active){const old=state.docs.get(state.active);if(old){old.scroll=$('code-editor').scrollTop;old.cursor=$('code-editor').selectionStart;}}
 if(!state.docs.has(p)){const file=await api(`/api/projects/${state.project.id}/file?path=${pathUrl(p)}`);state.docs.set(p,{content:file.content,dirty:false,scroll:0,cursor:0});}
 if(!state.tabs.includes(p))state.tabs.push(p);state.active=p;
 const doc=state.docs.get(p);$('code-editor').value=doc.content;renderCode();$('code-editor').scrollTop=doc.scroll||0;$('code-editor').selectionStart=$('code-editor').selectionEnd=doc.cursor||0;updateCursor();renderTabs();await reloadTree();statusText();}
async function closeTab(p){if(state.docs.get(p)?.dirty)await savePath(p);state.tabs=state.tabs.filter(t=>t!==p);state.docs.delete(p);if(state.active===p){state.active=null;if(state.tabs.length)await openFile(state.tabs[state.tabs.length-1]);else {$('code-editor').value='';renderCode();}}renderTabs();await reloadTree();}
async function savePath(p){const doc=state.docs.get(p);if(!doc||!doc.dirty)return;clearTimeout(state.saveTimers.get(p));const snapshot=doc.content;statusText('Saving...');try{await api(`/api/projects/${state.project.id}/file`,'PUT',{path:p,content:snapshot});if(doc.content===snapshot)doc.dirty=false;syncSaveIndicator();statusText('Saved');}catch(e){statusText('Save error');toast('Gagal menyimpan '+p+': '+e.message,true);throw e}}
async function saveAll(){const dirty=[...state.docs.keys()].filter(p=>state.docs.get(p).dirty);for(const p of dirty)await savePath(p);}
function scheduleSave(p){clearTimeout(state.saveTimers.get(p));state.saveTimers.set(p,setTimeout(()=>savePath(p).catch(()=>{}),750));}
function renderCode(){const input=$('code-editor').value;const pre=$('syntax-layer');const lineHtml=input.split('\n').map(line=>{
  const re=/(%[^\n]*|\\(?:[A-Za-z@]+\*?|[^A-Za-z\n])|\$[^$\n]*\$|[{}])/g;let output='',last=0,m;
  while((m=re.exec(line))!==null){output+=esc(line.slice(last,m.index));const token=m[0];const cls=token[0]==='%'?'tok-comment':token[0]==='$'?'tok-math':token==='{'||token==='}'?'tok-brace':/^\\(?:cite|ref|eqref|label|bibliography|includegraphics)/.test(token)?'tok-ref':token[0]==='\\'?'tok-cmd':'tok-special';output+=`<span class="${cls}">${esc(token)}</span>`;last=m.index+token.length;}
  return output+esc(line.slice(last));}).join('\n');pre.innerHTML=lineHtml+'\n';$('line-numbers').textContent=Array.from({length:input.split('\n').length},(_,i)=>i+1).join('\n');syncScroll();}
function syncScroll(){let t=$('code-editor');$('syntax-layer').scrollTop=t.scrollTop;$('syntax-layer').scrollLeft=t.scrollLeft;$('line-numbers').scrollTop=t.scrollTop;}
function updateCursor(){let t=$('code-editor'),before=t.value.slice(0,t.selectionStart),line=before.split('\n');$('cursor-position').textContent=`Ln ${line.length}, Col ${line[line.length-1].length+1}`;}
$('code-editor').addEventListener('input',()=>{if(!state.active)return;const d=state.docs.get(state.active);d.content=$('code-editor').value;d.dirty=true;renderCode();syncSaveIndicator();scheduleSave(state.active);updateCursor();});
$('code-editor').addEventListener('scroll',syncScroll);$('code-editor').addEventListener('click',updateCursor);$('code-editor').addEventListener('keyup',updateCursor);
function changeEditor(next,at){const t=$('code-editor');t.value=next;t.focus();t.selectionStart=t.selectionEnd=at;t.dispatchEvent(new Event('input',{bubbles:true}));}
function insertCode(s){if(!state.active)return toast('Buka file teks terlebih dahulu.',true);const t=$('code-editor'),start=t.selectionStart,end=t.selectionEnd;changeEditor(t.value.slice(0,start)+s+t.value.slice(end),start+s.length);}
$('code-editor').addEventListener('keydown',e=>{const t=e.target,sel=t.selectionStart,end=t.selectionEnd;if(e.key==='Tab'){e.preventDefault();if(e.shiftKey){const start=t.value.lastIndexOf('\n',sel-1)+1;if(t.value.slice(start,start+2)==='  '){const next=t.value.slice(0,start)+t.value.slice(start+2);changeEditor(next,Math.max(start,sel-2));}}else{changeEditor(t.value.slice(0,sel)+'  '+t.value.slice(end),sel+2);}return;}
 if(e.key==='Enter'&&!e.ctrlKey&&!e.metaKey){const start=t.value.lastIndexOf('\n',sel-1)+1;const indentation=(t.value.slice(start,sel).match(/^\s+/)||[''])[0];if(indentation){e.preventDefault();changeEditor(t.value.slice(0,sel)+'\n'+indentation+t.value.slice(end),sel+1+indentation.length);}}
});
window.addEventListener('keydown',e=>{if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='s'){e.preventDefault();saveAll().then(()=>toast('Semua file tersimpan.')).catch(()=>{});}
 if((e.ctrlKey||e.metaKey)&&e.key==='Enter'&&state.view==='editor'){e.preventDefault();buildPdf();}
 if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='b'&&state.view==='editor'){e.preventDefault();toggleSidebar();}
 if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='f'&&$('overlay').classList.contains('hidden')){e.preventDefault();openFind();}
 if(e.key==='Escape'){closeModal();$('findbar').classList.add('hidden');}
});
function openFind(){$('findbar').classList.remove('hidden');$('find-input').focus();findNext();}
function findNext(){const query=$('find-input').value,t=$('code-editor');if(!query){$('find-count').textContent='';return;}let pos=t.value.toLowerCase().indexOf(query.toLowerCase(),t.selectionEnd);if(pos<0)pos=t.value.toLowerCase().indexOf(query.toLowerCase());if(pos>=0){t.focus();t.setSelectionRange(pos,pos+query.length);$('find-count').textContent=`Found`;updateCursor();}else $('find-count').textContent='Not found';}
$('find-code').onclick=openFind;$('find-next').onclick=findNext;$('find-input').onkeydown=e=>{if(e.key==='Enter')findNext()};$('find-close').onclick=()=>$('findbar').classList.add('hidden');
function toggleConsole(force){const show=force===undefined?$('console').classList.contains('hidden'):force;$('console').classList.toggle('hidden',!show)}
$('toggle-console').onclick=()=>toggleConsole();$('close-console').onclick=()=>toggleConsole(false);$('copy-log').onclick=()=>{navigator.clipboard?.writeText(state.log).then(()=>toast('Log tersalin.')).catch(()=>toast('Clipboard tidak tersedia.',true))};
function refreshPdf(){if(!state.project)return;$('pdf-frame').src=`/api/projects/${state.project.id}/pdf?t=${Date.now()}#toolbar=1&navpanes=0`;$('pdf-frame').classList.remove('hidden');$('pdf-empty').classList.add('hidden');state.preview=true;$('preview-version').textContent='PDF terbaru';}
$('refresh-pdf').onclick=()=>{if(state.preview)refreshPdf();else toast('Compile dokumen terlebih dahulu.')};
$('download-pdf').onclick=()=>{if(!state.preview)return toast('Belum ada PDF untuk dibuka.',true);const a=document.createElement('a');a.href=`/api/projects/${state.project.id}/pdf`;a.download='output.pdf';a.click()};
function renderBuildSummary(result){
 const node=$('build-summary');node.innerHTML='';
 const diagnostics=result.diagnostics||[];
 if(result.ok){node.classList.add('hidden');return;}
 node.classList.remove('hidden');
 const headline=document.createElement('strong');headline.textContent=result.summary||'Kompilasi gagal';node.append(headline);
 if(diagnostics.length){
  const list=document.createElement('div');list.className='diagnostic-list';
  for(const d of diagnostics.slice(0,8)){
   const file=String(d.file||''),line=Number(d.line||0),entry=document.createElement('button');entry.type='button';entry.className='diagnostic-item';
   const prefix=file?(file+(line?':'+line:'')):'LaTeX';entry.textContent=prefix+' — '+d.message;
   if(file){entry.title='Buka file dan lompat ke lokasi error';entry.onclick=async()=>{try{await openFile(file);if(line>0){const editor=$('code-editor'),rows=editor.value.split('\n');let pos=0;for(let i=0;i<Math.min(line-1,rows.length);i++)pos+=rows[i].length+1;editor.focus();editor.setSelectionRange(pos,pos);editor.scrollTop=Math.max(0,(line-8)*19);updateCursor();}}catch(e){toast('Tidak dapat membuka '+file+': '+e.message,true)}};}
   else entry.disabled=true;
   list.append(entry);
  }
  node.append(list);
 }
}
async function buildPdf(clean=false){
 if(state.build||!state.project)return;
 state.build=true;
 const projectId=state.project.id,btn=$('compile'),cleanBtn=$('clean-compile'),stopBtn=$('stop-compile');
 btn.disabled=true;cleanBtn.disabled=true;stopBtn.classList.remove('hidden');stopBtn.disabled=false;
 $('compile-label').textContent='Compiling...';$('preview-version').textContent=clean?'Cleaning & compiling':'Compiling';
 $('build-summary').classList.add('hidden');state.log='';$('log-text').textContent='Memulai kompilasi...';toggleConsole(true);
 let interval;
 try{
  await saveAll();
  const update=async()=>{try{
   const progress=await api(`/api/projects/${projectId}/build/status`);
   if(progress.log!==undefined&&progress.log!==state.log){state.log=progress.log;$('log-text').textContent=state.log||'Memulai kompilasi...';}
  }catch{}};
  // Start HTTP request without awaiting so status polling can display the compiler output live.
  const pending=api(`/api/projects/${projectId}/build`,'POST',{engine:$('engine').value,clean});
  interval=setInterval(update,900);await update();
  const result=await pending;
  state.log=result.log||'';$('log-text').textContent=state.log||'(Tidak ada output)';renderBuildSummary(result);
  if(result.ok){refreshPdf();$('preview-version').textContent='Built '+new Date().toLocaleTimeString('id-ID');toast(clean?'Clean & Recompile berhasil.':'Kompilasi berhasil. PDF diperbarui.');statusText('Build success');}
  else {toggleConsole(true);$('preview-version').textContent=result.pdfExists?'Build failed (PDF lama)':'Compilation failed';toast(result.summary||'Kompilasi gagal — periksa error.',true);statusText('Build error');}
 }catch(e){state.log=e.message;$('log-text').textContent=e.message;renderBuildSummary({summary:e.message});toggleConsole(true);toast(e.message,true);$('preview-version').textContent='Compiler error';}
 finally{clearInterval(interval);state.build=false;btn.disabled=false;cleanBtn.disabled=false;stopBtn.classList.add('hidden');$('compile-label').textContent='Compile';}
}
$('compile').onclick=()=>buildPdf(false);
$('clean-compile').onclick=()=>buildPdf(true);
$('stop-compile').onclick=async()=>{if(!state.build||!state.project)return;try{$('stop-compile').disabled=true;await api(`/api/projects/${state.project.id}/build/stop`,'POST');toast('Permintaan berhenti dikirim.')}catch(e){toast(e.message,true);$('stop-compile').disabled=false}};
$('engine').onchange=async()=>{if(!state.project)return;try{state.config=await api(`/api/projects/${state.project.id}/config`,'PATCH',{engine:$('engine').value});toast('Compiler: '+$('engine').selectedOptions[0].textContent)}catch(e){toast(e.message,true)}};
function newProjectDialog(){state.selectedTemplate='article';const templates=[['article','Article','Makalah & jurnal'],['report','Report','Laporan ilmiah'],['thesis','Thesis','Tesis / disertasi'],['beamer','Beamer','Slide presentasi'],['blank','Blank','File kosong']];
 modal('Buat proyek LaTeX',`<label>Nama proyek</label><input id="new-project-name" value="Proyek Penelitian" maxlength="100" placeholder="Nama proyek"><label>Template dokumen</label><div class="template-grid">${templates.map(([id,name,desc])=>`<button class="template-item ${id==='article'?'selected':''}" data-template="${id}"><strong>${name}</strong><span>${desc}</span></button>`).join('')}</div>`,modalButtons('Buat proyek'),'NEW PROJECT');
 document.querySelectorAll('[data-template]').forEach(b=>b.onclick=()=>{state.selectedTemplate=b.dataset.template;document.querySelectorAll('[data-template]').forEach(t=>t.classList.toggle('selected',t===b))});
 $('modal-apply').onclick=async()=>{const name=$('new-project-name').value.trim();if(!name)return toast('Masukkan nama proyek.',true);try{const p=await api('/api/projects','POST',{name,template:state.selectedTemplate});await loadProjects();closeModal();await chooseProject(p.id);toast('Proyek berhasil dibuat.')}catch(e){toast(e.message,true)}};
 $('new-project-name').focus();$('new-project-name').select();}
$('new-project').onclick=newProjectDialog;$('new-from-template').onclick=newProjectDialog;
function oldProjectPicker(){modal('Pilih proyek',`<div class="project-list">${state.projects.map(p=>`<button data-open-project="${esc(p.id)}"><span>⌁ &nbsp; ${esc(p.name)}</span><small>${p.id===state.project?.id?'CURRENT':'OPEN ↗'}</small></button>`).join('')}</div><p>Seluruh proyek disimpan pada folder workspace aplikasi.</p>`,`<button class="btn" id="import-zip">⇧ Import ZIP</button><button class="btn primary" id="modal-apply">＋ Proyek baru</button>`,'YOUR WORKSPACE');document.querySelectorAll('[data-open-project]').forEach(b=>b.onclick=async()=>{try{closeModal();await chooseProject(b.dataset.openProject)}catch(e){toast(e.message,true)}});$('modal-apply').onclick=newProjectDialog;$('import-zip').onclick=()=>$('zip-input').click();};
$('project-picker').onclick=()=>goDashboard().catch(e=>toast('Gagal kembali ke dashboard: '+e.message,true));
function fileActions(p){modal('Kelola file',`<p><strong>${esc(p)}</strong></p><label>Nama baru / lokasi baru</label><input id="rename-path" value="${esc(p)}"><p>Mengubah nama file memperbarui tab jika sedang terbuka. Untuk menghapus, pastikan file bukan main document.</p>`, `<button class="btn danger" id="delete-file">Hapus</button>`+modalButtons('Rename'),'FILE ACTIONS');
 $('modal-apply').onclick=async()=>{try{await saveAll();let newP=$('rename-path').value.trim();if(newP===p)return closeModal();await api(`/api/projects/${state.project.id}/file`,'PATCH',{path:p,newPath:newP});if(state.docs.has(p)){const d=state.docs.get(p);state.docs.delete(p);state.docs.set(newP,d)}state.tabs=state.tabs.map(t=>t===p?newP:t);if(state.active===p)state.active=newP;closeModal();renderTabs();await reloadTree();toast('File berhasil diubah namanya.')}catch(e){toast(e.message,true)}};
 $('delete-file').onclick=async()=>{if(!confirm('Hapus '+p+'? Tindakan ini tidak bisa dibatalkan.'))return;try{await api(`/api/projects/${state.project.id}/file`,'DELETE',{path:p});closeModal();if(state.tabs.includes(p))await closeTab(p);await reloadTree();toast('File dihapus.')}catch(e){toast(e.message,true)}};
}
function newFileDialog(){modal('Buat file',`<label>Nama file (mendukung folder)</label><input id="filename-input" placeholder="sections/metode.tex" value="bagian-baru.tex"><p>Ekstensi yang didukung antara lain .tex, .bib, .sty, .cls, dan .txt.</p>`,modalButtons('Buat file'),'PROJECT FILES');$('modal-apply').onclick=async()=>{try{let p=$('filename-input').value.trim();await api(`/api/projects/${state.project.id}/file`,'POST',{path:p,content:p.endsWith('.tex')?'% File LaTeX baru\n':''});closeModal();await reloadTree();await openFile(p);toast('File '+p+' dibuat.')}catch(e){toast(e.message,true)}}};
$('new-file').onclick=newFileDialog;$('refresh-tree').onclick=()=>reloadTree().then(()=>toast('File diperbarui.')).catch(e=>toast(e.message,true));
$('upload-file').onclick=()=>$('file-input').click();
$('zip-input').onchange=async e=>{const file=e.target.files[0];if(!file)return;try{const base64=await new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(String(r.result).split(',')[1]);r.onerror=reject;r.readAsDataURL(file)});const p=await api('/api/projects/import','POST',{name:file.name.replace(/\.zip$/i,''),data:base64});await loadProjects();closeModal();await chooseProject(p.id);toast('ZIP berhasil diimpor.')}catch(err){toast('Import ZIP gagal: '+err.message,true)}e.target.value=''};
$('file-input').onchange=async e=>{let files=[...e.target.files];if(!state.project||!files.length)return;for(const file of files){try{if(file.size>12*1024*1024)throw new Error('File terlalu besar (>12MB).');let data=await new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(String(r.result).split(',')[1]);r.onerror=reject;r.readAsDataURL(file)});await api(`/api/projects/${state.project.id}/upload`,'POST',{path:file.name,data});toast('Upload: '+file.name);}catch(err){toast(file.name+': '+err.message,true)}}e.target.value='';await reloadTree();};
$('export-project').onclick=async()=>{try{await saveAll();const a=document.createElement('a');a.href=`/api/projects/${state.project.id}/export`;a.download=state.project.id+'.zip';a.click();toast('Export ZIP dimulai.')}catch(e){toast(e.message,true)}};
function configureDialog(){if(!state.config)return;modal('Pengaturan proyek',`<label>Nama proyek</label><input id="setting-project-name" value="${esc(state.config.name||'')}"><label>Main document (.tex)</label><input id="setting-main" value="${esc(state.config.main||'main.tex')}"><p>Ganti main document bila proyek terdiri dari beberapa file .tex. File referensi dapat disimpan pada <strong>references.bib</strong>.</p><p>Workspace lokal:</p><div class="settings-code" id="workspace-path">Loading...</div>`,modalButtons('Simpan pengaturan'),'SETTINGS');api('/api/status').then(s=>$('workspace-path').textContent=s.workspace).catch(()=>{});$('modal-apply').onclick=async()=>{try{state.config=await api(`/api/projects/${state.project.id}/config`,'PATCH',{name:$('setting-project-name').value,main:$('setting-main').value});$('project-name').textContent=state.config.name;$('sidebar-project').textContent=state.config.name;await loadProjects();closeModal();toast('Pengaturan tersimpan.')}catch(e){toast(e.message,true)}};}
$('open-settings').onclick=configureDialog;
function helpDialog(){modal('Setup compiler otomatis',`<p>Instalasi sekarang <strong>terintegrasi dengan launcher</strong>. Anda tidak perlu memasang latexmk satu per satu.</p><p><strong>Windows:</strong> Tutup server, lalu jalankan <code>start-windows.bat</code>. Launcher memeriksa Node.js, MiKTeX, Strawberry Perl, dan latexmk, kemudian menawarkan instalasi melalui WinGet.</p><div class="settings-code">start-windows.bat
# Alternatif di PowerShell: ./setup-windows.ps1</div><p><strong>Ubuntu / Debian / Orange Pi:</strong></p><div class="settings-code">chmod +x start-linux.sh setup-linux.sh
./start-linux.sh</div><p>Perlu koneksi internet pada instalasi pertama dan untuk paket LaTeX yang belum terpasang. Jika installer gagal, periksa izin administrator/sudo dan pesan kesalahan di terminal.</p>`,`<button class="btn primary" data-cancel>Mengerti</button>`,'INSTALLER');}
$('help-compile').onclick=helpDialog;$('preview-help').onclick=helpDialog;
$('show-shortcuts').onclick=()=>modal('Pintasan keyboard',`<p><strong>Ctrl + S</strong> — Simpan semua file</p><p><strong>Ctrl + Enter</strong> — Compile & refresh PDF</p><p><strong>Ctrl + F</strong> — Cari teks dalam dokumen</p><p><strong>Tab</strong> — Indent 2 spasi</p><p><strong>Shift + Tab</strong> — Hapus indent</p><p><strong>Esc</strong> — Tutup dialog/pencarian</p>`,`<button class="btn primary" data-cancel>Oke</button>`,'SHORTCUTS');
$('insert-figure').onclick=()=>insertCode(snippets.find(x=>x.title==='Figure').code);
$('insert-cite').onclick=async()=>{try{await saveAll();const bib=await api(`/api/projects/${state.project.id}/file?path=references.bib`);const keys=[...bib.content.matchAll(/@\w+\s*\{\s*([^,\s]+)/g)].map(x=>x[1]);modal('Sisipkan kutipan',`<label>Citation key</label><input id="cite-key" list="cite-suggestions" value="${esc(keys[0]||'')}"><datalist id="cite-suggestions">${keys.map(k=>`<option value="${esc(k)}">`).join('')}</datalist><p>Pilih salah satu key dari references.bib, lalu tambahkan pada posisi kursor.</p>`,modalButtons('Sisipkan citation'),'BIBLIOGRAPHY');$('modal-apply').onclick=()=>{const key=$('cite-key').value.trim();closeModal();insertCode(`\\cite{${key}}`)};}catch(e){toast(e.message,true);setSide('references')}};
function renderSnippets(){const host=$('snippets');host.innerHTML=snippets.map((s,i)=>`<button class="snippet-btn" data-snippet="${i}"><span>${esc(s.title)}</span><code>${esc(s.short)}</code></button>`).join('');host.querySelectorAll('button').forEach(b=>b.onclick=()=>insertCode(snippets[Number(b.dataset.snippet)].code));}
function renderRefs(results){const host=$('ref-results');if(!results.length){host.innerHTML='<div class="empty-mini">Tidak ditemukan publikasi pada Crossref.</div>';return;}host.innerHTML='';for(const r of results){const c=document.createElement('div');c.className='ref-card';c.innerHTML=`<div class="ref-title">${esc(r.title||'Tanpa judul')}</div><div class="ref-meta">${esc(String(r.authors||'').slice(0,120))}<br>${esc(r.venue||'')} · ${esc(r.year||'n.d.')}${r.doi?`<br>DOI: ${esc(r.doi)}`:''}</div><button>＋ Tambahkan ke references.bib</button>`;c.querySelector('button').onclick=()=>addBib(r);host.append(c);}}
async function addBib(r){if(!state.project)return;try{let p='references.bib';if(state.docs.has(p)&&state.docs.get(p).dirty)await savePath(p);let doc=await api(`/api/projects/${state.project.id}/file?path=references.bib`);let prev=doc.content;
 if(r.doi&&prev.toLowerCase().includes('doi = {'+r.doi.toLowerCase()+'}'))return toast('DOI sudah ada pada library.',true);
 let key=r.key,idx=2;while(new RegExp('@\\w+\\s*\\{\\s*'+key+'\\s*,','i').test(prev)){key=r.key+idx++;}
 let bib=key!==r.key?r.bib.replace(/^(@\w+\{)[^,]+/,`$1${key}`):r.bib;const next=prev.trimEnd()+'\n\n'+bib;
 await api(`/api/projects/${state.project.id}/file`,'PUT',{path:p,content:next});if(state.docs.has(p)){const old=state.docs.get(p);old.content=next;old.dirty=false;if(state.active===p){$('code-editor').value=next;renderCode()}}
 syncSaveIndicator();toast('Referensi '+key+' ditambahkan ke references.bib.');await openFile(p);await reloadTree();}catch(e){toast(e.message,true)}}
async function lookupDoi(){const q=$('doi-input').value.trim();if(!q)return toast('Masukkan DOI.',true);$('ref-results').innerHTML='<div class="empty-mini">Mengambil metadata dari Crossref...</div>';try{const r=await api('/api/doi?doi='+encodeURIComponent(q));renderRefs([r]);}catch(e){$('ref-results').innerHTML='';toast(e.message,true)}}
async function searchRefs(){const q=$('ref-search').value.trim();if(q.length<3)return toast('Kata kunci minimal 3 karakter.',true);$('ref-results').innerHTML='<div class="empty-mini">Mencari publikasi di Crossref...</div>';try{renderRefs(await api('/api/search?q='+encodeURIComponent(q)));}catch(e){$('ref-results').innerHTML='';toast(e.message,true)}}
function bibliographyEntries(content){
 let result=[],rx=/@([A-Za-z]+)\s*\{\s*([^,\s]+)\s*,/g,m;
 while((m=rx.exec(content))){let depth=1,i=rx.lastIndex;
  for(;i<content.length&&depth;i++){if(content[i]==='{')depth++;else if(content[i]==='}')depth--;}
  if(depth!==0)continue;
  const full=content.slice(m.index,i),match=full.match(/\bdoi\s*=\s*[\{"]?\s*(10\.\d{4,9}\/[^\s\},"]+)/i);
  if(match)result.push({start:m.index,end:i,key:m[2],doi:match[1].replace(/[,;]+$/,'')});
  rx.lastIndex=i;
 }
 return result;
}
async function updateBibOnline(){
 try{await saveAll();const p='references.bib';const doc=await api(`/api/projects/${state.project.id}/file?path=references.bib`);
  const entries=bibliographyEntries(doc.content);if(!entries.length)return toast('Belum ada entri dengan DOI di references.bib.',true);
  if(entries.length>20)return toast('Maksimal 20 entri DOI per pembaruan. Bagi referensi ke beberapa file.',true);
  if(!confirm(`Perbarui ${entries.length} entri DOI dari Crossref? Metadata lama akan diganti. File lama dibackup oleh server.`))return;
  $('ref-results').innerHTML='<div class="empty-mini">Memperbarui metadata dari Crossref...</div>';
  let next=doc.content,okay=0,failed=[];
  for(const entry of entries.slice().reverse()){
   try{const meta=await api('/api/doi?doi='+encodeURIComponent(entry.doi));
    const newBib=meta.bib.replace(/^(@\w+\{)[^,]+/,(_,a)=>a+entry.key).trimEnd();
    next=next.slice(0,entry.start)+newBib+next.slice(entry.end);okay++;
   }catch(e){failed.push(entry.doi);}
  }
  if(okay){await api(`/api/projects/${state.project.id}/file`,'PUT',{path:p,content:next});if(state.docs.has(p)){const d=state.docs.get(p);d.content=next;d.dirty=false;if(state.active===p){$('code-editor').value=next;renderCode()}}syncSaveIndicator();}
  $('ref-results').innerHTML=`<div class="empty-mini">Selesai: ${okay} referensi diperbarui; ${failed.length} gagal.${failed.length?' Coba ulangi saat koneksi internet stabil.':''}</div>`;
  toast(`${okay} metadata DOI berhasil diperbarui${failed.length?' ('+failed.length+' gagal)':''}.`,!!failed.length);
 }catch(e){toast(e.message,true)}
}
$('ref-update-existing').onclick=updateBibOnline;
$('doi-lookup').onclick=lookupDoi;$('doi-input').onkeydown=e=>{if(e.key==='Enter')lookupDoi()};$('ref-search-btn').onclick=searchRefs;$('ref-search').onkeydown=e=>{if(e.key==='Enter')searchRefs()};
async function init(){
 renderSnippets();showDashboard();
 try{
  const s=await api('/api/status');
  const ready=s.latexmk&&s.pdflatex;
  $('compiler-status').innerHTML=`<span class="status-dot ${ready?'green':'amber'}"></span><span>${ready?'LaTeX ready':'Compiler belum siap'}</span>`;
  $('dash-compiler').textContent=ready?'READY':'NEEDS SETUP';
  $('dash-compiler').classList.toggle('needs-setup',!ready);
  $('dash-compiler-note').textContent=ready?'latexmk & pdfLaTeX terdeteksi':'Jalankan ulang launcher untuk setup';
  await loadProjects();
  if(!ready)toast('Compiler belum terdeteksi. Jalankan setup-windows.ps1 / setup-linux.sh.',true);
 }catch(e){toast('Gagal memuat dashboard: '+e.message,true);$('dash-compiler').textContent='OFFLINE';}
}
init();
