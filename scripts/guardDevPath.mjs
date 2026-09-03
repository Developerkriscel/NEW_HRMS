const cwd = process.cwd()
const normalized = cwd.toLowerCase()
const expected = 'c:\\projects\\nexahr'
const allowSlowDev = process.env.ALLOW_SLOW_DEV === '1'

if (allowSlowDev) {
  process.exit(0)
}

if (normalized !== expected) {
  console.error('')
  console.error('NexaHR dev server blocked to avoid slow duplicate watchers.')
  console.error(`Current folder: ${cwd}`)
  console.error('Use this fast folder instead:')
  console.error('  cd C:\\Projects\\NexaHR')
  console.error('  npm run dev')
  console.error('')
  console.error('If you intentionally need this slow path, run with ALLOW_SLOW_DEV=1.')
  console.error('')
  process.exit(1)
}
