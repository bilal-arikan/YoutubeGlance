const esbuild = require('esbuild');
const fs = require('fs');
const path = require('path');

// Create dist directory if it doesn't exist
const distDir = path.join(__dirname, '../dist');
if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true });
}

// Content scripts to bundle
const contentScripts = [
  'src/content/buttonStyles.ts',
  'src/content/buttonInjection.ts',
  'src/content/youtubeDetection.ts',
];

// Build each content script
contentScripts.forEach((script) => {
  const outputFile = script.replace('src/', 'dist/').replace('.ts', '.js');
  
  esbuild
    .build({
      entryPoints: [script],
      outfile: outputFile,
      bundle: true,
      minify: false,
      sourcemap: true,
      platform: 'browser',
      target: 'es2020',
      format: 'iife',
      logLevel: 'info',
    })
    .catch((err) => {
      console.error(`Error building ${script}:`, err);
      process.exit(1);
    });
});

// Build service worker
esbuild
  .build({
    entryPoints: ['src/background/serviceWorker.ts'],
    outfile: 'dist/background/serviceWorker.js',
    bundle: true,
    minify: false,
    sourcemap: true,
    platform: 'browser',
    target: 'es2020',
    logLevel: 'info',
  })
  .catch((err) => {
    console.error('Error building service worker:', err);
    process.exit(1);
  });

// Build popup
esbuild
  .build({
    entryPoints: ['src/popup/popupUI.ts'],
    outfile: 'dist/popup/popupUI.js',
    bundle: true,
    minify: false,
    sourcemap: true,
    platform: 'browser',
    target: 'es2020',
    format: 'iife',
    logLevel: 'info',
  })
  .catch((err) => {
    console.error('Error building popup:', err);
    process.exit(1);
  });

// Copy static files to dist
const staticFiles = [
  { src: 'manifest.json', dest: 'dist/manifest.json' },
  { src: 'src/popup/popup.html', dest: 'dist/popup/popup.html' },
  { src: 'src/popup/popup.css', dest: 'dist/popup/popup.css' },
];

staticFiles.forEach(({ src, dest }) => {
  const srcPath = path.join(__dirname, '..', src);
  const destPath = path.join(__dirname, '..', dest);
  const destDir = path.dirname(destPath);
  if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
  }
  if (fs.existsSync(srcPath)) {
    fs.copyFileSync(srcPath, destPath);
  }
});

console.log('✅ Build completed!');
