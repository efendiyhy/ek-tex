'use strict';
const assert=require('node:assert/strict');
const f=require('../public/editor-features');
assert.equal(Object.keys(f.themes).length,5);
for(const id of Object.keys(f.themes)){assert.equal(f.validTheme(id),id);}
assert.equal(f.validTheme('invalid'),'teal');
assert.equal(f.validMode('light'),'light');
assert.equal(f.validMode('invalid'),'dark');
assert.deepEqual(f.context('Before \\sec',11),{prefix:'sec',start:7,end:11});
assert.equal(f.context('% \\section',10),null);
assert.equal(f.context('\\sec{test}',10),null);
assert.equal(f.suggest('sec')[0].name,'section');
assert.equal(f.suggest('include')[0].name,'include');
assert.equal(f.suggest('notacommand').length,0);
assert.deepEqual(f.expand('\\section{|}'),{text:'\\section{}',cursor:9});
assert.deepEqual(f.errorsForFile([{file:'./Isi/Bab1.tex',line:8,message:'oops'},{file:'main.tex',line:3}], 'Isi/Bab1.tex').map(x=>x.line),[8]);
console.log('Editor features: autocomplete, themes, diagnostic path checks passed.');
