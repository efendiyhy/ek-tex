'use strict';
const assert=require('node:assert/strict');
const fs=require('fs'),os=require('os'),path=require('path'),net=require('net');
const {spawn}=require('child_process');
const {keywordsFallback,parseKeywordResponse,normaliseKeywordInput}=require('../lib/reference-keywords');
const root=path.join(__dirname,'..');
assert.equal(normaliseKeywordInput(' a \n  b '),'a b');
const fallback=keywordsFallback('Temperature compensation reduces baseline drift of metal oxide gas sensors.','Electronic nose temperature calibration');
assert(fallback.keywords.length>=3);assert(/temperature/i.test(fallback.query));
assert.deepEqual(parseKeywordResponse('```json\n{"keywords":["temperature compensation","MOS sensors"],"query":"temperature compensation MOS sensors"}\n```').keywords,['temperature compensation','MOS sensors']);
assert.equal(parseKeywordResponse('not json'),null);
for(const f of ['index.html','reference-ui.js','reference-ui.css'])assert(fs.existsSync(path.join(root,'public',f)));
const html=fs.readFileSync(path.join(root,'public','index.html'),'utf8');
const ui=fs.readFileSync(path.join(root,'public','reference-ui.js'),'utf8');
assert.match(html,/id="reference-overlay"/);assert.match(html,/id="ref-title"/);assert.match(html,/id="ref-author"/);assert.match(html,/id="reference-selection-action"/);
assert.match(ui,/reference-close/);assert.match(ui,/stopImmediatePropagation\(\)/);assert.match(ui,/if\(e\.target===overlay\)\{e\.preventDefault\(\);e\.stopPropagation\(\)/);
function freePort(){return new Promise((ok,bad)=>{const s=net.createServer();s.on('error',bad);s.listen(0,'127.0.0.1',()=>{const v=s.address().port;s.close(()=>ok(v));});});}
(async()=>{
 const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'ektex-references-')),port=await freePort();
 for(const name of ['server.js'])fs.copyFileSync(path.join(root,name),path.join(tmp,name));
 for(const name of ['lib','public'])fs.cpSync(path.join(root,name),path.join(tmp,name),{recursive:true});
 const child=spawn(process.execPath,['server.js'],{cwd:tmp,env:{...process.env,PORT:String(port),PATH:'/usr/bin:/bin'},stdio:'ignore'});
 try{
  let ready=false;for(let n=0;n<50;n++){await new Promise(r=>setTimeout(r,90));try{const res=await fetch(`http://127.0.0.1:${port}/api/status`);if(res.ok){ready=true;break}}catch{}}
  assert(ready,'Server failed to start');
  const api=async(url,options)=>{const r=await fetch(`http://127.0.0.1:${port}${url}`,options);return {status:r.status,value:await r.json()}};
  let r=await api('/api/references/keywords',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sentence:'Temperature compensation reduces drift in gas sensors across devices.',title:'Transferable electronic nose temperature calibration'})});
  assert.equal(r.status,200);assert(['offline','hermes'].includes(r.value.source));assert(r.value.query.length>10);
  r=await api('/api/references/keywords',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sentence:'tiny'})});assert.equal(r.status,400);
  r=await api('/api/search?title=ab');assert.equal(r.status,400);
  r=await api('/api/search?author=ab');assert.equal(r.status,400);
  const appjs=await fetch(`http://127.0.0.1:${port}/reference-ui.js`);assert.equal(appjs.status,200);
  console.log('[PASS] Reference keywords, AI fallback, HTTP validation, popup UI assets');
 }finally{child.kill('SIGTERM');fs.rmSync(tmp,{recursive:true,force:true});}
})().catch(e=>{console.error(e);process.exitCode=1});
