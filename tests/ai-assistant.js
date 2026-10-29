'use strict';
const assert=require('node:assert/strict');
const fs=require('fs'),os=require('os'),path=require('path'),net=require('net');
const {spawn}=require('child_process');
const {parseAssistant,editableReplacement,boundedHistory,contextExcerpt}=require('../lib/ai-assistant');
assert.equal(parseAssistant('```json\n{"reply":"OK","edit":{"find":"a","replace":"b"}}\n```').edit.find,'a');
assert.equal(parseAssistant('normal reply').edit,null);
assert.equal(editableReplacement('alpha alpha',{find:'alpha',replace:'beta'},null),null);
assert.equal(editableReplacement('alpha alpha',{find:'alpha',replace:'beta'},{start:6,end:11,text:'alpha'}).content,'alpha beta');
assert.equal(editableReplacement('alpha',{find:'alpha',replace:'beta'},{start:0,end:4,text:'alph'}),null);
assert.equal(boundedHistory(Array.from({length:20},(_,i)=>({role:'user',content:'x'+i}))).length,10);
assert.equal(contextExcerpt('x'.repeat(20000),null).truncated,true);
const root=path.join(__dirname,'..');const temp=fs.mkdtempSync(path.join(os.tmpdir(),'ektex-ai-test-'));const bin=path.join(temp,'bin'),app=path.join(temp,'app');fs.mkdirSync(bin);fs.mkdirSync(app);
for(const f of ['server.js'])fs.copyFileSync(path.join(root,f),path.join(app,f));
for(const d of ['lib','public'])fs.cpSync(path.join(root,d),path.join(app,d),{recursive:true});
const hermes=path.join(bin,process.platform==='win32'?'hermes.cmd':'hermes');
if(process.platform==='win32')fs.writeFileSync(hermes,'@echo off\r\nif "%1"=="--version" (echo 1.0 & exit /b 0)\r\necho {"reply":"Suggested academic revision","edit":{"find":"TEST_AI_SNIPPET","replace":"Improved academic sentence"}}');
else{fs.writeFileSync(hermes,'#!/bin/sh\nif [ "$1" = "--version" ]; then echo test-hermes; exit 0; fi\nprintf \'%s\\n\' \'{"reply":"Suggested academic revision","edit":{"find":"TEST_AI_SNIPPET","replace":"Improved academic sentence"}}\'\n');fs.chmodSync(hermes,0o755)}
const freePort=()=>new Promise((resolve,reject)=>{const server=net.createServer();server.on('error',reject);server.listen(0,'127.0.0.1',()=>{const port=server.address().port;server.close(()=>resolve(port))})});
const wait=t=>new Promise(r=>setTimeout(r,t));
(async()=>{
 const port=await freePort(),child=spawn(process.execPath,['server.js'],{cwd:app,env:{...process.env,PORT:String(port),PATH:bin+path.delimiter+process.env.PATH},stdio:'ignore'});
 const call=async(route,method='GET',payload)=>{const res=await fetch(`http://127.0.0.1:${port}${route}`,{method,headers:{'Content-Type':'application/json'},...(payload===undefined?{}:{body:JSON.stringify(payload)})});return {status:res.status,data:await res.json()}};
 try{
  let ready=false;for(let i=0;i<70;i++){await wait(80);try{if((await call('/api/status')).status===200){ready=true;break}}catch{}}
  assert(ready,'Server not running');let r=await call('/api/ai/status');assert.equal(r.status,200);assert.equal(r.data.hermes,true);
  r=await call('/api/projects','POST',{name:'Academic AI Test'});const id=r.data.id;
  let original='\\documentclass{article}\n\\begin{document}\nTEST_AI_SNIPPET\n\\end{document}\n';
  r=await call(`/api/projects/${id}/file`,'PUT',{path:'main.tex',content:original});assert.equal(r.status,200);
  const selection={start:original.indexOf('TEST_AI_SNIPPET'),end:original.indexOf('TEST_AI_SNIPPET')+'TEST_AI_SNIPPET'.length,text:'TEST_AI_SNIPPET'};
  r=await call(`/api/projects/${id}/ai/chat`,'POST',{provider:'hermes',file:'main.tex',mode:'rewrite',message:'Improve academic writing',selection});
  assert.equal(r.status,200,JSON.stringify(r.data));assert.equal(r.data.provider,'hermes');assert.equal(r.data.proposal.find,'TEST_AI_SNIPPET');
  const proposal=r.data.proposal.id;
  // Explicit Replace mode used by the floating chat returns the same safely reviewable edit.
  const replaceMode=await call(`/api/projects/${id}/ai/chat`,'POST',{provider:'hermes',file:'main.tex',mode:'replace',message:'Replace selected text while preserving LaTeX.',selection});
  assert.equal(replaceMode.status,200,JSON.stringify(replaceMode.data));assert.equal(replaceMode.data.proposal.replace,'Improved academic sentence');
  r=await call(`/api/projects/${id}/file`,'PUT',{path:'main.tex',content:original+'\n% changed\n'});assert.equal(r.status,200);
  r=await call(`/api/projects/${id}/ai/apply`,'POST',{proposalId:proposal});assert.equal(r.status,409);
  r=await call(`/api/projects/${id}/ai/chat`,'POST',{provider:'hermes',file:'main.tex',mode:'rewrite',message:'Improve academic writing',selection});assert.equal(r.status,200,JSON.stringify(r.data));
  r=await call(`/api/projects/${id}/ai/apply`,'POST',{proposalId:r.data.proposal.id});assert.equal(r.status,200);
  assert(fs.readFileSync(path.join(app,'workspace',id,'main.tex'),'utf8').includes('Improved academic sentence'));
  assert(fs.readdirSync(path.join(app,'workspace',id,'.latexstudio-backups')).some(f=>f.includes('--ai-')));
  r=await call(`/api/projects/${id}/ai/chat`,'POST',{provider:'hermes',file:'../server.js',message:'Run dangerous code'});assert.equal(r.status,400);
  r=await call(`/api/projects/${id}/ai/chat`,'POST',{provider:'hermes',file:'main.tex',message:'Improve academic writing',mode:'explain'});assert.equal(r.status,200);assert.equal(r.data.proposal,null);
  const asset=await fetch(`http://127.0.0.1:${port}/ai-assistant.css`);assert.equal(asset.status,200);
  for(const id of ['ai-drawer','ai-launcher','ai-quick-selection','ai-input','ai-send'])assert(fs.readFileSync(path.join(root,'public','index.html'),'utf8').includes(`id="${id}"`));
  console.log('[PASS] AI Hermes CLI, scoped selection, safe apply/backups, stale-file guard, explain-only, static assets');
 }finally{child.kill('SIGTERM');await wait(100);fs.rmSync(temp,{recursive:true,force:true})}
})().catch(e=>{console.error('[FAIL]',e);process.exitCode=1});
