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

async function copyServerChunksForStandalone() {
  const source = path.join(root, '.next', 'server', 'chunks')
  const destination = path.join(standaloneDir, '.next', 'server')

  try {
    const entries = await fs.readdir(source, { withFileTypes: true })
    await fs.mkdir(destination, { recursive: true })
    await Promise.all(
      entries
        .filter((entry) => entry.isFile() && entry.name.endsWith('.js'))
        .map((entry) => fs.copyFile(path.join(source, entry.name), path.join(destination, entry.name)))
    )
    console.log(`Copied standalone server chunks -> ${path.relative(root, destination)}`)
  } catch (error) {
    if (error.code === 'ENOENT') return
    throw error
  }
}

await fs.access(standaloneDir)
await fs.mkdir(path.join(standaloneDir, '.next'), { recursive: true })

await copyIfExists(path.join(root, '.next', 'static'), path.join(standaloneDir, '.next', 'static'))
await copyIfExists(path.join(root, 'public'), path.join(standaloneDir, 'public'))
await copyServerChunksForStandalone()
