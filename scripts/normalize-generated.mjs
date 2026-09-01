// Kubb emits barrel files in filesystem-iteration order, which is not stable
// across runs. The contract staleness gate compares generated output against
// what is committed, so a reshuffled barrel would fail the gate on a clean tree
// and train everyone to ignore it. Sorting makes generation idempotent.
import { readdirSync, readFileSync, writeFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const root = 'src/generated';
let normalized = 0;

const walk = (dir) => {
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) {
      walk(path);
      continue;
    }
    if (entry !== 'index.ts') continue;

    const original = readFileSync(path, 'utf8');
    const lines = original.split('\n');
    const exports = lines.filter((l) => l.startsWith('export '));
    if (exports.length === 0) continue;

    const header = lines.slice(0, lines.indexOf(exports[0]));
    const sorted = [...exports].sort();
    const next = [...header, ...sorted, ''].join('\n');

    if (next !== original) {
      writeFileSync(path, next);
      normalized += 1;
    }
  }
};

walk(root);
console.log(`normalized ${normalized} barrel file(s)`);
