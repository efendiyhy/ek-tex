/* EK TeX v2.7 — offline LaTeX command suggestions and appearance presets. */
(function(root){
 'use strict';
 const themes={
  teal:{label:'Emerald',accent:'#2dbda6'},
  ocean:{label:'Ocean Blue',accent:'#518fe5'},
  violet:{label:'Amethyst',accent:'#a487ed'},
  amber:{label:'Copper',accent:'#d69653'}
 };
 const entries=[
  ['section','Struktur','\\section{|}'],['subsection','Struktur','\\subsection{|}'],['subsubsection','Struktur','\\subsubsection{|}'],['chapter','Struktur','\\chapter{|}'],['part','Struktur','\\part{|}'],['paragraph','Struktur','\\paragraph{|}'],
  ['documentclass','Dokumen','\\documentclass{|}'],['usepackage','Dokumen','\\usepackage{|}'],['title','Dokumen','\\title{|}'],['author','Dokumen','\\author{|}'],['date','Dokumen','\\date{|}'],['maketitle','Dokumen','\\maketitle'],['tableofcontents','Dokumen','\\tableofcontents'],
  ['begin','Lingkungan','\\begin{|}\n  \n\\end{}'],['end','Lingkungan','\\end{|}'],['item','Daftar','\\item '],['itemize','Daftar','\\begin{itemize}\n  \\item |\n\\end{itemize}'],['enumerate','Daftar','\\begin{enumerate}\n  \\item |\n\\end{enumerate}'],
  ['textbf','Teks','\\textbf{|}'],['textit','Teks','\\textit{|}'],['emph','Teks','\\emph{|}'],['underline','Teks','\\underline{|}'],['texttt','Teks','\\texttt{|}'],['footnote','Teks','\\footnote{|}'],['href','Teks','\\href{|}{teks}'],['url','Teks','\\url{|}'],
  ['label','Referensi','\\label{|}'],['ref','Referensi','\\ref{|}'],['eqref','Referensi','\\eqref{|}'],['cite','Referensi','\\cite{|}'],['citep','Referensi','\\citep{|}'],['citet','Referensi','\\citet{|}'],['bibliography','Referensi','\\bibliography{|}'],['bibliographystyle','Referensi','\\bibliographystyle{|}'],['addbibresource','Referensi','\\addbibresource{|}'],
  ['include','Berkas','\\include{|}'],['input','Berkas','\\input{|}'],['includegraphics','Gambar','\\includegraphics[width=0.8\\linewidth]{|}'],['caption','Gambar & Tabel','\\caption{|}'],['centering','Gambar & Tabel','\\centering'],['hline','Gambar & Tabel','\\hline'],
  ['frac','Matematika','\\frac{|}{}'],['sqrt','Matematika','\\sqrt{|}'],['sum','Matematika','\\sum_{|}^{}'],['int','Matematika','\\int_{|}^{}'],['lim','Matematika','\\lim_{|}'],['alpha','Matematika','\\alpha'],['beta','Matematika','\\beta'],['gamma','Matematika','\\gamma'],['theta','Matematika','\\theta'],['infty','Matematika','\\infty'],
  ['equation','Matematika','\\begin{equation}\n  |\n\\end{equation}'],['align','Matematika','\\begin{align}\n  |\n\\end{align}'],['figure','Gambar','\\begin{figure}[htbp]\n  \\centering\n  |\n  \\caption{}\n  \\label{fig:}\n\\end{figure}'],['table','Tabel','\\begin{table}[htbp]\n  \\centering\n  \\caption{}\n  |\n\\end{table}'],
  ['newcommand','Makro','\\newcommand{\\|}{}'],['renewcommand','Makro','\\renewcommand{\\|}{}']
 ];
 const commands=entries.map(([name,group,template])=>({name,group,template}));
 function context(value,cursor){const before=String(value).slice(0,cursor);const m=before.match(/\\([A-Za-z@]*)$/);if(!m)return null;const row=before.slice(before.lastIndexOf('\n')+1);const comment=row.indexOf('%');if(comment>=0&&comment<row.lastIndexOf('\\'))return null;return {prefix:m[1],start:cursor-m[0].length,end:cursor};}
 function suggest(prefix,limit=9){const p=String(prefix||'').toLowerCase();return commands.filter(c=>c.name.startsWith(p)).slice(0,limit);}
 function expand(template){const at=template.indexOf('|');return {text:template.replace('|',''),cursor:at<0?template.length:at};}
 function validTheme(id){return Object.prototype.hasOwnProperty.call(themes,id)?id:'teal';}
 function validMode(mode){return mode==='light'?'light':'dark';}
 function normalizeFile(path){return String(path||'').replace(/\\/g,'/').replace(/^\.(?:\/)+/,'').replace(/^\/+/, '');}
 function errorsForFile(diagnostics,file){const target=normalizeFile(file);return (diagnostics||[]).filter(d=>Number.isInteger(Number(d.line))&&Number(d.line)>0&&normalizeFile(d.file)===target);}
 root.EKTeXFeatures={themes,commands,context,suggest,expand,validTheme,validMode,normalizeFile,errorsForFile};
 if(typeof module==='object'&&module.exports)module.exports=root.EKTeXFeatures;
})(typeof globalThis!=='undefined'?globalThis:this);
