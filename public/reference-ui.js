'use strict';
/* EK TeX reference discovery dialog. No backdrop/Escape dismissal. */
(()=>{
 const bridge=window.EKTeXReferenceBridge;
 const $=id=>document.getElementById(id);
 const overlay=$('reference-overlay'),dialog=overlay.querySelector('.reference-dialog'),floating=$('reference-selection-action');
 const editor=$('code-editor');
 let selection=null,requestSerial=0,lastFocus=null,results=[],working=false;
 const abstractCache=new Map();
 const open=()=>!overlay.classList.contains('hidden');
 const text=(id,value)=>{$(id).textContent=value};
 function snapshot(){
   if(!bridge.getProject()||!bridge.getActive()?.toLowerCase().endsWith('.tex'))return null;
   const start=editor.selectionStart,end=editor.selectionEnd,selected=editor.value.slice(start,end).trim();
   if(end-start<12||end-start>1700||selected.length<12)return null;
   return {file:bridge.getActive(),project:bridge.getProject().id,start,end,text:editor.value.slice(start,end),source:editor.value};
 }
 function updateSelectionButton(e){
   if(open()||document.activeElement!==editor){floating.classList.add('hidden');return;}
   const selected=snapshot();if(!selected){floating.classList.add('hidden');return;}
   selection=selected;
   const region=editor.closest('.editor-surface').getBoundingClientRect();
   const x=(e?.clientX>0?e.clientX:region.left+region.width*.55)-region.left;
   const y=(e?.clientY>0?e.clientY:region.top+70)-region.top;
   floating.style.left=Math.max(70,Math.min(x,region.width-180))+'px';
   floating.style.top=Math.max(6,Math.min(y-54,region.height-48))+'px';
   floating.classList.remove('hidden');
 }
 editor.addEventListener('mouseup',updateSelectionButton);
 editor.addEventListener('keyup',e=>{if(['Shift','ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','End'].includes(e.key))updateSelectionButton()});
 editor.addEventListener('input',()=>floating.classList.add('hidden'));
 floating.addEventListener('mousedown',e=>e.preventDefault());
 floating.onclick=()=>openSearch(selection);
 function setResultsMessage(message){$('ref-dialog-results').replaceChildren();const p=document.createElement('p');p.className='reference-empty';p.textContent=message;$('ref-dialog-results').append(p)}
 function openSearch(context=null){
   lastFocus=document.activeElement;
   selection=context&&context.project===bridge.getProject()?.id?context:null;
   requestSerial++;
   overlay.classList.remove('hidden');floating.classList.add('hidden');
   $('reference-selection-context').classList.toggle('hidden',!selection);
   $('ref-title').value='';$('ref-author').value='';$('ref-doi').value='';$('reference-keywords').value='';
   setResultsMessage('Cari berdasarkan judul, penulis, atau DOI.');
   if(selection){
     text('reference-quote',selection.text.trim().slice(0,1100));
     text('reference-project-title',bridge.getTitle());
     analyzeSelection();
   }else $('ref-title').focus();
   if(selection)$('reference-keywords').focus();
 }
 function closeSearch(){
   requestSerial++;overlay.classList.add('hidden');selection=null;floating.classList.add('hidden');lastFocus?.focus?.();
 }
 $('reference-close').onclick=closeSearch;
 // Prevent accidental dismissal from clicks outside dialog or Escape.
 overlay.addEventListener('mousedown',e=>{if(e.target===overlay)e.preventDefault();});
 overlay.addEventListener('click',e=>{if(e.target===overlay){e.preventDefault();e.stopPropagation();}});
 overlay.addEventListener('keydown',e=>{
   if(e.key==='Escape'){e.preventDefault();e.stopImmediatePropagation();return;}
   if(e.key!=='Tab')return;
   const focusable=[...dialog.querySelectorAll('button:not(:disabled),input:not(:disabled),a[href]')].filter(x=>x.offsetParent!==null);
   if(!focusable.length)return;
   if(e.shiftKey&&document.activeElement===focusable[0]){e.preventDefault();focusable.at(-1).focus();}
   else if(!e.shiftKey&&document.activeElement===focusable.at(-1)){e.preventDefault();focusable[0].focus();}
 },true);
 document.addEventListener('keydown',e=>{if(open()&&e.key==='Escape'){e.preventDefault();e.stopImmediatePropagation();}},true);
 async function analyzeSelection(){
   if(!selection)return;
   const context=selection,serial=++requestSerial;
   text('reference-ai-status','Hermes sedang menyiapkan kata kunci (jika tersedia)…');
   $('reference-ai-retry').disabled=true;
   try{
     const data=await bridge.api('/api/references/keywords','POST',{sentence:context.text,title:bridge.getTitle()});
     if(serial!==requestSerial||!open())return;
     $('reference-keywords').value=data.query||data.keywords?.join(' ')||'';
     text('reference-ai-status',(data.source==='hermes'?'✦ Hermes Agent: ':'Analisis lokal: ')+data.message);
   }catch(e){if(serial===requestSerial)text('reference-ai-status','Analisis gagal: '+e.message+' — masukkan kata kunci secara manual.');}
   finally{if(serial===requestSerial)$('reference-ai-retry').disabled=false;}
 }
 $('reference-ai-retry').onclick=analyzeSelection;
 function makeButton(label,action,style=''){const b=document.createElement('button');b.type='button';b.className='btn '+style;b.textContent=label;b.onclick=action;return b;}
 function renderResults(items){
   const host=$('ref-dialog-results');host.replaceChildren();results=items;
   if(!items.length){setResultsMessage('Publikasi tidak ditemukan. Coba kata kunci lebih singkat, atau gunakan DOI.');return;}
   for(const record of items){
     const c=document.createElement('article');c.className='reference-item';
     const heading=document.createElement('button');heading.type='button';heading.className='reference-item-heading';
     heading.setAttribute('aria-expanded','false');heading.setAttribute('aria-label','Baca abstrak: '+(record.title||'Tanpa judul'));
     const h=document.createElement('h3');h.textContent=record.title||'Tanpa judul';
     const caret=document.createElement('span');caret.className='reference-item-caret';caret.textContent='⌄';caret.setAttribute('aria-hidden','true');
     heading.append(h,caret);c.append(heading);
     const m=document.createElement('p');m.className='reference-item-meta';m.textContent=[String(record.authors||'').replace(/ and /g,', ').slice(0,220),[record.venue,record.year].filter(Boolean).join(' · ')].filter(Boolean).join('  |  ');c.append(m);
     const hint=document.createElement('p');hint.className='reference-open-hint';hint.textContent='Klik publikasi untuk membaca abstrak';c.append(hint);
     const abstractPanel=document.createElement('section');abstractPanel.className='reference-abstract hidden';
     abstractPanel.setAttribute('aria-label','Abstrak publikasi');c.append(abstractPanel);
     let requested=false;
     const setAbstract=(abstract,source)=>{
       abstractPanel.replaceChildren();
       const label=document.createElement('strong');label.textContent='Abstrak';abstractPanel.append(label);
       if(abstract){
         const paragraph=document.createElement('p');paragraph.className='reference-abstract-text';paragraph.textContent=abstract;abstractPanel.append(paragraph);
         const attribution=document.createElement('small');attribution.textContent='Sumber abstrak: '+(source||'metadata publikasi');abstractPanel.append(attribution);
       }else{
         const missing=document.createElement('p');missing.className='reference-abstract-empty';
         missing.textContent=record.doi?'Abstrak tidak ditemukan melalui Crossref atau OpenAlex, atau layanan sedang tidak dapat diakses. Gunakan DOI untuk melihat artikel pada penerbit.':'Abstrak tidak disertakan pada metadata hasil pencarian, dan DOI tidak tersedia untuk mencari ke sumber lain.';
         abstractPanel.append(missing);
       }
     };
     const toggleAbstract=async()=>{
       const expanding=abstractPanel.classList.contains('hidden');
       abstractPanel.classList.toggle('hidden',!expanding);
       heading.setAttribute('aria-expanded',String(expanding));
       c.classList.toggle('reference-expanded',expanding);
       hint.textContent=expanding?'Klik lagi untuk menyembunyikan abstrak':'Klik publikasi untuk membaca abstrak';
       if(!expanding||requested)return;
       requested=true;
       if(record.abstract){setAbstract(record.abstract,record.abstractSource||'Crossref');return;}
       if(!record.doi){setAbstract('',null);return;}
       const cached=abstractCache.get(record.doi.toLowerCase());
       if(cached){setAbstract(cached.abstract,cached.source);return;}
       const loading=document.createElement('p');loading.className='reference-abstract-loading';loading.textContent='Mengambil abstrak dari Crossref / OpenAlex…';abstractPanel.append(loading);
       const serial=requestSerial;
       try{
         const data=await bridge.api('/api/references/abstract?doi='+encodeURIComponent(record.doi));
         if(serial!==requestSerial||!c.isConnected)return;
         abstractCache.set(record.doi.toLowerCase(),data);
         // Keep the panel collapsed if the reader closed it during the request.
         setAbstract(data.abstract||'',data.source);
       }catch(e){
         if(serial!==requestSerial||!c.isConnected)return;
         abstractPanel.replaceChildren();
         const error=document.createElement('p');error.className='reference-abstract-empty';
         error.textContent='Abstrak belum dapat dimuat: '+e.message+'. Coba lagi saat internet tersedia.';abstractPanel.append(error);
         requested=false;
       }
     };
     heading.onclick=toggleAbstract;
     c.onclick=e=>{if(!e.target.closest('a,button,input,textarea'))toggleAbstract();};
     const foot=document.createElement('div');foot.className='reference-item-actions';
     if(record.doi){const doi=document.createElement('a');doi.textContent='DOI: '+record.doi;doi.href='https://doi.org/'+encodeURI(record.doi);doi.target='_blank';doi.rel='noopener noreferrer';foot.append(doi);}
     const save=makeButton('＋ Simpan ke BibTeX',async()=>{
       if(!bridge.getProject())return bridge.toast('Buka proyek sebelum menyimpan referensi.',true);
       save.disabled=true;
       try{
         const key=await bridge.addBib(record,{keepEditor:true});
         if(key){save.textContent='✓ Tersimpan';save.classList.add('reference-saved');}
       }catch(e){save.disabled=false;bridge.toast(e.message,true);}
     });foot.append(save);
     if(selection){
       const cite=makeButton('＋ Simpan & kutip',async()=>{
         cite.disabled=true;
         try{
           const key=await bridge.addBib(record,{keepEditor:true});
           if(key){const inserted=bridge.insertCitation(selection,key);if(inserted){selection=null;text('reference-ai-status','Sitasi disisipkan setelah teks yang dipilih.');}else bridge.toast('Referensi tersimpan, tetapi teks atau tab sudah berubah. Sisipkan citation secara manual.',true);}
         }catch(e){bridge.toast(e.message,true)}finally{cite.disabled=false;}
       },'primary');foot.append(cite);
     }
     c.append(foot);host.append(c);
   }
 }
 async function search(title,author,doi){
   if(working)return;
   const serial=++requestSerial;
   if(!doi&&title.trim().length<3&&author.trim().length<3)return bridge.toast('Isi judul atau nama penulis minimal 3 karakter.',true);
   working=true;setResultsMessage('Sedang mencari metadata publikasi dari Crossref…');
   try{
     const path=doi?'/api/doi?doi='+encodeURIComponent(doi):'/api/search?'+new URLSearchParams({title,author}).toString();
     const data=await bridge.api(path);
     if(serial===requestSerial&&open())renderResults(Array.isArray(data)?data:[data]);
   }catch(e){if(serial===requestSerial){setResultsMessage('Gagal mencari referensi: '+e.message);bridge.toast(e.message,true);}}
   finally{working=false;}
 }
 $('ref-manual-search').onclick=()=>search($('ref-title').value,$('ref-author').value,'');
 $('ref-doi-search').onclick=()=>search('','',$('ref-doi').value.trim());
 $('reference-search-keywords').onclick=()=>search($('reference-keywords').value,'','');
 for(const id of ['ref-title','ref-author'])$(id).addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();$('ref-manual-search').click();}});
 $('ref-doi').onkeydown=e=>{if(e.key==='Enter')$('ref-doi-search').click()};
 $('reference-keywords').onkeydown=e=>{if(e.key==='Enter')$('reference-search-keywords').click()};
 $('ref-update-library').onclick=async()=>{if(!bridge.getProject())return bridge.toast('Pilih proyek terlebih dahulu.',true);await bridge.updateBibOnline()};
 $('reference-open-sidebar').onclick=()=>openSearch();
 $('open-reference-search').onclick=()=>openSearch();
 $('dashboard-references').onclick=()=>openSearch();
 window.EKTeXReferences={open:openSearch,close:closeSearch};
})();
