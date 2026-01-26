#!/usr/bin/env node
/**
 * PWA Icon Generator
 * Converts SVG icon to PNG at required sizes for PWA
 * Run: node scripts/generate-icons.js
 */

const fs = require('fs');
const path = require('path');

// We'll use a simple approach - create a minimal PNG generator
// For production, you'd want to use sharp or canvas

const sizes = [192, 512, 180]; // 180 for apple-touch-icon
const outputNames = ['icon-192.png', 'icon-512.png', 'apple-touch-icon.png'];

// Read the SVG
const svgPath = path.join(__dirname, '..', 'public', 'icon.svg');
const svgContent = fs.readFileSync(svgPath, 'utf8');

console.log('PWA Icon Generator');
console.log('==================');
console.log('');
console.log('To generate PNG icons from the SVG, you have two options:');
console.log('');
console.log('Option 1: Use an online converter');
console.log('  1. Go to https://cloudconvert.com/svg-to-png');
console.log('  2. Upload public/icon.svg');
console.log('  3. Generate at 192x192, 512x512, and 180x180 sizes');
console.log('  4. Save as icon-192.png, icon-512.png, apple-touch-icon.png in public/');
console.log('');
console.log('Option 2: Install sharp and run this script');
console.log('  npm install sharp --save-dev');
console.log('  Then uncomment the sharp code below and run again');
console.log('');

// Check if sharp is available
try {
  const sharp = require('sharp');

  console.log('Sharp found! Generating icons...');

  const publicDir = path.join(__dirname, '..', 'public');

  Promise.all([
    // 192x192
    sharp(Buffer.from(svgContent))
      .resize(192, 192)
      .png()
      .toFile(path.join(publicDir, 'icon-192.png')),

    // 512x512
    sharp(Buffer.from(svgContent))
      .resize(512, 512)
      .png()
      .toFile(path.join(publicDir, 'icon-512.png')),

    // Apple touch icon 180x180
    sharp(Buffer.from(svgContent))
      .resize(180, 180)
      .png()
      .toFile(path.join(publicDir, 'apple-touch-icon.png')),
  ]).then(() => {
    console.log('Icons generated successfully!');
    console.log('  - public/icon-192.png');
    console.log('  - public/icon-512.png');
    console.log('  - public/apple-touch-icon.png');
  }).catch(err => {
    console.error('Error generating icons:', err);
  });

} catch (e) {
  console.log('Sharp not installed. Installing now...');
  console.log('Run: npm install sharp --save-dev && node scripts/generate-icons.js');
}
