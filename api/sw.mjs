import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const FILES = [
  'index.html', 'sw.js', 'shared/rules.js',
  'js/app.js', 'js/net.js', 'js/ui.js', 'js/avatar.js', 'js/intro-anim.js',
  'css/tokens.css', 'css/base.css', 'css/components.css', 'css/screens.css', 'css/intro.css',
  'server/questions.json',
];

function buildHash() {
  const hash = crypto.createHash('sha256');
  for (const file of FILES) {
    try { hash.update(file).update(fs.readFileSync(path.join(ROOT, file))); } catch (e) {}
  }
  return hash.digest('hex').slice(0, 12);
}

export default function handler(req, res) {
  const source = fs.readFileSync(path.join(ROOT, 'sw.js'), 'utf8')
    .replace(/__BUILD_HASH__/g, buildHash());
  res.setHeader('content-type', 'application/javascript; charset=utf-8');
  res.setHeader('cache-control', 'no-cache');
  res.end(source);
}
