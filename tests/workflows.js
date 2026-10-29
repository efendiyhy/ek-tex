'use strict';
// Real integration test: conversion isolation, active-file compiling and PDF source matching.
const fs=require('fs'),os=require('os'),path=require('path'),net=require('net'),http=require('http'),assert=require('assert/strict');
const {spawn,spawnSync}=require('child_process');
const root=path.resolve(__dirname,'..'),temp=fs.mkdtempSync(path.join(os.tmpdir(),'ektex-workflow-'));
const app=path.join(temp,'app');fs.mkdirSync(app);
for(const file of ['server.js'])fs.copyFileSync(path.join(root,file),path.join(app,file));
for(const folder of ['public','lib'])fs.cpSync(path.join(root,folder),path.join(app,folder),{recursive:true});
const port=()=>new Promise((resolve,reject)=>{const s=net.createServer();s.once('error',reject);s.listen(0,'127.0.0.1',()=>{const p=s.address().port;s.close(()=>resolve(p))})});
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
function request(p,method,url,data){return new Promise((resolve,reject)=>{
 const raw=data===undefined?null:JSON.stringify(data);
 const req=http.request({host:'127.0.0.1',port:p,path:url,method,headers:raw?{'Content-Type':'application/json','Content-Length':Buffer.byteLength(raw)}:{}},res=>{
  const parts=[];res.on('data',b=>parts.push(b));res.on('end',()=>{
   const buf=Buffer.concat(parts);let out=buf;
   if(buf.length&&(res.headers['content-type']||'').includes('json'))try{out=JSON.parse(buf.toString())}catch(e){return reject(e)};
   resolve({status:res.statusCode,data:out});
  });
 });req.on('error',reject);req.end(raw);
})}
(async()=>{
 const p=await port(),child=spawn(process.execPath,['server.js'],{cwd:app,env:{...process.env,PORT:String(p)},stdio:['ignore','pipe','pipe']});let logs='';
 child.stdout.on('data',b=>logs+=b);child.stderr.on('data',b=>logs+=b);
 try{
  let live=false;for(let i=0;i<80;i++){try{if((await request(p,'GET','/api/projects')).status===200){live=true;break}}catch{}await sleep(50)}
  assert(live,logs);
  let r=await request(p,'GET','/api/projects');assert.equal(r.data.length,0,'Empty dashboard should be possible');
  r=await request(p,'POST','/api/projects',{name:'My dissertation',template:'article'});assert.equal(r.status,201);const project=r.data.id;
  const base=`/api/projects/${project}`;
  const sourceMain='\\documentclass{article}\n\\begin{document}Main file version\\end{document}\n';
  const sourceOther='\\documentclass{article}\n\\begin{document}Another file version\\end{document}\n';
  r=await request(p,'PUT',base+'/file',{path:'main.tex',content:sourceMain});assert.equal(r.status,200);
  r=await request(p,'POST',base+'/file',{path:'other.tex',content:sourceOther});assert.equal(r.status,201);
  if(spawnSync('latexmk',['-v'],{encoding:'utf8'}).status===0){
   r=await request(p,'POST',base+'/build',{engine:'pdf',file:'other.tex',clean:true});assert.equal(r.status,200,JSON.stringify(r.data));assert.equal(r.data.ok,true,r.data.log?.slice(-2500));assert.equal(r.data.file,'other.tex');
   r=await request(p,'HEAD',base+'/pdf?file=other.tex');assert.equal(r.status,200);
   r=await request(p,'HEAD',base+'/pdf?file=main.tex');assert.equal(r.status,404);
   r=await request(p,'POST',base+'/build',{engine:'pdf',file:'main.tex',clean:false});assert.equal(r.data.ok,true,r.data.log?.slice(-2500));
   r=await request(p,'HEAD',base+'/pdf?file=main.tex');assert.equal(r.status,200);
   r=await request(p,'HEAD',base+'/pdf?file=other.tex');assert.equal(r.status,404);
   r=await request(p,'POST',base+'/build',{engine:'pdf',file:'references.bib'});assert.equal(r.status,400);
  }
  if(spawnSync('pandoc',['--version']).status===0){
   const source=Buffer.from('# Converted test\n\nIndependent project.').toString('base64');
   r=await request(p,'POST','/api/convert',{name:'my source.md',projectName:'Converted Thesis',to:'latex',data:source});assert.equal(r.status,200,JSON.stringify(r.data));
   assert.notEqual(r.data.project.id,project);assert.equal(r.data.project.main,'converted.tex');
   assert(fs.existsSync(path.join(app,'workspace',r.data.project.id,'converted.tex')));
   assert.equal(fs.readFileSync(path.join(app,'workspace',project,'main.tex'),'utf8'),sourceMain,'Original project must remain untouched');
   assert(!fs.existsSync(path.join(app,'workspace',project,'imports')));
   r=await request(p,'POST','/api/convert',{name:'my source.md',to:'html',data:source});assert.equal(r.data.type,'download');
  }
  const html=(await request(p,'GET','/')).data.toString();const script=(await request(p,'GET','/app.js')).data.toString();
  assert(html.includes('dashboard-convert'));assert(html.includes('dash-list'));assert(script.includes('renameProjectDialog'));
  assert(script.includes('file:source'));assert(script.includes("api('/api/convert'"));
  console.log('[PASS] Project-isolated conversion, active .tex build, source-specific PDF preview, dashboard actions');
 }finally{child.kill('SIGTERM');await sleep(150);fs.rmSync(temp,{recursive:true,force:true});}
})().catch(e=>{console.error('[FAIL]',e.stack||e);process.exitCode=1});
