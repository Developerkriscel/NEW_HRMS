import fs from 'fs'
import { globSync } from 'glob'

const files = globSync('components/**/*.jsx')
let fixedCount = 0

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8')
  let changed = false
  
  const regex = /className="([^"]*)"/g
  
  content = content.replace(regex, (fullMatch, classes) => {
    const cls = classes.split(' ')
    const hasBgWhite = cls.includes('bg-white')
    const hasWFull = cls.includes('w-full')
    const hasMaxW = cls.some(c => c.startsWith('max-w-'))
    const hasRounded = cls.some(c => c.startsWith('rounded-xl') || c.startsWith('rounded-2xl') || c.startsWith('rounded-3xl'))
    const hasShadow = cls.some(c => c.startsWith('shadow-lg') || c.startsWith('shadow-xl') || c.startsWith('shadow-2xl'))
    const isFixed = cls.includes('fixed')
    
    // We want the inner modal container. It shouldn't be the fixed inset-0 wrapper itself, 
    // but the box inside it.
    if (hasBgWhite && hasWFull && hasMaxW && hasRounded && !isFixed) {
      if (cls.some(c => c.startsWith('max-h-'))) return fullMatch
      
      changed = true
      return `className="max-h-[90dvh] overflow-y-auto ${classes}"`
    }
    
    return fullMatch
  })
  
  if (changed) {
    fs.writeFileSync(file, content, 'utf8')
    console.log('Fixed', file)
    fixedCount++
  }
}
console.log(`Done. Fixed ${fixedCount} files.`)
