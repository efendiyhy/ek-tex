// Static release checks. PowerShell execution itself must be tested on Windows.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

const readme = read('README.md');
const installer = read('install-windows.ps1');
const github = read('install-from-github.ps1');
const copy = read('scripts/copy-app.ps1');
const updater = read('update-windows.cmd');

assert.doesNotMatch(readme, /Push pertama ke GitHub|USERNAME\/|OWNER\/REPO/i);
assert.match(readme, /https:\/\/github\.com\/efendiyhy\/ek-tex/);
assert.match(installer, /GetFolderPath\('MyDocuments'\)/);
assert.match(github, /GetFolderPath\('MyDocuments'\)/);
assert.match(installer, /Join-Path \$documents 'EK-TeX'/);
assert.match(github, /Join-Path \$documents 'EK-TeX'/);
assert.match(github, /efendiyhy\/ek-tex/);
assert.match(installer, /scripts\\copy-app\.ps1/);
assert.match(github, /scripts\\copy-app\.ps1/);
assert.match(copy, /New-Item -ItemType Directory -Path \(Join-Path \$TargetDir 'workspace'\)/);
assert.doesNotMatch(copy, /Copy-Item[^\n]*workspace/);
assert.doesNotMatch(copy, /Remove-Item/);
assert.match(installer, /EK TeX\.lnk/);
assert.match(updater, /-NoLaunch/);
assert.match(read('update-linux.sh'), /git pull --ff-only origin main/);
console.log('[PASS] Installer defaults, fixed GitHub source, Documents path, and workspace protection');
