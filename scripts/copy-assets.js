/**
 * Copy Assets Script
 * Copies static assets (manifest, HTML, CSS, icons) to dist folder
 */

const fs = require('fs');
const path = require('path');

// Helper function to copy file
function copyFile(src, dest) {
  try {
    // Create destination directory if it doesn't exist
    const destDir = path.dirname(dest);
    if (!fs.existsSync(destDir)) {
      fs.mkdirSync(destDir, { recursive: true });
    }

    // Copy file
    fs.copyFileSync(src, dest);
    console.log(`✓ Copied: ${src} → ${dest}`);
  } catch (error) {
    console.error(`✗ Failed to copy ${src}:`, error.message);
    process.exit(1);
  }
}

// Helper function to copy directory recursively
function copyDirectory(src, dest) {
  try {
    // Create destination directory
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest, { recursive: true });
    }

    // Read directory contents
    const entries = fs.readdirSync(src, { withFileTypes: true });

    for (const entry of entries) {
      const srcPath = path.join(src, entry.name);
      const destPath = path.join(dest, entry.name);

      if (entry.isDirectory()) {
        copyDirectory(srcPath, destPath);
      } else {
        copyFile(srcPath, destPath);
      }
    }
  } catch (error) {
    console.error(`✗ Failed to copy directory ${src}:`, error.message);
    process.exit(1);
  }
}

console.log('📦 Copying assets to dist folder...\n');

// Copy manifest.json
copyFile('manifest.json', 'dist/manifest.json');

// Copy HTML files
copyFile('src/popup/popup.html', 'dist/popup/popup.html');

// Copy CSS files
copyFile('src/popup/popup.css', 'dist/popup/popup.css');

// Copy icons directory
if (fs.existsSync('logo')) {
  copyDirectory('logo', 'dist/logo');
}

// Copy settings (if exists)
if (fs.existsSync('settings')) {
  copyDirectory('settings', 'dist/settings');
}

// Copy popup folder (vanilla JS files if any)
if (fs.existsSync('popup')) {
  const popupEntries = fs.readdirSync('popup');
  for (const file of popupEntries) {
    if (file.endsWith('.html') || file.endsWith('.css') || file.endsWith('.png')) {
      copyFile(path.join('popup', file), path.join('dist/popup', file));
    }
  }
}

console.log('\n✅ All assets copied successfully!');
