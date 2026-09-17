// @midnight-ntwrk/compact-runtime@0.16.0 ships a package.json whose "exports"
// map lists the "default" condition before "types". Node doesn't care, but
// spec-strict bundlers refuse it ("Default condition should be last one").
// This patches the installed copy in place so builds work without
// hand-editing node_modules after every `npm install`.
const fs = require('fs');
const path = require('path');

// The frontend imports the compiled contract directly from ../contract, which
// has its own separate node_modules (and therefore its own separate copy of
// the same broken package) — both need patching.
const candidatePkgPaths = [
  path.join(__dirname, '..', 'node_modules', '@midnight-ntwrk', 'compact-runtime', 'package.json'),
  path.join(__dirname, '..', '..', 'contract', 'node_modules', '@midnight-ntwrk', 'compact-runtime', 'package.json'),
];

for (const pkgPath of candidatePkgPaths) {
  if (!fs.existsSync(pkgPath)) continue;

  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
  const dotExport = pkg.exports?.['.'];

  if (dotExport && Object.keys(dotExport)[0] === 'default') {
    pkg.exports['.'] = { types: dotExport.types, default: dotExport.default };
    fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');
    console.log(`Patched @midnight-ntwrk/compact-runtime exports ordering at ${pkgPath}`);
  }
}
