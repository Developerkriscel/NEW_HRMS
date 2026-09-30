import net from 'node:net'

if (
  process.env.RENDER ||
  process.env.CI ||
  process.env.NODE_ENV === 'production' ||
  process.platform !== 'win32'
) {
  process.exit(0)
}

const cwd = process.cwd()
const normalized = cwd.toLowerCase()
const expected = 'c:\\projects\\nexahr'
const allowSlowDev = process.env.ALLOW_SLOW_DEV === '1'
const port = Number(process.env.PORT || process.argv[2] || 3000)

if (!allowSlowDev && normalized !== expected) {
  console.error('')
  console.error('NexaHR server blocked to avoid slow duplicate watchers.')
  console.error(`Current folder: ${cwd}`)
  console.error('Use this fast folder instead:')
  console.error('  cd C:\\Projects\\NexaHR')
  console.error('')
  process.exit(1)
}

function canListen(host) {
  return new Promise((resolve) => {
    const server = net.createServer()
    server.once('error', () => resolve(false))
    server.once('listening', () => {
      server.close(() => resolve(true))
    })
    server.listen(port, host)
  })
}

const ipv4Free = await canListen('0.0.0.0')
const ipv6Free = await canListen('::')

if (!ipv4Free || !ipv6Free) {
  console.error('')
  console.error(`Port ${port} is already in use. Stop the old NexaHR server first:`)
  console.error(`  netstat -ano | findstr :${port}`)
  console.error('  Stop-Process -Id <PID> -Force')
  console.error('')
  process.exit(1)
}
