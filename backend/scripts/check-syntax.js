const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

function javascriptFiles(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) return javascriptFiles(fullPath);
    return entry.name.endsWith('.js') ? [fullPath] : [];
  });
}

for (const directory of [path.join(__dirname, '..', 'src'), __dirname]) {
  for (const file of javascriptFiles(directory)) {
  execFileSync(process.execPath, ['--check', file], { stdio: 'inherit' });
  }
}

console.log('Backend syntax check passed.');

