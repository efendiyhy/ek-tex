'use strict';
// Integration: real Pandoc (when installed), stubbed Hermes CLI (no model or API calls).
const fs=require('fs'),os=require('os'),path=require('path'),http=require('http'),net=require('net'),assert=require('assert/strict');
const {spawn,spawnSync}=require('child_process');
const root=path.resolve(__dirname,'..'),temp=fs.mkdtempSync(path.join(os.tmpdir(),'ektex-v25-test-'));
const app=path.join(temp,'app'),bin=path.join(temp,'bin');fs.mkdirSync(app);fs.mkdirSync(bin);
fs.copyFileSync(path.join(root,'server.js'),path.join(app,'server.js'));
fs.cpSync(path.join(root,'public'),path.join(app,'public'),{recursive:true});
fs.cpSync(path.join(root,'lib'),path.join(app,'lib'),{recursive:true});
const hermesStub=path.join(bin,'hermes');fs.writeFileSync(hermesStub,`#!/bin/sh
if [ "$1" = "--version" ]; then echo "hermes-test-1"; exit 0; fi
printf '%s\\n' '{"explanation":"Tambahkan percent comment","find":"TEST_HERMES_TOKEN","replace":"% TEST_HERMES_TOKEN"}'
`);fs.chmodSync(hermesStub,0o755);
const freePort=()=>new Promise((ok,no)=>{const s=net.createServer();s.once('error',no);s.listen(0,'127.0.0.1',()=>{const p=s.address().port;s.close(()=>ok(p));});});
const pause=ms=>new Promise(r=>setTimeout(r,ms));
function request(port,method,route,data){return new Promise((ok,no)=>{const raw=data===undefined?null:JSON.stringify(data);const req=http.request({hostname:'127.0.0.1',port,path:route,method,headers:raw?{'Content-Type':'application/json','Content-Length':Buffer.byteLength(raw)}:{}},res=>{let out=[];res.on('data',c=>out.push(c));res.on('end',()=>{try{ok({status:res.statusCode,data:JSON.parse(Buffer.concat(out).toString())})}catch(e){no(e)}})});req.on('error',no);if(raw)req.end(raw);else req.end()})}
(async()=>{
 const port=await freePort();const child=spawn(process.execPath,['server.js'],{cwd:app,env:{...process.env,PATH:bin+':'+process.env.PATH,PORT:String(port)},stdio:['ignore','pipe','pipe']});
 let log='';child.stderr.on('data',b=>log+=b);child.stdout.on('data',b=>log+=b);
 try{
  for(let i=0;i<90;i++){try{const r=await request(port,'GET','/api/status');if(r.status===200)break;}catch{}await pause(60)}
  let r=await request(port,'GET','/api/status');assert.equal(r.data.hermes,true);
  r=await request(port,'POST','/api/projects',{name:'Debugger Converter',template:'article'});assert.equal(r.status,201);const id=r.data.id,base=`/api/projects/${id}`;
  // Create fake build log containing a missing LaTeX package and a code token.
  const dir=path.join(app,'workspace',id);fs.mkdirSync(path.join(dir,'.latexstudio-build'));fs.writeFileSync(path.join(dir,'.latexstudio-build','build.log'),"! LaTeX Error: File `algorithmic.sty' not found.\n");
  r=await request(port,'GET',base+'/diagnose');assert.equal(r.status,200);assert(r.data.issues.some(i=>i.fix.includes('texlive-science')));
  const main=path.join(dir,'main.tex');fs.appendFileSync(main,'\nTEST_HERMES_TOKEN\n');
  r=await request(port,'POST',base+'/hermes/suggest',{file:'main.tex'});assert.equal(r.status,200,JSON.stringify(r.data));assert.equal(r.data.canApply,true);
  const proposal=r.data.proposalId;
  // Modify file before apply: must fail (optimistic concurrency).
  fs.appendFileSync(main,'\n% changed while Hermes works\n');
  r=await request(port,'POST',base+'/hermes/apply',{proposalId:proposal});assert.equal(r.status,409);
  r=await request(port,'POST',base+'/hermes/suggest',{file:'main.tex'});assert.equal(r.data.canApply,true);
  r=await request(port,'POST',base+'/hermes/apply',{proposalId:r.data.proposalId});assert.equal(r.status,200);assert(fs.readFileSync(main,'utf8').includes('% TEST_HERMES_TOKEN'));assert(fs.readdirSync(path.join(dir,'.latexstudio-backups')).some(n=>n.includes('--ai-')));
  if(spawnSync('pandoc',['--version']).status===0){
   const md=Buffer.from('# Test conversion\n\n\u03B1 and $x^2$.\n').toString('base64');
   r=await request(port,'POST',base+'/convert',{name:'original.md',to:'latex',data:md});assert.equal(r.status,200,JSON.stringify(r.data));assert.equal(r.data.type,'project');
   assert.notEqual(r.data.project.id,id);
   const createdDir=path.join(app,'workspace',r.data.project.id);
   assert(fs.readFileSync(path.join(createdDir,r.data.file),'utf8').includes('Test conversion'));
   assert(!fs.existsSync(path.join(dir,'imports')),'Source project must not be modified');
   r=await request(port,'POST',base+'/convert',{name:'original.md',to:'docx',data:md});assert.equal(r.status,200,JSON.stringify(r.data));assert.equal(Buffer.from(r.data.data,'base64').subarray(0,2).toString(),'PK');
   // Convert resulting real docx back to LaTeX.
   r=await request(port,'POST',base+'/convert',{name:'roundtrip.docx',to:'latex',data:r.data.data});assert.equal(r.status,200,JSON.stringify(r.data));
   assert(fs.existsSync(path.join(app,'workspace',r.data.project.id,r.data.file)));
   // Check DOCX with an embedded PNG: media must be extracted alongside TeX.
   const imageMd=path.join(temp,'with-image.md'),imagePng=path.join(temp,'figure.png'),imageDocx=path.join(temp,'with-image.docx');
   fs.copyFileSync(path.join(root,'public','favicon.png'),imagePng);
   fs.writeFileSync(imageMd,'# Document with image\n\n![A cat logo](figure.png)\n');
   const generated=spawnSync('pandoc',['--from','markdown','--to','docx','--output',imageDocx,imageMd],{cwd:temp});
   assert.equal(generated.status,0,generated.stderr?.toString());
   r=await request(port,'POST',base+'/convert',{name:'with-image.docx',to:'latex',data:fs.readFileSync(imageDocx).toString('base64')});
   assert.equal(r.status,200,JSON.stringify(r.data));
   const importDir=path.dirname(path.join(app,'workspace',r.data.project.id,r.data.file));
   assert(fs.existsSync(path.join(importDir,'media')),'Pandoc extracted a media directory');
  }
  console.log('[PASS] Offline diagnoses missing packages, Hermes propose/review/apply with stale protection, Pandoc markdown/docx/latex conversion');
 }finally{child.kill('SIGTERM');await pause(150)}
})().catch(e=>{console.error('[FAIL]',e.stack||e);process.exitCode=1}).finally(()=>fs.rmSync(temp,{recursive:true,force:true}));
