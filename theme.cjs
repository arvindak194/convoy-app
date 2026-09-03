const fs = require('fs');
const path = require('path');

function walkSync(dir, filelist = []) {
  fs.readdirSync(dir).forEach(file => {
    const dirFile = path.join(dir, file);
    if (fs.statSync(dirFile).isDirectory()) {
      filelist = walkSync(dirFile, filelist);
    } else if (dirFile.endsWith('.tsx')) {
      filelist.push(dirFile);
    }
  });
  return filelist;
}

const files = walkSync('./src');

const replacements = [
  { regex: /bg-zinc-950(?:\/80)?/g, replacement: 'bg-brand-dark/80 backdrop-blur-md' },
  { regex: /bg-zinc-900(?:\/\d+)?/g, replacement: 'bg-brand-mid/60 border border-brand-light/20 backdrop-blur-md' },
  { regex: /border-zinc-800(?:\/\d+)?/g, replacement: 'border-brand-light/20' },
  { regex: /border-zinc-700(?:\/\d+)?/g, replacement: 'border-brand-light/30' },
  { regex: /bg-zinc-800/g, replacement: 'bg-brand-mid' },
  { regex: /hover:bg-zinc-700/g, replacement: 'hover:bg-brand-light/40' },
  { regex: /bg-indigo-600/g, replacement: 'bg-gradient-to-r from-brand-light to-brand-mid' },
  { regex: /bg-indigo-500\/20/g, replacement: 'bg-gradient-to-br from-brand-light to-brand-mid shadow-lg shadow-brand-light/20' },
  { regex: /hover:bg-indigo-500/g, replacement: 'hover:from-[#09836a] hover:to-brand-light' },
  { regex: /text-indigo-400/g, replacement: 'text-teal-400' },
  { regex: /border-indigo-500/g, replacement: 'border-brand-light' },
  { regex: /bg-emerald-600/g, replacement: 'bg-gradient-to-r from-[#0c342c] to-[#076653]' },
  { regex: /hover:bg-emerald-500/g, replacement: 'hover:to-[#09836a]' },
  { regex: /text-emerald-400/g, replacement: 'text-teal-300' },
  { regex: /bg-indigo-500/g, replacement: 'bg-brand-light' },
  { regex: /bg-emerald-500/g, replacement: 'bg-teal-500' },
  { regex: /focus:border-indigo-500/g, replacement: 'focus:border-brand-light' },
  { regex: /focus:border-emerald-500/g, replacement: 'focus:border-brand-light' },
  { regex: /'line-color': '#4f46e5'/g, replacement: "'line-color': '#076653'" }
];

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  
  replacements.forEach(({ regex, replacement }) => {
    content = content.replace(regex, replacement);
  });
  
  // Cleanup duplicate borders
  content = content.replace(/border border-brand-light\/20 border border-brand-light\/20/g, 'border border-brand-light/20');
  content = content.replace(/border border-brand-light\/30 border border-brand-light\/20/g, 'border border-brand-light/30');
  content = content.replace(/backdrop-blur-md backdrop-blur-md/g, 'backdrop-blur-md');
  
  fs.writeFileSync(file, content);
});
