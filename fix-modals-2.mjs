import fs from 'fs'
import { globSync } from 'glob'

const files = globSync('components/**/*.jsx')
let fixedCount = 0

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8')
  let changed = false
  
  // Find all classes that define the modal box: bg-white, max-w-, w-full, rounded-
  const regex = /className="([^"]*bg-white[^"]*max-w-[a-z0-9]+[^"]*w-full[^"]*rounded-[a-z0-9]+[^"]*)"/g
  
  content = content.replace(regex, (fullMatch, classes) => {
    // If it already has max-h-, skip
    if (classes.includes('max-h-')) return fullMatch
    
    // We only want modals. They usually have shadow.
    if (!classes.includes('shadow')) return fullMatch
    
    changed = true
    return `className="max-h-[90dvh] overflow-y-auto ${classes}"`
  })
  
  if (changed) {
    fs.writeFileSync(file, content, 'utf8')
    console.log('Fixed', file)
    fixedCount++
  }
}
console.log(`Done. Fixed ${fixedCount} files.`)
