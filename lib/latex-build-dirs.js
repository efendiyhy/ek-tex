'use strict';
/**
 * Prepare auxiliary-output subfolders for LaTeX \include{folder/chapter}.
 * latexmk creates its top-level output directory, but TeX may need nested
 * directories within that output directory to write folder/chapter.aux.
 *
 * All file reads and directory writes stay inside the current project. No
 * LaTeX command is executed during this lightweight, bounded preflight.
 */
const fs = require('fs');
const path = require('path');

const MAX_SOURCE_FILES = 400;
const MAX_SOURCE_BYTES = 1024 * 1024;
const MAX_AUX_DIRS = 200;
const MAX_DEPTH = 18;

function stripComments(tex) {
  return tex.split(/\r?\n/).map(line => {
    for (let i = 0; i < line.length; i++) {
      if (line[i] !== '%') continue;
      let count = 0;
      for (let k = i - 1; k >= 0 && line[k] === '\\'; k--) count++;
      if (count % 2 === 0) return line.slice(0, i);
    }
    return line;
  }).join('\n');
}

function parseSourceReferences(tex) {
  const refs = [];
  // Only braced, literal paths can be safely predicted without executing TeX.
  const regex = /\\(include|input)\s*\{([^}\r\n]+)\}/g;
  for (const match of stripComments(tex).matchAll(regex)) {
    refs.push({kind: match[1], target: match[2].trim()});
  }
  return refs;
}

function safeParts(target) {
  if (target.length === 0 || target.length > 512 || target.includes('\\') || target.includes('\0')) return null;
  if (target.startsWith('/') || target.startsWith('~') || /^[a-zA-Z]:/.test(target)) return null;
  const parts = target.split('/');
  if (parts.some(p => !p || p === '.' || p === '..' || p.startsWith('.') || /[<>:"|?*\x00-\x1f]/.test(p))) return null;
  return parts;
}

function assertNoSymlink(root, parts) {
  let current = root;
  for (const part of parts) {
    current = path.join(current, part);
    if (fs.existsSync(current) && fs.lstatSync(current).isSymbolicLink()) {
      throw new Error('Symlink tidak diizinkan dalam jalur build: ' + parts.join('/'));
    }
  }
  return current;
}

function prepareIncludeAuxDirectories(projectDir, mainFile, outDir = path.join(projectDir, '.latexstudio-build')) {
  const root = path.resolve(projectDir);
  const output = path.resolve(outDir);
  if (output !== path.join(root, '.latexstudio-build')) throw new Error('Lokasi build harus berada di dalam proyek.');
  const main = path.resolve(root, mainFile);
  if (main !== root && !main.startsWith(root + path.sep)) throw new Error('Main file berada di luar proyek.');
  const relativeMain = path.relative(root, main).split(path.sep);
  assertNoSymlink(root, relativeMain);
  const sourceRoot = path.dirname(main); // latexmk -cd changes CWD to main document directory
  const visited = new Set();
  const wanted = new Set();
  const pending = [{file: main, depth: 0}];
  let scanned = 0;

  while (pending.length && scanned < MAX_SOURCE_FILES) {
    const {file, depth} = pending.shift();
    if (depth > MAX_DEPTH || visited.has(file)) continue;
    visited.add(file);
    if (!file.startsWith(root + path.sep) || !fs.existsSync(file)) continue;
    const relative = path.relative(root, file).split(path.sep);
    assertNoSymlink(root, relative);
    const stat = fs.statSync(file);
    if (!stat.isFile() || stat.size > MAX_SOURCE_BYTES || path.extname(file).toLowerCase() !== '.tex') continue;
    scanned++;
    const content = fs.readFileSync(file, 'utf8');
    for (const ref of parseSourceReferences(content)) {
      const parts = safeParts(ref.target);
      if (!parts) continue; // Dynamic paths and traversal are not safe to predict.
      if (ref.kind === 'include' && parts.length > 1 && wanted.size < MAX_AUX_DIRS) {
        const sub = parts.slice(0, -1).join('/');
        wanted.add(sub);
      }
      let refName = parts.join('/');
      if (!path.extname(refName)) refName += '.tex';
      if (path.extname(refName).toLowerCase() !== '.tex') continue;
      const candidate = path.resolve(sourceRoot, refName);
      if (candidate.startsWith(root + path.sep) && !visited.has(candidate)) pending.push({file:candidate, depth:depth + 1});
    }
  }

  // Mirror directories containing actual .tex sources as well. This also
  // supports includes assembled by TeX macros, which cannot be parsed safely.
  // Skip symlinks and hidden/build directories; never recurse outside sourceRoot.
  const queue = [{dir:sourceRoot, parts:[], depth:0}];
  let foldersVisited = 0;
  while (queue.length && foldersVisited < MAX_SOURCE_FILES) {
    const {dir, parts, depth} = queue.shift();
    foldersVisited++;
    if (depth > MAX_DEPTH) continue;
    for (const item of fs.readdirSync(dir,{withFileTypes:true})) {
      if (item.isSymbolicLink() || item.name.startsWith('.') || item.name === 'node_modules') continue;
      const relParts = [...parts,item.name];
      if (!safeParts(relParts.join('/'))) continue;
      if (item.isDirectory()) {
        if (queue.length < MAX_SOURCE_FILES) queue.push({dir:path.join(dir,item.name),parts:relParts,depth:depth+1});
      } else if (item.isFile() && item.name.toLowerCase().endsWith('.tex') && parts.length && wanted.size < MAX_AUX_DIRS) {
        wanted.add(parts.join('/'));
      }
    }
  }

  if (fs.existsSync(output) && fs.lstatSync(output).isSymbolicLink()) throw new Error('Folder build tidak boleh berupa symlink.');
  fs.mkdirSync(output, {recursive:true});
  const created = [];
  for (const sub of [...wanted].sort()) {
    const parts = sub.split('/');
    // Check intermediate components, including pre-existing directories.
    let current = output;
    for (const part of parts) {
      current = path.join(current, part);
      if (fs.existsSync(current)) {
        if (fs.lstatSync(current).isSymbolicLink() || !fs.statSync(current).isDirectory()) {
          throw new Error('Jalur folder AUX tidak aman: ' + sub);
        }
      } else fs.mkdirSync(current);
    }
    created.push(sub);
  }
  return {folders: created, filesScanned: scanned};
}

module.exports = {prepareIncludeAuxDirectories, parseSourceReferences};
