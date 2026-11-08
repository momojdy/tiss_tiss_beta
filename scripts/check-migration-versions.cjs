const fs = require('node:fs');
const path = require('node:path');
const versions = new Map();
for (const file of fs.readdirSync(path.join(__dirname, '../supabase/migrations'))) {
  const version = /^(\d+)_.*\.sql$/.exec(file)?.[1];
  if (!version) continue;
  versions.set(version, [...(versions.get(version) || []), file]);
}
const duplicates = [...versions].filter(([, files]) => files.length > 1);
if (duplicates.length) {
  console.error('Duplicate migration versions:', duplicates);
  process.exitCode = 1;
} else console.log(`PASS: ${versions.size} unique migration versions`);
