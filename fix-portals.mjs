import fs from 'fs';
import { globSync } from 'glob';

const files = globSync('components/**/*.jsx');

function wrapWithPortal(content) {
  let idx = content.indexOf('className="fixed inset-0');
  if (idx === -1) return { newContent: content, changed: false };
  
  let changed = false;
  let newContent = content;
  
  while (idx !== -1) {
    let startDiv = newContent.lastIndexOf('<div', idx);
    if (startDiv === -1) {
      idx = newContent.indexOf('className="fixed inset-0', idx + 1);
      continue;
    }
    
    let beforeDiv = newContent.substring(Math.max(0, startDiv - 20), startDiv);
    if (beforeDiv.includes('<Portal>') || beforeDiv.includes('createPortal(')) {
       idx = newContent.indexOf('className="fixed inset-0', idx + 1);
       continue;
    }
    
    let openCount = 0;
    let endDiv = -1;
    for (let i = startDiv; i < newContent.length; i++) {
      if (newContent.substring(i, i + 4) === '<div' && newContent.charAt(i + 4) !== '>') {
        // Just checking '<div' is enough, but wait, self closing divs? There are no self-closing divs in React usually, but just in case.
        openCount++;
      } else if (newContent.substring(i, i + 5) === '</div') {
        openCount--;
        if (openCount === 0) {
          endDiv = newContent.indexOf('>', i) + 1;
          break;
        }
      }
    }
    
    if (endDiv !== -1 && endDiv > 0) {
      newContent = newContent.substring(0, startDiv) + 
                   '<Portal>' + 
                   newContent.substring(startDiv, endDiv) + 
                   '</Portal>' + 
                   newContent.substring(endDiv);
      changed = true;
      idx = newContent.indexOf('className="fixed inset-0', endDiv + 18); // 18 is approx len of added tags
    } else {
      idx = newContent.indexOf('className="fixed inset-0', idx + 1);
    }
  }
  
  if (changed && !newContent.includes('import { Portal }')) {
    const importLines = newContent.match(/import .*['"]/g);
    if (importLines && importLines.length > 0) {
      const lastImport = importLines[importLines.length - 1];
      const lastImportIdx = newContent.lastIndexOf(lastImport) + lastImport.length;
      newContent = newContent.substring(0, lastImportIdx) + 
                   "\nimport { Portal } from '@/components/common/Portal'" + 
                   newContent.substring(lastImportIdx);
    } else {
      newContent = "import { Portal } from '@/components/common/Portal'\n" + newContent;
    }
  }
  
  return { newContent, changed };
}

let count = 0;
for (const file of files) {
  if (file.includes('Portal.jsx') || file.includes('AuthShell.jsx')) continue;
  
  const content = fs.readFileSync(file, 'utf8');
  const { newContent, changed } = wrapWithPortal(content);
  if (changed) {
    fs.writeFileSync(file, newContent, 'utf8');
    console.log('Wrapped portals in', file);
    count++;
  }
}

console.log('Done fixing', count, 'files.');
