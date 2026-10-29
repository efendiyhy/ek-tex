'use strict';
// Chat runs only through EK TeX's loopback server. Model output is always inert text.
(function(){
 const $=id=>document.getElementById(id);
 const panel=$('ai-drawer'),messages=$('ai-messages'),input=$('ai-input');
 const ui={mode:'ask',busy:false,history:[],activeProject:null,models:[],selection:null};
 const intro='Blok teks di editor, pilih Ganti teks, kemudian tinjau hasil penggantian dari model AI sebelum menerapkan.';
 function storageKey(){return 'ektex-ai-history-'+(state.project?.id||'none')}
 function persist(){try{localStorage.setItem(storageKey(),JSON.stringify(ui.history.slice(-24)))}catch{}}
 function record(role,content){ui.history.push({role,content});ui.history=ui.history.slice(-24);persist()}
 function createMessage(role,text,model=''){
  const item=document.createElement('div');item.className='ai-message '+role;
  const meta=document.createElement('span');meta.className='ai-meta';meta.textContent=role==='user'?'ANDA':model?'AI · '+model:'ASISTEN AI';
  const content=document.createElement('span');content.textContent=text;item.append(meta,content);messages.append(item);messages.scrollTop=messages.scrollHeight;
  return item;
 }
 function resetView(){messages.replaceChildren();if(!ui.history.length){const welcome=document.createElement('div');welcome.className='ai-welcome';welcome.textContent=intro;messages.append(welcome);}else ui.history.forEach(m=>createMessage(m.role,m.content));}
 function loadHistory(){const id=state.project?.id;if(ui.activeProject===id)return;ui.activeProject=id;ui.history=[];
  try{const saved=JSON.parse(localStorage.getItem(storageKey())||'[]');if(Array.isArray(saved))ui.history=saved.filter(m=>m&&['user','assistant'].includes(m.role)&&typeof m.content==='string').slice(-24)}catch{}
  resetView();}
 function selected(){
  const t=$('code-editor');if(!state.active?.endsWith('.tex'))return null;
  const start=t.selectionStart,end=t.selectionEnd;
  if(end<=start||end-start>14000)return null;
  return {start,end,text:t.value.slice(start,end)};
 }
 function updateContext(){
  const file=state.active?.endsWith('.tex')?state.active:null;
  const selection=selected();if(selection)ui.selection={...selection,file};
  else if(ui.selection&&(ui.selection.file!==file||$('code-editor').value.slice(ui.selection.start,ui.selection.end)!==ui.selection.text))ui.selection=null;
  $('ai-context-info').textContent=file?`File aktif: ${file}${ui.selection?.file===file?' · '+ui.selection.text.length+' karakter terpilih':''}`:'Buka file .tex untuk memakai asisten.';
  $('ai-selection-label').textContent=ui.selection?.file===file?'Konteks: teks terpilih':'Konteks: file aktif';
  $('ai-quick-selection').classList.toggle('hidden',!selection||state.view!=='editor');
 $('ai-launcher').classList.toggle('hidden',state.view!=='editor');
 }
 async function status(){
  try{const s=await api('/api/ai/status');ui.models=s.models||[];$('ai-provider-status').textContent=`${s.hermes?'✓ Hermes tersedia':'Hermes belum ada'} · ${ui.models.length?ui.models.length+' model Ollama tersedia':'Ollama belum ada model'}`;
   const model=$('ai-model');const chosen=localPref.get('ektex-ai-model');model.replaceChildren();
   for(const m of ui.models){const opt=document.createElement('option');opt.value=m;opt.textContent=m;model.append(opt)}
   if(ui.models.includes(chosen))model.value=chosen;
   if(!ui.models.length){const opt=document.createElement('option');opt.textContent='Tidak ada model';model.append(opt)}
   syncProvider();
  }catch(e){$('ai-provider-status').textContent='Gagal mendeteksi AI: '+e.message;}
 }
 function syncProvider(){const provider=$('ai-provider').value;$('ai-model').disabled=provider==='hermes';localPref.set('ektex-ai-provider',provider)}
 function open(){if(!state.project||state.view!=='editor')return toast('Pilih proyek LaTeX dahulu.',true);loadHistory();updateContext();panel.classList.remove('hidden');$('ai-launcher').setAttribute('aria-expanded','true');status();input.focus()}
 function close(){panel.classList.add('hidden');$('ai-launcher').setAttribute('aria-expanded','false');$('ai-quick-selection').classList.add('hidden')}
 $('ai-launcher').onclick=()=>panel.classList.contains('hidden')?open():close();$('ai-close').onclick=close;
 $('ai-provider').value=['auto','ollama','hermes'].includes(localPref.get('ektex-ai-provider'))?localPref.get('ektex-ai-provider'):'auto';
 $('ai-provider').onchange=syncProvider;$('ai-model').onchange=()=>localPref.set('ektex-ai-model',$('ai-model').value);
 $('ai-clear').onclick=()=>{ui.history=[];ui.selection=null;persist();resetView();updateContext();input.focus()};
 document.querySelectorAll('[data-ai-mode]').forEach(b=>b.onclick=()=>{ui.mode=b.dataset.aiMode;document.querySelectorAll('[data-ai-mode]').forEach(x=>x.classList.toggle('active',x===b));if(!input.value.trim()){const hints={ask:'Apa yang perlu diperbaiki pada dokumen saya?',grammar:'Perbaiki grammar teks yang saya pilih, tanpa mengubah makna.',rewrite:'Tulis ulang teks terpilih dengan gaya akademik yang lebih baik.',replace:'Usulkan penggantian tepat untuk teks yang dipilih. Kembalikan satu edit yang bisa saya tinjau dan terapkan.',clarity:'Buat paragraf ini lebih jelas dan terstruktur.',latex:'Periksa sintaks LaTeX pada teks yang dipilih.',explain:'Jelaskan bagian LaTeX yang saya pilih.'};input.value=hints[ui.mode];}input.focus()});
 function proposalCard(proposal,project){
  const card=document.createElement('section');card.className='ai-proposal';
  const h=document.createElement('strong');h.textContent='Usulan perubahan · '+proposal.file;const note=document.createElement('div');note.textContent='Periksa teks di bawah. EK TeX tidak mengubah file sebelum disetujui.';card.append(h,note);
  const details=document.createElement('details');details.open=true;const sum=document.createElement('summary');sum.textContent='Bandingkan teks lama dan pengganti';details.append(sum);
  for(const [className,label,text] of [['minus','− Sebelum',proposal.find],['plus','+ Sesudah',proposal.replace]]){const title=document.createElement('div');title.textContent=label;const pre=document.createElement('pre');pre.className='ai-diff '+className;pre.textContent=text;details.append(title,pre)}card.append(details);
  const row=document.createElement('div');row.className='ai-proposal-actions';const apply=document.createElement('button');apply.className='ai-apply';apply.textContent='Terapkan perubahan';const reject=document.createElement('button');reject.textContent='Abaikan';row.append(apply,reject);card.append(row);messages.append(card);messages.scrollTop=messages.scrollHeight;
  reject.onclick=()=>{card.remove();toast('Usulan tidak diterapkan.')};
  apply.onclick=async()=>{
   if(state.project?.id!==project)return toast('Proyek sudah berubah, buka proyek asal untuk menerapkan.',true);
   apply.disabled=true;reject.disabled=true;apply.textContent='Memeriksa file...';
   try{await saveAll();await api(`/api/projects/${project}/ai/apply`,'POST',{proposalId:proposal.id});
    const latest=await api(`/api/projects/${project}/file?path=${encodeURIComponent(proposal.file)}`);
    if(state.docs.has(proposal.file)){const doc=state.docs.get(proposal.file);doc.content=latest.content;doc.dirty=false;
     if(state.active===proposal.file){$('code-editor').value=latest.content;renderCode();updateCursor()}}
    syncSaveIndicator();await reloadTree();card.remove();toast('Perubahan diterapkan. Backup file lama dibuat di .latexstudio-backups.');
   }catch(e){toast('Perubahan ditolak: '+e.message,true);apply.disabled=false;reject.disabled=false;apply.textContent='Terapkan perubahan'}
  };
 }
 async function send(){if(ui.busy||!state.project)return;const file=state.active?.endsWith('.tex')?state.active:null;if(!file)return toast('Buka tab .tex untuk memulai percakapan.',true);
  const message=input.value.trim();if(!message)return;const project=state.project.id,history=ui.history.slice(-10);
  let selection=selected()||ui.selection?.file===file&&ui.selection||null;
  if(selection&&$('code-editor').value.slice(selection.start,selection.end)!==selection.text)selection=null;
  ui.busy=true;$('ai-send').disabled=true;$('ai-send').textContent='Memproses...';
  try{await saveAll();record('user',message);createMessage('user',message);input.value='';
   const loading=createMessage('assistant','Sedang memeriksa konteks dokumen...');
   let r;try{r=await api(`/api/projects/${project}/ai/chat`,'POST',{file,mode:ui.mode,message,provider:$('ai-provider').value,model:$('ai-model').value,history,selection})}finally{loading.remove()}
   if(state.project?.id!==project)return;
   createMessage('assistant',r.reply,r.model);record('assistant',r.reply);
   if(r.proposal)proposalCard(r.proposal,project);
   if(r.contextTruncated)toast('File panjang: model membaca sebagian konteks file.',false);
  }catch(e){createMessage('assistant','Tidak dapat terhubung: '+e.message);toast('AI: '+e.message,true)}
  finally{ui.busy=false;$('ai-send').disabled=false;$('ai-send').textContent='Kirim ↗';input.focus();updateContext()}
 }
 $('ai-send').onclick=send;input.addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();send()}});
 $('ai-quick-selection').onclick=()=>{ui.selection=selected()||ui.selection;open();ui.mode='replace';document.querySelectorAll('[data-ai-mode]').forEach(b=>b.classList.toggle('active',b.dataset.aiMode==='replace'));input.value='Usulkan penggantian teks terpilih yang lebih jelas dan akademik, dengan makna, persamaan, dan sitasi tetap sama.';input.focus()};
 $('code-editor').addEventListener('mouseup',updateContext);$('code-editor').addEventListener('keyup',updateContext);$('tabs').addEventListener('click',()=>setTimeout(updateContext,50));
 $('project-picker').addEventListener('click',()=>{close();$('ai-launcher').classList.add('hidden')});$('dashboard').addEventListener('click',()=>{if(state.view==='dashboard'){close();$('ai-launcher').classList.add('hidden')}});
 const workspace=$('editor-workspace');const observer=new MutationObserver(()=>{const visible=!workspace.classList.contains('hidden');$('ai-launcher').classList.toggle('hidden',!visible);if(!visible)close();});observer.observe(workspace,{attributes:true,attributeFilter:['class']});
 $('ai-launcher').classList.toggle('hidden',workspace.classList.contains('hidden'));
 window.EKTeXAI={open,close,updateContext,loadHistory};
})();
