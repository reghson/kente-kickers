// Copies the static game into www/ for Capacitor (offline bundle). The service worker is not
// needed inside the app (assets are bundled), so it is left out; index.html registers it only on http(s).
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..'), out = path.join(root, 'www');
fs.rmSync(out, { recursive: true, force: true }); fs.mkdirSync(out);
const files = ['index.html', 'style.css', 'manifest.webmanifest', 'privacy.html'];
const dirs = ['js', 'icons'];
for (const f of files) fs.copyFileSync(path.join(root, f), path.join(out, f));
for (const d of dirs) fs.cpSync(path.join(root, d), path.join(out, d), { recursive: true });
// Android build flavour: debug builds use Google's TEST ad units; release builds use the real IDs from js/config.js.
const debug = process.argv.includes('--debug');
fs.writeFileSync(path.join(out, 'js', 'build-env.js'), `window.KK = window.KK || {}; KK.BUILD = { debug: ${debug}, target: 'android' };\n`);
console.log('build:', debug ? 'debug (test ads)' : 'release');
console.log('www ready:', fs.readdirSync(out).join(', '));
