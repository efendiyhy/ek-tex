'use strict';
// Self-contained smoke test: creates a throwaway app copy so it never modifies workspace/.
const fs = require('fs');
const path = require('path');
const os = require('os');
const net = require('net');
const http = require('http');
const assert = require('assert/strict');
const {spawn} = require('child_process');
const root = path.resolve(__dirname, '..');
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'latexstudio-test-'));
const cp = path.join(temp, 'app');
fs.mkdirSync(cp);
fs.copyFileSync(path.join(root, 'server.js'), path.join(cp, 'server.js'));
fs.cpSync(path.join(root, 'public'), path.join(cp, 'public'), {recursive:true});

function freePort() {return new Promise((resolve, reject) => {const s=net.createServer();s.once('error',reject);s.listen(0,'127.0.0.1',()=>{const {port}=s.address();s.close(()=>resolve(port));});});}
function request(port, method, route, data) {return new Promise((resolve, reject)=>{
 const raw = data===undefined?null:JSON.stringify(data);
 const req = http.request({hostname:'127.0.0.1',port,path:route,method,headers:raw?{'Content-Type':'application/json','Content-Length':Buffer.byteLength(raw)}:{}}, res=>{
  const all=[];res.on('data',b=>all.push(b));res.on('end',()=>{
   const result=Buffer.concat(all);let body=result;
   if((res.headers['content-type']||'').includes('json')){try{body=JSON.parse(result.toString('utf8'));}catch(e){return reject(e);}}
   resolve({status:res.statusCode,body});
  });
 });req.on('error',reject);if(raw)req.write(raw);req.end();
});}
const sleep = ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{
 const port=await freePort();
 const child=spawn(process.execPath,['server.js'],{cwd:cp,env:{...process.env,PORT:String(port)},stdio:['ignore','pipe','pipe']});
 let output='';child.stdout.on('data',b=>output+=b.toString());child.stderr.on('data',b=>output+=b.toString());
 try {
  let live=false;for(let i=0;i<70;i++){if(child.exitCode!==null)throw new Error('Server exited prematurely: '+output);try{let r=await request(port,'GET','/api/projects');if(r.status===200){live=true;break;}}catch{}await sleep(70);}
  assert(live, 'HTTP server did not start');
  let r=await request(port,'GET','/');assert.equal(r.status,200);assert.match(r.body.toString(),/id="dashboard"/);
  r=await request(port,'GET','/api/projects');assert.equal(r.status,200);assert(r.body.length>=1);
  r=await request(port,'POST','/api/projects',{name:'CI Test Project',template:'article'});
  assert.equal(r.status,201);const id=r.body.id;assert.match(id,/^[a-z0-9-]+$/);
  r=await request(port,'GET',`/api/projects/${id}/tree`);assert.equal(r.status,200);assert(r.body.some(f=>f.name==='main.tex'));
  r=await request(port,'PUT',`/api/projects/${id}/file`,{path:'main.tex',content:'\\documentclass{article}\n\\begin{document}CI test\\end{document}\n'});assert.equal(r.status,200);
  r=await request(port,'GET',`/api/projects/${id}/file?path=main.tex`);assert.equal(r.status,200);assert.match(r.body.content,/CI test/);
  r=await request(port,'GET',`/api/projects/${id}/export`);assert.equal(r.status,200);assert.equal(r.body.subarray(0,2).toString('ascii'),'PK');
  console.log('[PASS] Dashboard, project API, file edit, and ZIP export');
 } finally {child.kill('SIGTERM');await sleep(100);fs.rmSync(temp,{recursive:true,force:true});}
})().catch(err=>{console.error('[FAIL]',err);process.exitCode=1;fs.rmSync(temp,{recursive:true,force:true});});
