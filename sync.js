/**
 * NeuralHub Sync Script
 * Run: node sync.js
 * Copies all frontend/ files to root so GitHub Pages serves latest version
 */

const fs = require('fs');
const path = require('path');

const files = [
  'index.html',
  'tools.html',
  'dashboard.html',
  'tool-detail.html',
  'pricing.html',
  'submit.html',
  'reset-password.html',
  'verify-email.html',
  '404.html',
  'animations.js',
  'mobile.css'
];

let copied = 0;
let skipped = 0;

files.forEach(file => {
  const src = path.join(__dirname, 'frontend', file);
  const dest = path.join(__dirname, file);

  if (!fs.existsSync(src)) {
    console.log(`⚠️  Skipped (not found): ${file}`);
    skipped++;
    return;
  }

  try {
    fs.copyFileSync(src, dest);
    console.log(`✅ Synced: ${file}`);
    copied++;
  } catch (err) {
    console.error(`❌ Failed to copy ${file}: ${err.message}`);
    skipped++;
  }
});

console.log(`\n🚀 Done! ${copied} files synced, ${skipped} skipped.`);
console.log('\nNow run:');
console.log('  git add -A');
console.log('  git commit -m "sync: update root files from frontend/"');
console.log('  git push');