import fs from 'node:fs/promises'
import path from 'node:path'

const root = process.cwd()
const standaloneDir = path.join(root, '.next', 'standalone')

async function copyIfExists(source, destination) {
  try {
    await fs.access(source)
    await fs.cp(source, destination, { recursive: true, force: true })
    console.log(`Copied ${path.relative(root, source)} -> ${path.relative(root, destination)}`)
  } catch (error) {
    if (error.code === 'ENOENT') return
    throw error
  }
}

await fs.access(standaloneDir)
await fs.mkdir(path.join(standaloneDir, '.next'), { recursive: true })

await copyIfExists(path.join(root, '.next', 'static'), path.join(standaloneDir, '.next', 'static'))
await copyIfExists(path.join(root, 'public'), path.join(standaloneDir, 'public'))

