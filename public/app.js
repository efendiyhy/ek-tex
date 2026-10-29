'use strict';
const $=id=>document.getElementById(id);
const localPref={get(k){try{return localStorage.getItem(k)}catch{return null}},set(k,v){try{localStorage.setItem(k,v)}catch{}}};
const esc=s=>String(s).replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const features=window.EKTeXFeatures;
const state={project:null,config:null,projects:[],tabs:[],active:null,docs:new Map(),saveTimers:new Map(),build:false,log:'',preview:false,previewFile:null,selectedTemplate:'article',side:'files',sidebarCollapsed:localPref.get('latexstudio-sidebar-collapsed')==='1',view:'dashboard',diagnostics:[],suggestIndex:0,suggestCtx:null,theme:features.validTheme(localPref.get('ektex-theme')),mode:features.validMode(localPref.get('ektex-mode'))};
let toastTimer;
function applyAppearance(theme=state.theme,mode=state.mode){
 state.theme=features.validTheme(theme);state.mode=features.validMode(mode);
 document.body.dataset.theme=state.theme;document.body.dataset.mode=state.mode;
 localPref.set('ektex-theme',state.theme);localPref.set('ektex-mode',state.mode);
 const meta=document.querySelector('meta[name="theme-color"]');if(meta)meta.content=state.mode==='dark'?'#111b2d':'#f4f7fb';
}
applyAppearance();

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
function setSide(name){if(name==='references'){window.EKTeXReferences?.open();return;}if(state.sidebarCollapsed)toggleSidebar(false);state.side=name;document.querySelectorAll('.railbtn[data-side]').forEach(b=>b.classList.toggle('active',b.dataset.side===name));for(const p of ['files','references','templates','tools'])$('side-'+p).classList.toggle('hidden',p!==name);}
document.querySelectorAll('.railbtn[data-side]').forEach(b=>b.onclick=()=>setSide(b.dataset.side));
async function loadProjects(){state.projects=await api('/api/projects');renderDashboard();}
function fmtDate(n){return new Date(n).toLocaleDateString('id-ID',{day:'numeric',month:'short',year:'numeric'});}
function renderDashboard(){
 const host=$('dashboard-projects');if(!host)return;
 const q=($('dashboard-search').value||'').trim().toLowerCase();
 const list=state.projects.filter(p=>p.name.toLowerCase().includes(q)||p.id.includes(q));
 $('dash-count').textContent=state.projects.length;
 $('dash-subtitle').textContent=q?`${list.length} hasil ditemukan`:`${state.projects.length} proyek tersedia`;
 host.replaceChildren();
 if(!list.length){const empty=document.createElement('div');empty.className='dash-no-results';empty.textContent=state.projects.length?'Tidak ada proyek yang cocok.':'Belum ada proyek. Buat proyek LaTeX atau konversi dokumen untuk memulai.';host.append(empty);return;}
 for(const p of list){
  const row=document.createElement('div');row.className='dash-project-row';
  const open=document.createElement('button');open.className='dash-project-open';open.type='button';open.title='Buka '+p.name;
  const icon=document.createElement('span');icon.className='dash-row-icon';icon.textContent='TₑX';
  const nameWrap=document.createElement('span');nameWrap.className='dash-row-name';
  const name=document.createElement('strong');name.textContent=p.name;const subtitle=document.createElement('small');subtitle.textContent='Buka proyek →';nameWrap.append(name,subtitle);
  const main=document.createElement('span');main.className='dash-row-main';main.textContent=p.main||'main.tex';
  const date=document.createElement('span');date.className='dash-row-date';date.textContent=fmtDate(p.updated);
  open.append(icon,nameWrap,main,date);open.onclick=()=>chooseProject(p.id).catch(e=>toast(e.message,true));
  const actions=document.createElement('div');actions.className='dash-row-actions';
  const rename=document.createElement('button');rename.className='dash-action';rename.title='Rename proyek';rename.textContent='Rename';rename.onclick=()=>renameProjectDialog(p);
  const remove=document.createElement('button');remove.className='dash-action danger';remove.title='Delete proyek';remove.textContent='Delete';remove.onclick=()=>deleteProjectDialog(p);
  actions.append(rename,remove);row.append(open,actions);host.append(row);
 }
}
function renameProjectDialog(p){
 modal('Rename proyek',`<label>Nama proyek baru</label><input id="rename-project-name" maxlength="100" value="${esc(p.name)}"><p class="muted">Nama proyek pada dashboard berubah; folder dan ID proyek tetap sama agar tautan serta file tidak terganggu.</p>`,modalButtons('Simpan nama'),'PROJECT MANAGEMENT');
 $('modal-apply').onclick=async()=>{try{const name=$('rename-project-name').value.trim();if(!name)return toast('Nama proyek tidak boleh kosong.',true);await api(`/api/projects/${p.id}`,'PATCH',{name});await loadProjects();closeModal();toast('Nama proyek diperbarui.')}catch(e){toast(e.message,true)}};
}
function deleteProjectDialog(p){
 modal('Hapus proyek',`<p class="delete-warning">Seluruh file dan folder proyek ini akan dihapus permanen, termasuk file .tex, .bib, gambar, dan hasil build. Simpan ZIP cadangan dahulu jika diperlukan.</p><p>Untuk mengonfirmasi, ketik nama proyek <strong>${esc(p.name)}</strong>:</p><input id="confirm-project-name" autocomplete="off" placeholder="Ketik nama proyek persis"><p class="muted">Tindakan ini tidak dapat dibatalkan.</p>`,`<button class="btn" data-cancel>Batal</button><button class="btn danger" id="confirm-delete" disabled>Hapus permanen</button>`,'DELETE PROJECT');
 const input=$('confirm-project-name'),button=$('confirm-delete');input.oninput=()=>{button.disabled=input.value!==p.name};
 button.onclick=async()=>{if(input.value!==p.name)return;try{button.disabled=true;await api(`/api/projects/${p.id}`,'DELETE',{confirmName:p.name});await loadProjects();closeModal();toast('Proyek berhasil dihapus.')}catch(e){button.disabled=false;toast(e.message,true)}};
 input.focus();
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
$('dashboard-convert').onclick=()=>openConverter();
$('dashboard-search').oninput=renderDashboard;
async function chooseProject(id){await saveAll();const project=state.projects.find(x=>x.id===id);if(!project)throw new Error('Proyek tidak ditemukan.');state.project=project;state.diagnostics=[];hideSuggestions();state.config=await api(`/api/projects/${id}/config`);state.docs.clear();state.tabs=[];state.active=null;state.preview=false;state.previewFile=null;$('pdf-frame').classList.add('hidden');$('pdf-empty').classList.remove('hidden');$('preview-version').textContent='Belum dikompilasi';$('project-name').textContent=state.config.name||project.name;$('sidebar-project').textContent=state.config.name||project.name;$('engine').value=state.config.engine||'pdf';showEditor();await reloadTree();await openFile(state.config.main||'main.tex');}
function syncSaveIndicator(){const dirty=[...state.docs.values()].some(x=>x.dirty);$('dirty-indicator').textContent=dirty?'● Unsaved':'● Saved';$('dirty-indicator').classList.toggle('dirty',dirty);renderTabs();}
async function openFile(p){if(!state.project)return;
 if(state.active===p)return;hideSuggestions();
 if(state.active){const old=state.docs.get(state.active);if(old){old.scroll=$('code-editor').scrollTop;old.cursor=$('code-editor').selectionStart;}}
 if(!state.docs.has(p)){const file=await api(`/api/projects/${state.project.id}/file?path=${pathUrl(p)}`);state.docs.set(p,{content:file.content,dirty:false,scroll:0,cursor:0});}
 if(!state.tabs.includes(p))state.tabs.push(p);state.active=p;
 const doc=state.docs.get(p);$('code-editor').value=doc.content;renderCode();$('code-editor').scrollTop=doc.scroll||0;$('code-editor').selectionStart=$('code-editor').selectionEnd=doc.cursor||0;updateCursor();renderTabs();await reloadTree();statusText();syncCompileTarget();await updatePreviewForActive();}
async function closeTab(p){if(state.docs.get(p)?.dirty)await savePath(p);state.tabs=state.tabs.filter(t=>t!==p);state.docs.delete(p);if(state.active===p){state.active=null;if(state.tabs.length)await openFile(state.tabs[state.tabs.length-1]);else {$('code-editor').value='';renderCode();}}renderTabs();await reloadTree();syncCompileTarget();await updatePreviewForActive();}
async function savePath(p){const doc=state.docs.get(p);if(!doc||!doc.dirty)return;clearTimeout(state.saveTimers.get(p));const snapshot=doc.content;statusText('Saving...');try{await api(`/api/projects/${state.project.id}/file`,'PUT',{path:p,content:snapshot});if(doc.content===snapshot)doc.dirty=false;syncSaveIndicator();statusText('Saved');}catch(e){statusText('Save error');toast('Gagal menyimpan '+p+': '+e.message,true);throw e}}
async function saveAll(){const dirty=[...state.docs.keys()].filter(p=>state.docs.get(p).dirty);for(const p of dirty)await savePath(p);}
function scheduleSave(p){clearTimeout(state.saveTimers.get(p));state.saveTimers.set(p,setTimeout(()=>savePath(p).catch(()=>{}),750));}
function renderCode(){
 const input=$('code-editor').value,pre=$('syntax-layer'),issues=features.errorsForFile(state.diagnostics,state.active);
 const errorLines=new Map(issues.map(d=>[Number(d.line),d.message]));
 const lines=input.split('\n');
 pre.innerHTML=lines.map((line,i)=>{
  const re=/(%[^\n]*|\\(?:[A-Za-z@]+\*?|[^A-Za-z\n])|\$[^$\n]*\$|[{}])/g;let output='',last=0,m;
  while((m=re.exec(line))!==null){output+=esc(line.slice(last,m.index));const token=m[0];const cls=token[0]==='%'?'tok-comment':token[0]==='$'?'tok-math':token==='{'||token==='}'?'tok-brace':/^\\(?:cite|ref|eqref|label|bibliography|includegraphics)/.test(token)?'tok-ref':token[0]==='\\'?'tok-cmd':'tok-special';output+=`<span class="${cls}">${esc(token)}</span>`;last=m.index+token.length;}
  const errored=errorLines.has(i+1);return `<span class="code-line${errored?' compile-error-line':''}" data-line="${i+1}"${errored?` title="${esc(errorLines.get(i+1))}"`:''}>${output+esc(line.slice(last))||'&#8203;'}</span>`;
 }).join('');
 $('line-numbers').innerHTML=lines.map((_,i)=>{const issue=errorLines.get(i+1);return `<span class="line-number${issue?' line-number-error':''}" data-line="${i+1}"${issue?` title="${esc(issue)}"`:''}>${i+1}${issue?'<span class="gutter-alert" aria-label="Error">●</span>':''}</span>`;}).join('');
 syncScroll();
}
function syncScroll(){let t=$('code-editor');$('syntax-layer').scrollTop=t.scrollTop;$('syntax-layer').scrollLeft=t.scrollLeft;$('line-numbers').scrollTop=t.scrollTop;placeSuggestions();}
function updateCursor(){let t=$('code-editor'),before=t.value.slice(0,t.selectionStart),line=before.split('\n');$('cursor-position').textContent=`Ln ${line.length}, Col ${line[line.length-1].length+1}`;}
function jumpToLine(line){
 const editor=$('code-editor'),rows=editor.value.split('\n');const n=Math.max(1,Math.min(rows.length,Number(line)||1));let pos=0;
 for(let i=0;i<n-1;i++)pos+=rows[i].length+1;
 hideSuggestions();editor.focus();editor.setSelectionRange(pos,pos);editor.scrollTop=Math.max(0,(n-5)*24);updateCursor();syncScroll();
}
$('line-numbers').addEventListener('click',e=>{const el=e.target.closest('[data-line]');if(el)jumpToLine(Number(el.dataset.line));});
function hideSuggestions(){state.suggestCtx=null;$('latex-suggestions').classList.add('hidden');$('latex-suggestions').replaceChildren();}
function currentSuggestions(){return state.suggestCtx?features.suggest(state.suggestCtx.prefix):[];}
function placeSuggestions(){
 const box=$('latex-suggestions');if(box.classList.contains('hidden')||!state.suggestCtx)return;
 const t=$('code-editor'),index=state.suggestCtx.end,before=t.value.slice(0,index),rows=before.split('\n');
 const row=rows.length-1,col=rows[rows.length-1].length;
 const w=t.parentElement.clientWidth,h=t.parentElement.clientHeight;
 const left=Math.max(7,Math.min(w-255,24+col*7.84-t.scrollLeft));
 let top=20+row*24-t.scrollTop+28;const popupHeight=Math.min(300,box.scrollHeight||300);
 if(top+popupHeight>h-8)top=Math.max(8,20+row*24-t.scrollTop-popupHeight-8);
 box.style.left=Math.max(7,left)+'px';box.style.top=top+'px';
}
function updateAutocomplete(){
 const t=$('code-editor');if(!state.active?.toLowerCase().endsWith('.tex')||t.selectionStart!==t.selectionEnd){hideSuggestions();return;}
 const ctx=features.context(t.value,t.selectionStart),matches=ctx?features.suggest(ctx.prefix):[];
 if(!matches.length){hideSuggestions();return;}
 state.suggestCtx=ctx;state.suggestIndex=Math.min(state.suggestIndex,matches.length-1);
 const menu=$('latex-suggestions');menu.replaceChildren();
 matches.forEach((cmd,i)=>{
  const btn=document.createElement('button');btn.type='button';btn.role='option';btn.className='latex-suggestion'+(i===state.suggestIndex?' selected':'');btn.setAttribute('aria-selected',i===state.suggestIndex?'true':'false');
  const left=document.createElement('span');left.textContent='\\'+cmd.name;const group=document.createElement('small');group.textContent=cmd.group;btn.append(left,group);
  btn.onmousedown=e=>{e.preventDefault();acceptSuggestion(i)};menu.append(btn);
 });
 menu.classList.remove('hidden');placeSuggestions();
}
function acceptSuggestion(index=state.suggestIndex){
 const ctx=state.suggestCtx;if(!ctx)return;const cmd=currentSuggestions()[index];if(!cmd)return;
 const x=features.expand(cmd.template),t=$('code-editor'),content=t.value;
 hideSuggestions();changeEditor(content.slice(0,ctx.start)+x.text+content.slice(ctx.end),ctx.start+x.cursor);
}
$('code-editor').addEventListener('input',()=>{if(!state.active)return;const d=state.docs.get(state.active);d.content=$('code-editor').value;d.dirty=true;renderCode();syncSaveIndicator();scheduleSave(state.active);updateCursor();updateAutocomplete();});
$('code-editor').addEventListener('blur',()=>setTimeout(hideSuggestions,140));
$('code-editor').addEventListener('scroll',syncScroll);$('code-editor').addEventListener('click',()=>{updateCursor();updateAutocomplete()});$('code-editor').addEventListener('keyup',()=>{updateCursor();updateAutocomplete()});
function changeEditor(next,at){const t=$('code-editor');t.value=next;t.focus();t.selectionStart=t.selectionEnd=at;t.dispatchEvent(new Event('input',{bubbles:true}));}
function insertCode(s){if(!state.active)return toast('Buka file teks terlebih dahulu.',true);const t=$('code-editor'),start=t.selectionStart,end=t.selectionEnd;changeEditor(t.value.slice(0,start)+s+t.value.slice(end),start+s.length);}
$('code-editor').addEventListener('keydown',e=>{const t=e.target,sel=t.selectionStart,end=t.selectionEnd;
 if(state.suggestCtx){
  const matches=currentSuggestions();
  if(e.key==='ArrowDown'||e.key==='ArrowUp'){e.preventDefault();state.suggestIndex=(state.suggestIndex+(e.key==='ArrowDown'?1:-1)+matches.length)%matches.length;updateAutocomplete();return;}
  if(e.key==='Enter'||e.key==='Tab'){e.preventDefault();acceptSuggestion();return;}
  if(e.key==='Escape'){e.preventDefault();e.stopPropagation();hideSuggestions();return;}
 }
 if(e.key==='Tab'){e.preventDefault();if(e.shiftKey){const start=t.value.lastIndexOf('\n',sel-1)+1;if(t.value.slice(start,start+2)==='  '){const next=t.value.slice(0,start)+t.value.slice(start+2);changeEditor(next,Math.max(start,sel-2));}}else{changeEditor(t.value.slice(0,sel)+'  '+t.value.slice(end),sel+2);}return;}
 if(e.key==='Enter'&&!e.ctrlKey&&!e.metaKey){const start=t.value.lastIndexOf('\n',sel-1)+1;const indentation=(t.value.slice(start,sel).match(/^\s+/)||[''])[0];if(indentation){e.preventDefault();changeEditor(t.value.slice(0,sel)+'\n'+indentation+t.value.slice(end),sel+1+indentation.length);}}
});
window.addEventListener('keydown',e=>{if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='s'){e.preventDefault();saveAll().then(()=>toast('Semua file tersimpan.')).catch(()=>{});}
 if((e.ctrlKey||e.metaKey)&&e.key==='Enter'&&state.view==='editor'){e.preventDefault();buildPdf();}
 if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='b'&&state.view==='editor'){e.preventDefault();toggleSidebar();}
 if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='f'&&$('overlay').classList.contains('hidden')){e.preventDefault();openFind(false);}
 if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='h'&&state.view==='editor'&&$('overlay').classList.contains('hidden')){e.preventDefault();openFind(true);}
 if(e.key==='Escape'){hideSuggestions();closeModal();$('findbar').classList.add('hidden');}
});
// Text search is always literal (not regex); editing only affects the open file.
const findEngine=window.EKTeXFindReplace;
function findMatches(){return findEngine.occurrences($('code-editor').value,$('find-input').value,{caseSensitive:$('find-case').checked,wholeWord:$('find-word').checked});}
function selectedMatch(matches){const t=$('code-editor');return matches.findIndex(m=>m.start===t.selectionStart&&m.end===t.selectionEnd);}
function updateFindCount(){const matches=findMatches(),index=selectedMatch(matches);$('find-count').textContent=!$('find-input').value?'Masukkan teks':matches.length?`${index>=0?index+1+' / ':''}${matches.length} hasil`:'0 hasil';return matches;}
function closeFind(){$('findbar').classList.add('hidden');$('code-editor').focus();}
function openFind(showReplace=false){if(state.view!=='editor'||!state.active)return toast('Buka file teks terlebih dahulu.',true);
 $('findbar').classList.remove('hidden');const editor=$('code-editor');const selected=editor.value.slice(editor.selectionStart,editor.selectionEnd);
 if(selected&&selected.length<200&&!selected.includes('\n'))$('find-input').value=selected;
 updateFindCount();(showReplace?$('replace-input'):$('find-input')).focus();if(!showReplace)$('find-input').select();}
function findStep(direction=1){const matches=updateFindCount();if(!matches.length)return;const t=$('code-editor');
 const current=selectedMatch(matches);let chosen;
 if(current>=0)chosen=matches[(current+direction+matches.length)%matches.length];
 else if(direction>0)chosen=matches.find(m=>m.start>=t.selectionEnd)||matches[0];
 else chosen=[...matches].reverse().find(m=>m.end<=t.selectionStart)||matches[matches.length-1];
 t.focus();t.setSelectionRange(chosen.start,chosen.end);updateCursor();updateFindCount();}
function replaceCurrent(){if(!state.active)return;const matches=updateFindCount();if(!matches.length)return toast('Tidak ada teks yang cocok.',true);
 const t=$('code-editor');const current=selectedMatch(matches);
 const match=current>=0?matches[current]:(matches.find(m=>m.start>=t.selectionEnd)||matches[0]);
 const replacement=$('replace-input').value;
 const content=findEngine.applyOne(t.value,match,replacement);
 changeEditor(content,match.start+replacement.length);
 const remaining=updateFindCount(),next=remaining.find(m=>m.start>=match.start+replacement.length)||remaining[0];
 if(next){t.setSelectionRange(next.start,next.end);updateCursor();updateFindCount();}
 toast('1 kecocokan diganti di '+state.active);}
function replaceEvery(){if(!state.active)return;const matches=updateFindCount();if(!matches.length)return toast('Tidak ada teks yang cocok.',true);
 const result=findEngine.applyAll($('code-editor').value,matches,$('replace-input').value);
 changeEditor(result.content,Math.min($('code-editor').selectionStart,result.content.length));updateFindCount();toast(`${result.count} kecocokan diganti di ${state.active}.`);}
$('find-code').onclick=()=>openFind(true);
$('find-next').onclick=()=>findStep(1);$('find-prev').onclick=()=>findStep(-1);
$('find-input').addEventListener('input',updateFindCount);
$('find-case').addEventListener('change',updateFindCount);$('find-word').addEventListener('change',updateFindCount);
$('find-input').addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();findStep(e.shiftKey?-1:1);}});
$('replace-input').addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();if(e.ctrlKey||e.metaKey)replaceEvery();else replaceCurrent();}});
$('replace-one').onclick=replaceCurrent;$('replace-all').onclick=replaceEvery;
$('find-close').onclick=closeFind;
$('code-editor').addEventListener('input',()=>{if(!$('findbar').classList.contains('hidden'))updateFindCount()});
function toggleConsole(force){const show=force===undefined?$('console').classList.contains('hidden'):force;$('console').classList.toggle('hidden',!show)}
$('toggle-console').onclick=()=>toggleConsole();$('close-console').onclick=()=>toggleConsole(false);$('copy-log').onclick=()=>{navigator.clipboard?.writeText(state.log).then(()=>toast('Log tersalin.')).catch(()=>toast('Clipboard tidak tersedia.',true))};
function activeTex(){return state.active?.toLowerCase().endsWith('.tex')?state.active:null;}
function syncCompileTarget(){
 const file=activeTex();$('compile-target').textContent=file?'Target: '+file:'Pilih tab .tex';
 $('compile').disabled=state.build||!file;$('clean-compile').disabled=state.build||!file;
}
function hidePreview(){
 $('pdf-frame').classList.add('hidden');$('pdf-frame').removeAttribute('src');$('pdf-empty').classList.remove('hidden');
 state.preview=false;state.previewFile=null;$('preview-version').textContent='Belum dikompilasi';
}
function refreshPdf(file=activeTex()){
 if(!state.project||!file)return;
 $('pdf-frame').src=`/api/projects/${state.project.id}/pdf?file=${encodeURIComponent(file)}&t=${Date.now()}#toolbar=1&navpanes=0`;
 $('pdf-frame').classList.remove('hidden');$('pdf-empty').classList.add('hidden');
 state.preview=true;state.previewFile=file;$('preview-version').textContent='PDF: '+file;
}
async function updatePreviewForActive(){
 const file=activeTex(),project=state.project;if(!project||!file){hidePreview();return;}
 const selected=file;
 try{const r=await fetch(`/api/projects/${project.id}/pdf?file=${encodeURIComponent(selected)}`,{method:'HEAD'});
  if(!state.project||state.project.id!==project.id||activeTex()!==selected)return;
  if(r.ok)refreshPdf(selected);else hidePreview();
 }catch{if(state.project?.id===project.id&&activeTex()===selected)hidePreview()}
}
$('refresh-pdf').onclick=()=>{if(state.preview&&state.previewFile===activeTex())refreshPdf();else toast('Compile file .tex yang aktif terlebih dahulu.')};
$('download-pdf').onclick=()=>{if(!state.preview||state.previewFile!==activeTex())return toast('Belum ada PDF untuk file ini.',true);const a=document.createElement('a');a.href=`/api/projects/${state.project.id}/pdf?file=${encodeURIComponent(state.previewFile)}`;a.download=state.previewFile.split('/').pop().replace(/\.tex$/i,'.pdf');a.click()};
function renderBuildSummary(result){
 const node=$('build-summary');node.innerHTML='';
 const diagnostics=result.diagnostics||[];state.diagnostics=result.ok?[]:diagnostics;renderCode();
 if(result.ok){node.classList.add('hidden');return;}
 node.classList.remove('hidden');
 const headline=document.createElement('strong');headline.textContent=result.summary||'Kompilasi gagal';node.append(headline);
 if(diagnostics.length){
  const list=document.createElement('div');list.className='diagnostic-list';
  for(const d of diagnostics.slice(0,8)){
   const file=String(d.file||''),line=Number(d.line||0),entry=document.createElement('button');entry.type='button';entry.className='diagnostic-item';
   const prefix=file?(file+(line?':'+line:'')):'LaTeX';entry.textContent=prefix+' — '+d.message;
   if(file){entry.title='Buka file dan sorot baris error';entry.onclick=async()=>{try{await openFile(file);if(line>0){jumpToLine(line);}}catch(e){toast('Tidak dapat membuka '+file+': '+e.message,true)}};}
   else entry.disabled=true;
   list.append(entry);
  }
  node.append(list);
 }
}
async function buildPdf(clean=false){
 if(state.build||!state.project)return;
 const source=activeTex();if(!source)return toast('Pilih tab file .tex sebelum Compile.',true);
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
  const pending=api(`/api/projects/${projectId}/build`,'POST',{engine:$('engine').value,clean,file:source});
  interval=setInterval(update,900);await update();
  const result=await pending;
  state.log=result.log||'';$('log-text').textContent=state.log||'(Tidak ada output)';renderBuildSummary(result);
  if(result.ok){if(state.project?.id===projectId&&activeTex()===source){refreshPdf(source);$('preview-version').textContent='Built '+source+' · '+new Date().toLocaleTimeString('id-ID');}toast(clean?'Clean & Recompile berhasil.':'Kompilasi berhasil. PDF diperbarui.');statusText('Build success');}
  else {toggleConsole(true);$('preview-version').textContent=result.pdfExists?'Build failed (PDF lama)':'Compilation failed';toast(result.summary||'Kompilasi gagal — periksa error.',true);statusText('Build error');}
 }catch(e){state.log=e.message;$('log-text').textContent=e.message;renderBuildSummary({summary:e.message});toggleConsole(true);toast(e.message,true);$('preview-version').textContent='Compiler error';}
 finally{clearInterval(interval);state.build=false;btn.disabled=false;cleanBtn.disabled=false;stopBtn.classList.add('hidden');$('compile-label').textContent='Compile';syncCompileTarget();}
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
function configureDialog(){
 const project=Boolean(state.view==='editor'&&state.config&&state.project);
 const projectFields=project?`<div class="settings-group"><h3>Proyek</h3><label>Nama proyek</label><input id="setting-project-name" value="${esc(state.config.name||'')}"><label>Main document (.tex)</label><input id="setting-main" value="${esc(state.config.main||'main.tex')}"><p>Compile selalu menggunakan tab .tex yang aktif. Main document menentukan file yang dibuka pertama kali.</p></div>`:'';
 modal('Pengaturan EK TeX',`<div class="settings-group"><h3>Tampilan editor</h3><label for="setting-theme">Palet tema</label><select id="setting-theme" class="settings-select">${Object.entries(features.themes).map(([id,v])=>`<option value="${id}" ${id===state.theme?'selected':''}>${v.label}</option>`).join('')}</select><label for="setting-mode">Mode</label><select id="setting-mode" class="settings-select"><option value="dark" ${state.mode==='dark'?'selected':''}>Gelap (Dark)</option><option value="light" ${state.mode==='light'?'selected':''}>Terang (Light)</option></select><div id="theme-preview" class="theme-preview" aria-label="Pratinjau palet tema"></div><p>Pengaturan tampilan diterapkan langsung dan diingat oleh browser ini.</p></div>${projectFields}<p>Workspace lokal:</p><div class="settings-code" id="workspace-path">Memuat...</div>`,project?modalButtons('Simpan pengaturan'):'<button class="btn primary" data-cancel>Tutup</button>','SETTINGS');
 const preview=()=>{$('theme-preview').innerHTML=Object.entries(features.themes).map(([id,v])=>`<button class="theme-swatch${state.theme===id?' selected':''}" data-theme-choice="${id}" type="button" title="${v.label}"><span style="--swatch-color:${v.accent}"></span><small>${v.label}</small></button>`).join('');document.querySelectorAll('[data-theme-choice]').forEach(b=>b.onclick=()=>{applyAppearance(b.dataset.themeChoice,state.mode);$('setting-theme').value=state.theme;preview()})};
 $('setting-theme').onchange=e=>{applyAppearance(e.target.value,state.mode);preview()};
 $('setting-mode').onchange=e=>applyAppearance(state.theme,e.target.value);
 preview();api('/api/status').then(s=>{if($('workspace-path'))$('workspace-path').textContent=s.workspace}).catch(()=>{});
 if(project)$('modal-apply').onclick=async()=>{try{state.config=await api(`/api/projects/${state.project.id}/config`,'PATCH',{name:$('setting-project-name').value,main:$('setting-main').value});$('project-name').textContent=state.config.name;$('sidebar-project').textContent=state.config.name;await loadProjects();closeModal();toast('Pengaturan tersimpan.')}catch(e){toast(e.message,true)}};
}

$('open-settings').onclick=configureDialog;
$('dashboard-settings').onclick=configureDialog;
function helpDialog(){modal('Setup compiler otomatis',`<p>Instalasi sekarang <strong>terintegrasi dengan launcher</strong>. Anda tidak perlu memasang latexmk satu per satu.</p><p><strong>Windows:</strong> Tutup server, lalu jalankan <code>start-windows.bat</code>. Launcher memeriksa Node.js, MiKTeX, Strawberry Perl, dan latexmk, kemudian menawarkan instalasi melalui WinGet.</p><div class="settings-code">start-windows.bat
# Alternatif di PowerShell: ./setup-windows.ps1</div><p><strong>Ubuntu / Debian / Orange Pi:</strong></p><div class="settings-code">chmod +x start-linux.sh setup-linux.sh
./start-linux.sh</div><p>Perlu koneksi internet pada instalasi pertama dan untuk paket LaTeX yang belum terpasang. Jika installer gagal, periksa izin administrator/sudo dan pesan kesalahan di terminal.</p>`,`<button class="btn primary" data-cancel>Mengerti</button>`,'INSTALLER');}
$('help-compile').onclick=helpDialog;$('preview-help').onclick=helpDialog;
$('show-shortcuts').onclick=()=>modal('Pintasan keyboard',`<p><strong>Ctrl + S</strong> — Simpan semua file</p><p><strong>Ctrl + Enter</strong> — Compile & refresh PDF</p><p><strong>Ctrl + F</strong> — Cari teks dalam dokumen</p><p><strong>Tab</strong> — Indent 2 spasi</p><p><strong>Shift + Tab</strong> — Hapus indent</p><p><strong>\</strong> — Tampilkan saran perintah LaTeX; panah ↑↓, Enter/Tab untuk memilih</p><p><strong>Esc</strong> — Tutup dialog biasa/autocomplete; popup Referensi hanya lewat tombol X</p>`,`<button class="btn primary" data-cancel>Oke</button>`,'SHORTCUTS');
$('insert-figure').onclick=()=>insertCode(snippets.find(x=>x.title==='Figure').code);
$('insert-cite').onclick=async()=>{try{await saveAll();const bib=await api(`/api/projects/${state.project.id}/file?path=references.bib`);const keys=[...bib.content.matchAll(/@\w+\s*\{\s*([^,\s]+)/g)].map(x=>x[1]);modal('Sisipkan kutipan',`<label>Citation key</label><input id="cite-key" list="cite-suggestions" value="${esc(keys[0]||'')}"><datalist id="cite-suggestions">${keys.map(k=>`<option value="${esc(k)}">`).join('')}</datalist><p>Pilih salah satu key dari references.bib, lalu tambahkan pada posisi kursor.</p>`,modalButtons('Sisipkan citation'),'BIBLIOGRAPHY');$('modal-apply').onclick=()=>{const key=$('cite-key').value.trim();closeModal();insertCode(`\\cite{${key}}`)};}catch(e){toast(e.message,true);setSide('references')}};
function renderSnippets(){const host=$('snippets');host.innerHTML=snippets.map((s,i)=>`<button class="snippet-btn" data-snippet="${i}"><span>${esc(s.title)}</span><code>${esc(s.short)}</code></button>`).join('');host.querySelectorAll('button').forEach(b=>b.onclick=()=>insertCode(snippets[Number(b.dataset.snippet)].code));}
async function addBib(r,options={}){if(!state.project)throw new Error('Pilih proyek sebelum menyimpan bibliografi.');try{let p='references.bib';if(state.docs.has(p)&&state.docs.get(p).dirty)await savePath(p);let doc=await api(`/api/projects/${state.project.id}/file?path=references.bib`);let prev=doc.content;
 if(r.doi){const old=bibliographyEntries(prev).find(e=>e.doi.toLowerCase()===r.doi.toLowerCase());if(old){toast('DOI sudah ada di library (key: '+old.key+').');return old.key;}}
 let key=r.key,idx=2;while(new RegExp('@\\w+\\s*\\{\\s*'+key+'\\s*,','i').test(prev)){key=r.key+idx++;}
 let bib=key!==r.key?r.bib.replace(/^(@\w+\{)[^,]+/,`$1${key}`):r.bib;const next=prev.trimEnd()+'\n\n'+bib;
 await api(`/api/projects/${state.project.id}/file`,'PUT',{path:p,content:next});if(state.docs.has(p)){const old=state.docs.get(p);old.content=next;old.dirty=false;if(state.active===p){$('code-editor').value=next;renderCode()}}
 syncSaveIndicator();toast('Referensi '+key+' ditambahkan ke references.bib.');if(!options.keepEditor)await openFile(p);await reloadTree();return key;}catch(e){toast(e.message,true);throw e;}}
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
  toast('Memperbarui metadata dari Crossref...');
  let next=doc.content,okay=0,failed=[];
  for(const entry of entries.slice().reverse()){
   try{const meta=await api('/api/doi?doi='+encodeURIComponent(entry.doi));
    const newBib=meta.bib.replace(/^(@\w+\{)[^,]+/,(_,a)=>a+entry.key).trimEnd();
    next=next.slice(0,entry.start)+newBib+next.slice(entry.end);okay++;
   }catch(e){failed.push(entry.doi);}
  }
  if(okay){await api(`/api/projects/${state.project.id}/file`,'PUT',{path:p,content:next});if(state.docs.has(p)){const d=state.docs.get(p);d.content=next;d.dirty=false;if(state.active===p){$('code-editor').value=next;renderCode()}}syncSaveIndicator();}
  
  toast(`${okay} metadata DOI berhasil diperbarui${failed.length?' ('+failed.length+' gagal)':''}.`,!!failed.length);
 }catch(e){toast(e.message,true)}
}

async function init(){
 renderSnippets();showDashboard();
 try{
  const s=await api('/api/status');
  const ready=s.latexmk&&s.pdflatex;
  $('compiler-status').innerHTML=`<span class="status-dot ${ready?'green':'amber'}"></span><span>${ready?'LaTeX ready':'Compiler belum siap'}</span>`;
  $('dash-compiler').textContent=ready?'READY':'NEEDS SETUP';
  $('dash-compiler').classList.toggle('needs-setup',!ready);
  $('hermes-status').textContent=s.hermes?'Hermes terdeteksi':'Hermes belum terpasang';
  $('pandoc-status').textContent=s.pandoc?'Pandoc terdeteksi':'Pandoc belum terpasang';
  $('dash-compiler-note').textContent=ready?'latexmk & pdfLaTeX terdeteksi':'Jalankan ulang launcher untuk setup';
  await loadProjects();
  if(!ready)toast('Compiler belum terdeteksi. Jalankan setup-windows.ps1 / setup-linux.sh.',true);
 }catch(e){toast('Gagal memuat dashboard: '+e.message,true);$('dash-compiler').textContent='OFFLINE';}
}
init();


// EK TeX v2.5: Offline diagnostics, optional Hermes Agent, Pandoc conversion.
async function showDebugger(){
 if(!state.project)return;
 setSide('tools');$('debug-report').textContent='Menganalisis log...';
 try{const r=await api(`/api/projects/${state.project.id}/diagnose?file=${encodeURIComponent(activeTex()||state.config.main)}`);
  $('debug-report').replaceChildren();
  if(r.diagnostics?.length){state.diagnostics=r.diagnostics;renderCode();const h=document.createElement('p');h.className='debug-location-hint';h.textContent=`${r.diagnostics.length} lokasi error terdeteksi. Klik error pada Output untuk menuju barisnya.`;$('debug-report').append(h);}
  for(const issue of r.issues){const card=document.createElement('div');card.className='debug-issue';
   const h=document.createElement('strong');h.textContent=issue.title;const d=document.createElement('p');d.textContent=issue.detail;
   const f=document.createElement('code');f.textContent=issue.fix;card.append(h,d,f);$('debug-report').append(card);}
  $('hermes-status').textContent=r.hermes?'Hermes terdeteksi (butuh model/akun yang sudah dikonfigurasi).':'Hermes belum terdeteksi. Debugger offline tetap tersedia.';
  $('pandoc-status').textContent=r.pandoc?'Pandoc tersedia.':'Pandoc belum tersedia. Jalankan setup ulang.';
 }catch(e){$('debug-report').textContent=e.message;toast(e.message,true)}
}
$('run-debugger').onclick=showDebugger;
$('open-debugger').onclick=showDebugger;
$('hermes-diagnose').onclick=async()=>{
 if(!state.project)return;
 try{
  await saveAll();const btn=$('hermes-diagnose');btn.disabled=true;btn.textContent='Hermes sedang menganalisis...';
  toast('Meminta saran Hermes. Kode tidak akan diubah otomatis.');
  const response=await api(`/api/projects/${state.project.id}/hermes/suggest`,'POST',{file:(state.active||state.config.main).endsWith('.tex')?(state.active||state.config.main):state.config.main});
  const explanation=esc(response.explanation);
  if(!response.canApply){modal('Hasil diagnosis Hermes',`<p class="muted">${explanation}</p><p>Tidak ada perubahan kode yang dapat diterapkan dengan aman. Periksa saran di atas.</p>`,`<button class="btn primary" data-cancel>Tutup</button>`,'AI DEBUGGER');return;}
  modal('Tinjau perbaikan Hermes',`<p>${explanation}</p><p class="muted">Periksa penggantian teks berikut. Backup dibuat sebelum penerapan.</p><label>Teks lama</label><pre class="diff-before">${esc(response.find)}</pre><label>Teks pengganti</label><pre class="diff-after">${esc(response.replace)}</pre><p class="muted">Perubahan hanya berlaku setelah Anda memilih Terapkan.</p>`,modalButtons('Terapkan perbaikan'),'HERMES · REVIEW');
  $('modal-apply').onclick=async()=>{if(!confirm('Terapkan perubahan yang ditinjau? File lama akan dibackup.'))return;
   try{await saveAll();const saved=await api(`/api/projects/${state.project.id}/hermes/apply`,'POST',{proposalId:response.proposalId});
    // Reload the changed file. Discard stale in-memory cache (only after saving).
    state.docs.delete(saved.file);if(state.active===saved.file)state.active=null;await openFile(saved.file);await reloadTree();closeModal();toast('Perbaikan diterapkan. Backup: '+saved.backup);}
   catch(e){toast(e.message,true)}
  };
 }catch(e){toast('Hermes: '+e.message,true);modal('Hermes tidak dapat digunakan',`<p>${esc(e.message)}</p><p>Jika Hermes terpasang, pastikan <code>hermes --version</code> berfungsi dan model sudah dikonfigurasi.</p>`,`<button class="btn primary" data-cancel>Tutup</button>`,'HERMES');}
 finally{$('hermes-diagnose').disabled=false;$('hermes-diagnose').textContent='✦ Minta saran perbaikan AI';}
};
function openConverter(){
 modal('Konversi dokumen',`<p>DOCX, ODT, Markdown, HTML, atau LaTeX dapat dikonversi menggunakan Pandoc. <strong>Hasil LaTeX selalu menjadi proyek baru</strong> dan tidak ditambahkan ke proyek yang sedang dibuka.</p><label>File sumber</label><input id="converter-file-name" readonly placeholder="Pilih file sumber"><button class="btn outline" id="converter-pick">Pilih file...</button><label>Format tujuan</label><select id="converter-target" class="converter-select"><option value="latex">LaTeX (.tex) — buat proyek baru</option><option value="docx">Word (.docx) — unduh</option><option value="markdown">Markdown (.md) — unduh</option><option value="html">HTML (.html) — unduh</option></select><label>Nama proyek hasil konversi (khusus LaTeX)</label><input id="converter-project-name" maxlength="100" placeholder="Nama proyek baru"><p class="muted">Gambar dari DOCX diekstrak ke folder media proyek baru. Konversi format lain menghasilkan unduhan. Periksa persamaan, tabel, dan sitasi setelah konversi.</p>`,modalButtons('Mulai konversi'),'DOCUMENT CONVERTER');
 $('convert-input').value='';$('converter-pick').onclick=()=>$('convert-input').click();
 $('converter-target').onchange=()=>{$('converter-project-name').disabled=$('converter-target').value!=='latex'};
 $('convert-input').onchange=e=>{const file=e.target.files?.[0];$('converter-file-name').value=file?.name||'';if(file)$('converter-project-name').value=file.name.replace(/\.[^.]+$/,'').slice(0,100);};
 $('modal-apply').onclick=async()=>{
  const file=$('convert-input').files?.[0],to=$('converter-target').value;
  if(!file)return toast('Pilih file terlebih dahulu.',true);
  if(file.size>12*1024*1024)return toast('File melebihi 12 MB.',true);
  const btn=$('modal-apply');btn.disabled=true;btn.textContent='Converting...';
  try{
   const data=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result).split(',')[1]);reader.onerror=reject;reader.readAsDataURL(file)});
   const result=await api('/api/convert','POST',{name:file.name,data,to,projectName:$('converter-project-name').value.trim()});
   if(result.type==='project'){if(state.project)await saveAll();await loadProjects();closeModal();await chooseProject(result.project.id);toast('Proyek konversi baru dibuat: '+result.project.name);}
   else{const bytes=atob(result.data),array=new Uint8Array(bytes.length);for(let i=0;i<bytes.length;i++)array[i]=bytes.charCodeAt(i);const url=URL.createObjectURL(new Blob([array]));const a=document.createElement('a');a.href=url;a.download=result.name;a.click();setTimeout(()=>URL.revokeObjectURL(url),3000);closeModal();toast('Konversi selesai: '+result.name);}
  }catch(e){toast(e.message,true)}finally{btn.disabled=false;btn.textContent='Mulai konversi';$('convert-input').value='';}
 };
}
$('convert-open').onclick=openConverter;

// Reference search UI integration. The dedicated popup lives in reference-ui.js.
window.EKTeXReferenceBridge={api,toast,getProject:()=>state.project,getActive:()=>state.active,getText:()=>$('code-editor').value,getTitle:()=>{const code=$('code-editor').value;const title=code.match(/\\title(?:\[[^\]]*\])?\{([^}]{3,240})\}/);return title?.[1]||state.config?.name||state.project?.name||''},addBib,saveAll,updateBibOnline,insertCitation:(context,key)=>{
 if(!context||!key||!state.project||state.project.id!==context.project||state.active!==context.file)return false;
 const editor=$('code-editor');const content=editor.value;
 if(content!==context.source||content.slice(context.start,context.end)!==context.text)return false;
 const inserted=' \\cite{'+key+'}';const pos=context.end;
 editor.value=content.slice(0,pos)+inserted+content.slice(pos);editor.selectionStart=editor.selectionEnd=pos+inserted.length;
 editor.dispatchEvent(new Event('input',{bubbles:true}));renderCode();return true;
}};
