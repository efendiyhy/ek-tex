'use strict';
// Pure validators for a read-only AI suggestion workflow.
function parseAssistant(raw){
 const text=String(raw||'').trim();let result=null;
 try{result=JSON.parse(text)}catch{}
 if(!result){const block=text.match(/```(?:json)?\s*([\s\S]*?)```/i);if(block)try{result=JSON.parse(block[1])}catch{}}
 if(!result){const i=text.indexOf('{'),j=text.lastIndexOf('}');if(i!==-1&&j>i)try{result=JSON.parse(text.slice(i,j+1))}catch{}}
 if(!result||typeof result!=='object'||Array.isArray(result))return {reply:text.slice(0,12000)||'Model tidak memberikan respons.',edit:null};
 const edit=result.edit&&typeof result.edit==='object'&&!Array.isArray(result.edit)?result.edit:null;
 return {reply:String(result.reply||result.explanation||'Berikut saran saya.').slice(0,12000),edit:edit&&typeof edit.find==='string'&&typeof edit.replace==='string'?{find:edit.find,replace:edit.replace}:null};
}
function editableReplacement(original,edit,selection){
 if(!edit||!edit.find||edit.find.length>20000||edit.replace.length>30000||edit.find===edit.replace)return null;
 let index=-1;
 if(selection&&Number.isInteger(selection.start)&&Number.isInteger(selection.end)&&selection.start>=0&&selection.end<=original.length&&selection.end>selection.start){
   if(original.slice(selection.start,selection.end)!==selection.text||edit.find!==selection.text)return null;
   index=selection.start;
 }else{
   index=original.indexOf(edit.find);
   if(index===-1||original.indexOf(edit.find,index+edit.find.length)!==-1)return null;
 }
 const content=original.slice(0,index)+edit.replace+original.slice(index+edit.find.length);
 if(content===original||Buffer.byteLength(content,'utf8')>3*1024*1024)return null;
 return {content,find:edit.find,replace:edit.replace};
}
function boundedHistory(messages){
 if(!Array.isArray(messages))return [];
 return messages.slice(-10).filter(x=>x&&['user','assistant'].includes(x.role)&&typeof x.content==='string').map(x=>({role:x.role,content:x.content.slice(0,1800)}));
}
function contextExcerpt(original,selection,max=18000){
 if(original.length<=max)return {text:original,truncated:false};
 const center=selection&&Number.isInteger(selection.start)?selection.start:0;
 const start=Math.max(0,Math.min(original.length-max,center-3500));
 return {text:original.slice(start,start+max),truncated:true};
}
module.exports={parseAssistant,editableReplacement,boundedHistory,contextExcerpt};
