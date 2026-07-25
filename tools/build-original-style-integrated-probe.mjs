import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import process from 'node:process';

const basePath = new URL('./chatgpt-original-style-probe.js', import.meta.url);
const extensionPath = new URL('./chatgpt-original-style-gap-probe.js', import.meta.url);
const outputPath = process.argv[2];

if (!outputPath) {
  console.error('Usage: node tools/build-original-style-integrated-probe.mjs <output.js>');
  process.exit(2);
}

const [base, extension] = await Promise.all([
  readFile(basePath, 'utf8'),
  readFile(extensionPath, 'utf8'),
]);
const normalizeLf = (source) => source.replace(/\r\n?/g, '\n');

const header = `/*
 * ChatGPT Original Style Integrated Probe v1.0.1
 *
 * Single-snippet build:
 * - complete computed-style and matched-rule capture engine
 * - automatic visible-component discovery
 * - automatic hover, focus, press, click, keyboard, open, selected,
 *   checked, highlighted, dialog, menu, listbox, and tooltip capture
 *
 * Run with all third-party UserCSS disabled.
 */

`;
const output = `${header}${normalizeLf(base).trimEnd()}\n\n${normalizeLf(extension).trimStart()}`;
new Function(output);
await writeFile(outputPath, output, 'utf8');

const sha256 = createHash('sha256').update(output).digest('hex');
console.log(`wrote=${outputPath}`);
console.log(`bytes=${Buffer.byteLength(output)}`);
console.log(`sha256=${sha256}`);
