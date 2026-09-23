import fs from 'fs'
import { globSync } from 'glob'

const files = globSync('components/**/*.jsx')
let fixedCount = 0

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8')
  let changed = false
  
  // Match div classnames that look like modals.
  // E.g. className="relative bg-white dark:bg-slate-900 rounded-3xl shadow-2xl ..."
  const regex = /className="([^"]*rounded-(?:3xl|2xl|xl)[^"]*shadow-(?:2xl|xl|lg)[^"]*)"/g
  
  content = content.replace(regex, (fullMatch, classes) => {
    // If it's a small badge or button it might have these, but we specifically target 
    // modals which usually have w-full max-w-..., relative, bg-white
    if (!classes.includes('relative') || !classes.includes('bg-white')) {
      return fullMatch;
    }
    
    // If it already has max-h-, skip
    if (classes.includes('max-h-')) return fullMatch
    
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
