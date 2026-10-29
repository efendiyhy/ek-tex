'use strict';
const assert=require('node:assert/strict');
const fs=require('fs'),os=require('os'),path=require('path'),net=require('net'),http=require('http');
const {spawn}=require('child_process');
const root=path.join(__dirname,'..'),tmp=fs.mkdtempSync(path.join(os.tmpdir(),'ektex-ollama-test-'));
fs.copyFileSync(path.join(root,'server.js'),path.join(tmp,'server.js'));fs.cpSync(path.join(root,'lib'),path.join(tmp,'lib'),{recursive:true});fs.cpSync(path.join(root,'public'),path.join(tmp,'public'),{recursive:true});
const freePort=()=>new Promise((ok,no)=>{const s=net.createServer();s.on('error',no);s.listen(0,'127.0.0.1',()=>{const p=s.address().port;s.close(()=>ok(p))})});
const pause=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{
 const modelPort=await freePort(),appPort=await freePort();let received;
 const fake=http.createServer((req,res)=>{let b='';req.on('data',d=>b+=d);req.on('end',()=>{
  res.setHeader('Content-Type','application/json');
  if(req.url==='/api/tags'){res.end(JSON.stringify({models:[{name:'test-writer:latest'}]}));return}
  if(req.url==='/api/chat'){received=JSON.parse(b);res.end(JSON.stringify({model:'test-writer:latest',message:{role:'assistant',content:JSON.stringify({reply:'Improved suggestion',edit:{find:'DRAFT_TEXT',replace:'Polished writing'}})}}));return}
  res.statusCode=404;res.end(JSON.stringify({error:'missing'}));
 })});await new Promise(ok=>fake.listen(modelPort,'127.0.0.1',ok));
 const app=spawn(process.execPath,['server.js'],{cwd:tmp,env:{...process.env,PORT:String(appPort),EKTEX_OLLAMA_PORT:String(modelPort)},stdio:'ignore'});
 const call=async(path,method='GET',obj)=>{const r=await fetch(`http://127.0.0.1:${appPort}${path}`,{method,headers:{'Content-Type':'application/json'},...(obj===undefined?{}:{body:JSON.stringify(obj)})});return {status:r.status,data:await r.json()}};
 try{
  let up=false;for(let i=0;i<60;i++){await pause(100);try{if((await call('/api/status')).status===200){up=true;break}}catch{}}
  assert(up,'app startup');let r=await call('/api/ai/status');assert.equal(r.status,200);assert.deepEqual(r.data.models,['test-writer:latest']);
  r=await call('/api/projects','POST',{name:'Mock Ollama'});const id=r.data.id;const content='\\documentclass{article}\n\\begin{document}\nDRAFT_TEXT\n\\end{document}';
  await call(`/api/projects/${id}/file`,'PUT',{path:'main.tex',content});
  r=await call(`/api/projects/${id}/ai/chat`,'POST',{provider:'ollama',model:'test-writer:latest',file:'main.tex',mode:'grammar',message:'Polish the wording',history:[]});
  assert.equal(r.status,200,JSON.stringify(r.data));assert(r.data.proposal);assert.equal(r.data.provider,'ollama');assert.equal(received.stream,false);assert.equal(received.format,'json');assert.equal(received.tools,undefined);
  r=await call(`/api/projects/${id}/ai/apply`,'POST',{proposalId:r.data.proposal.id});assert.equal(r.status,200);
  assert(fs.readFileSync(path.join(tmp,'workspace',id,'main.tex'),'utf8').includes('Polished writing'));
  r=await call(`/api/projects/${id}/ai/chat`,'POST',{provider:'ollama',model:'not-installed',file:'main.tex',message:'Explain'});assert.equal(r.status,422);
  console.log('[PASS] Loopback Ollama model detection, chat JSON, controlled replacement and model validation');
 }finally{app.kill('SIGTERM');fake.close();await pause(100);fs.rmSync(tmp,{recursive:true,force:true})}
})().catch(e=>{console.error('[FAIL]',e);process.exitCode=1});
