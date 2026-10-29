// Builds the release ZIP that people download and load unpacked. Run: npm run package
// Output: dist/snoozed-tabs/ (the unpacked extension) and dist/snoozed-tabs-<version>.zip
// When run for a git tag (GITHUB_REF_NAME=v1.2.3), fails unless the tag matches the version.
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const root = path.resolve(__dirname, '..');
const dist = path.join(root, 'dist');
const folderName = 'snoozed-tabs';

// Only what Chrome needs to run the extension
const RUNTIME_FILES = ['manifest.json', 'background.js', 'background', 'popup', 'utils', 'styles', 'icons', 'LICENSE'];

const manifest = JSON.parse(fs.readFileSync(path.join(root, 'manifest.json'), 'utf8'));
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const version = manifest.version;

if (pkg.version !== version) {
  throw new Error(`package.json version ${pkg.version} does not match manifest.json version ${version}`);
}

const tag = process.env.GITHUB_REF_NAME;
if (tag && tag.startsWith('v') && tag !== `v${version}`) {
  throw new Error(`Tag ${tag} does not match manifest.json version ${version}`);
}

const outDir = path.join(dist, folderName);
fs.rmSync(dist, { recursive: true, force: true });
fs.mkdirSync(outDir, { recursive: true });

for (const entry of RUNTIME_FILES) {
  fs.cpSync(path.join(root, entry), path.join(outDir, entry), {
    recursive: true,
    filter: src => path.basename(src) !== '.DS_Store'
  });
}

const zipName = `${folderName}-${version}.zip`;
execFileSync('zip', ['-r', '-q', '-X', zipName, folderName], { cwd: dist, stdio: 'inherit' });

console.log(`Built dist/${zipName}`);
