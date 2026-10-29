'use strict';
const STOP=new Set(('yang untuk pada dengan dari dalam adalah sebagai oleh karena bahwa serta atau dan terhadap secara telah lebih masih dapat juga akan maka kita penelitian studi hasil penggunaan metode data suatu the and for with from into using used based study studies research results analysis method methods this that are was were has have been oleh serta among pada untuk terhadap their these there very baru yaitu dalam suatu dibandingkan menggunakan increased reduced improve improved shows showed indicates indicated effect effects suggests suggest influence significant').split(/\s+/));
function normaliseKeywordInput(value,max=220){return String(value||'').replace(/[\u0000-\u001f]/g,' ').replace(/\s+/g,' ').trim().slice(0,max);}
function keywordsFallback(sentence,title){
 const tokenize=s=>normaliseKeywordInput(s,2000).toLowerCase().replace(/\\[a-zA-Z]+(?:\{[^}]*\})?/g,' ').replace(/[^\p{L}\p{N}\-\s]/gu,' ').split(/\s+/).filter(x=>x.length>=3&&!STOP.has(x));
 const words=tokenize(sentence),context=tokenize(title);
 const counts=new Map();for(const w of [...words,...context])counts.set(w,(counts.get(w)||0)+1);
 const phrases=[];
 for(const [tokens,origin] of [[words,'sentence'],[context,'title']]){
  for(let i=0;i<tokens.length;i++)for(let n=2;n<=3&&i+n<=tokens.length;n++){
   const part=tokens.slice(i,i+n);
   if(part.every(w=>w.length>=3))phrases.push({value:part.join(' '),score:(origin==='sentence'?4:3)+part.filter(w=>context.includes(w)).length*2+part.reduce((s,w)=>s+(counts.get(w)||0),0)});
  }
 }
 phrases.sort((a,b)=>b.score-a.score);
 const chosen=[];
 for(const p of phrases){if(chosen.length>=4)break;if(!chosen.some(x=>x.includes(p.value)||p.value.includes(x)))chosen.push(p.value);}
 for(const w of [...context,...words].sort((a,b)=>(counts.get(b)||0)-(counts.get(a)||0))){if(chosen.length>=6)break;if(!chosen.some(x=>x.split(' ').includes(w)))chosen.push(w);}
 const query=chosen.slice(0,4).join(' ').slice(0,160);
 return {keywords:chosen,query:query||normaliseKeywordInput(sentence,160)};
}
function parseKeywordResponse(raw){let obj;const text=String(raw||'').trim();try{obj=JSON.parse(text)}catch{
 const fenced=text.match(/```(?:json)?\s*([\s\S]+?)```/i);if(fenced)try{obj=JSON.parse(fenced[1])}catch{}
 if(!obj){const a=text.indexOf('{'),b=text.lastIndexOf('}');if(a>=0&&b>a)try{obj=JSON.parse(text.slice(a,b+1))}catch{}}
}
if(!obj||!Array.isArray(obj.keywords))return null;
const keywords=obj.keywords.filter(v=>typeof v==='string').map(v=>normaliseKeywordInput(v,65)).filter(Boolean).slice(0,8);
const query=normaliseKeywordInput(obj.query||keywords.join(' '),160);
if(!keywords.length||query.length<3)return null;
return {keywords,query};
}
module.exports={keywordsFallback,parseKeywordResponse,normaliseKeywordInput};
