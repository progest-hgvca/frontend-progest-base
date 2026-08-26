const fs = require('fs');
const path = require('path');

const srcPath = path.join(__dirname, 'src');

function getAllFiles(dirPath, arrayOfFiles) {
  const files = fs.readdirSync(dirPath);
  arrayOfFiles = arrayOfFiles || [];
  files.forEach(function(file) {
    if (fs.statSync(dirPath + '/' + file).isDirectory()) {
      arrayOfFiles = getAllFiles(dirPath + '/' + file, arrayOfFiles);
    } else {
      arrayOfFiles.push(path.join(dirPath, '/', file));
    }
  });
  return arrayOfFiles;
}

const allFiles = getAllFiles(srcPath);
const vueFiles = allFiles.filter(f => f.endsWith('.vue'));
const jsVueFiles = allFiles.filter(f => f.endsWith('.js') || f.endsWith('.vue'));

const unimported = [];

vueFiles.forEach(vueFile => {
  const baseName = path.basename(vueFile);
  const baseNameNoExt = path.parse(vueFile).name;
  let found = false;

  for (let i = 0; i < jsVueFiles.length; i++) {
    if (jsVueFiles[i] === vueFile) continue; // skip self
    const content = fs.readFileSync(jsVueFiles[i], 'utf8');
    if (content.includes(baseName) || content.includes(baseNameNoExt + ".vue")) {
      found = true;
      break;
    }
  }
  
  if (!found) {
    // Also check router/index.js specifically for dynamic imports just in case
    unimported.push(vueFile);
  }
});

console.log(unimported);
