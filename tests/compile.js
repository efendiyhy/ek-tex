'use strict';
// Integration regression tests for live compile, diagnostics, stale latexmk cache, clean and stop.
// Uses a temporary fake latexmk; no TeX installation or network is required.
const fs=require('fs'),path=require('path'),os=require('os'),http=require('http'),net=require('net');
const assert=require('assert/strict');
const {spawn}=require('child_process');
if(process.platform==='win32'){console.log('[SKIP] Mock compiler test is Unix-only; run npm test on CI Linux.');process.exit(0)}
const root=path.resolve(__dirname,'..');
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'ek-tex-compile-test-'));
const dest=path.join(tmp,'app'),bin=path.join(tmp,'bin');fs.mkdirSync(dest);fs.mkdirSync(bin);
fs.copyFileSync(path.join(root,'server.js'),path.join(dest,'server.js'));
fs.cpSync(path.join(root,'public'),path.join(dest,'public'),{recursive:true});
const compiler=path.join(bin,'latexmk');
fs.writeFileSync(compiler,`#!/usr/bin/env node
const fs=require('fs'),path=require('path');
if(process.argv.includes('-version')){console.log('Latexmk mock 4.83');process.exit(0)}
const out=process.argv.find(x=>x.startsWith('-outdir='))?.slice(8);
const main=process.argv.at(-1),dir=process.cwd(),tex=fs.readFileSync(main,'utf8'),base=path.basename(main,'.tex');
fs.mkdirSync(out,{recursive:true});
if(tex.includes('\\\\MOCKSTALE')&&!fs.existsSync(path.join(dir,'.mock-retried'))){
 fs.writeFileSync(path.join(dir,'.mock-retried'),'1');
 console.log("Latexmk: Nothing to do for '"+main+"'.\\nCollected error summary:\\n lualatex: gave an error in previous invocation of latexmk.");
 process.exit(12);
}
if(tex.includes('\\\\MOCKERROR')){
 console.log('./'+main+':3: Undefined control sequence.');
 fs.writeFileSync(path.join(out,base+'.log'),'! Undefined control sequence.\\n');
 process.exit(1);
}
if(tex.includes('MOCKSLOW')){
 console.log('Starting LuaLaTeX test...');
 let i=0;setInterval(()=>console.log('Still compiling '+(++i)),200);return;
}
fs.writeFileSync(path.join(out,base+'.pdf'),'%PDF-1.4\\nMock test\\n');
console.log('Output written on '+base+'.pdf');
`);
// fix invalid top-level return in mock
let mock=fs.readFileSync(compiler,'utf8').replace("let i=0;setInterval(()=>console.log('Still compiling '+(++i)),200);return;", "let i=0;setInterval(()=>console.log('Still compiling '+(++i)),200);");
fs.writeFileSync(compiler,mock);fs.chmodSync(compiler,0o755);
const delay=ms=>new Promise(r=>setTimeout(r,ms));
async function freePort(){return new Promise((r,j)=>{const s=net.createServer();s.once('error',j);s.listen(0,'127.0.0.1',()=>{const p=s.address().port;s.close(()=>r(p))})})}
async function req(port,method,url,body){return new Promise((resolve,reject)=>{
 const raw=body===undefined?null:JSON.stringify(body);
 const r=http.request({hostname:'127.0.0.1',port,path:url,method,headers:raw?{'Content-Type':'application/json','Content-Length':Buffer.byteLength(raw)}:{}},response=>{
  const chunks=[];response.on('data',c=>chunks.push(c));response.on('end',()=>{const val=Buffer.concat(chunks).toString();try{resolve({status:response.statusCode,data:JSON.parse(val)})}catch{reject(new Error('Invalid JSON: '+val.slice(0,300)))}})
 });r.on('error',reject);if(raw)r.write(raw);r.end();
})}
(async()=>{
 const port=await freePort(),child=spawn(process.execPath,['server.js'],{cwd:dest,env:{...process.env,PATH:bin+path.delimiter+process.env.PATH,PORT:String(port)},stdio:'pipe'});
 let stdout='';child.stdout.on('data',x=>stdout+=x);child.stderr.on('data',x=>stdout+=x);
 try{
  let online=false;for(let i=0;i<40;i++){try{if((await req(port,'GET','/api/projects')).status===200){online=true;break}}catch{}await delay(80)}
  assert(online,'Server did not start: '+stdout);
  const made=await req(port,'POST','/api/projects',{name:'Test Tesis',template:'blank'}),id=made.data.id;
  const pathBuild=`/api/projects/${id}/build`;
  async function write(tex){assert.equal((await req(port,'PUT',`/api/projects/${id}/file`,{path:'main.tex',content:tex})).status,200)}
  await write('\\documentclass{article}\n\\begin{document}\\MOCKERROR\\end{document}');
  let result=await req(port,'POST',pathBuild,{engine:'lualatex'});
  assert.equal(result.data.ok,false);assert.match(result.data.summary,/Undefined control sequence/);
  assert.equal(result.data.diagnostics[0].line,3);
  assert.equal(result.data.diagnostics[0].file,'main.tex');
  await write('\\documentclass{article}\n\\MOCKSTALE\n\\begin{document}OK\\end{document}');
  result=await req(port,'POST',pathBuild,{engine:'lualatex'});
  assert.equal(result.data.ok,true);assert.equal(result.data.autoCleaned,true);
  assert.match(result.data.log,/error build lama terdeteksi/i);
  await write('\\documentclass{article}\n\\begin{document}OK\\end{document}');
  result=await req(port,'POST',pathBuild,{engine:'pdf',clean:true});
  assert.equal(result.data.ok,true);assert.equal(result.data.clean,true);
  assert.match(result.data.log,/Clean & Recompile/);
  await write('\\documentclass{article}\n% MOCKSLOW\n\\begin{document}RUN\\end{document}');
  const pending=req(port,'POST',pathBuild,{engine:'lualatex'});
  await delay(500);
  const status=await req(port,'GET',pathBuild+'/status');
  assert.equal(status.data.running,true);assert.match(status.data.log,/Starting LuaLaTeX/);
  assert.equal((await req(port,'POST',pathBuild+'/stop')).data.stopping,true);
  const stopped=await Promise.race([pending,delay(4500).then(()=>{throw new Error('Stop did not end compiler')})]);
  assert.equal(stopped.data.ok,false);assert.match(stopped.data.summary,/dihentikan oleh pengguna/);
  console.log('[PASS] Error location, stale auto-clean, clean compile, live status, Stop Compile');
 }finally{child.kill('SIGTERM');await delay(100);fs.rmSync(tmp,{recursive:true,force:true})}
})().catch(e=>{console.error('[FAIL]',e);process.exitCode=1;fs.rmSync(tmp,{recursive:true,force:true})});
