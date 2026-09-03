import { spawn } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const port = Number(process.env.PORT || 3000)
const currentDir = path.dirname(fileURLToPath(import.meta.url))
const projectRoot = path.resolve(currentDir, '..')
const nextBinPath = path.join(projectRoot, 'node_modules', 'next', 'dist', 'bin', 'next')
const child = spawn(process.execPath, [nextBinPath, 'dev', '--turbo', '--port', String(port)], {
  stdio: ['inherit', 'pipe', 'pipe'],
  env: process.env,
  cwd: projectRoot,
})

let warmed = false

function relay(stream, target) {
  stream.on('data', (chunk) => {
    const text = chunk.toString()
    target.write(text)
    if (!warmed && (text.includes('Ready in') || text.includes('ready - started server'))) {
      warmed = true
      setTimeout(() => {
        void prewarm().catch((error) => {
          process.stderr.write(`[dev-warmup] failed: ${error.message}\n`)
        })
      }, 250)
    }
  })
}

relay(child.stdout, process.stdout)
relay(child.stderr, process.stderr)

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal)
    return
  }
  process.exit(code ?? 0)
})

process.on('SIGINT', () => child.kill('SIGINT'))
process.on('SIGTERM', () => child.kill('SIGTERM'))

async function prewarm() {
  const base = `http://127.0.0.1:${port}`
  const jar = { cookie: '' }

  async function hit(path, options = {}) {
    const response = await fetch(`${base}${path}`, {
      redirect: 'manual',
      headers: {
        cookie: jar.cookie,
        ...(options.headers || {}),
      },
      method: options.method || 'GET',
      body: options.body,
    })

    const setCookie = response.headers.get('set-cookie')
    if (setCookie) {
      jar.cookie = setCookie
        .split(',')
        .map((value) => value.split(';')[0])
        .join('; ')
    }
    await response.arrayBuffer()
    return response.status
  }

  const startedAt = Date.now()
  const routes = [
    ['/login'],
    ['/api/auth/dev-login', { method: 'POST', headers: { 'content-type': 'application/json' } }],
    ['/super-admin/dashboard'],
    ['/super-admin/tenants'],
    ['/super-admin/plans'],
    ['/hr/dashboard'],
    ['/hr/employees'],
    ['/hr/attendance'],
    ['/hr/leave'],
    ['/hr/payroll'],
    ['/hr/recruitment'],
    ['/hr/recruitment/jobs'],
    ['/hr/recruitment/candidates'],
    ['/hr/recruitment/interviews'],
    ['/hr/recruitment/requisitions'],
    ['/employee/dashboard'],
    ['/employee/tasks'],
    ['/employee/requests'],
    ['/manager/dashboard'],
    ['/manager/leave-approvals'],
    ['/manager/tasks'],
  ]

  for (const [path, options] of routes) {
    try {
      const status = await hit(path, options)
      process.stdout.write(`[dev-warmup] ${path} -> ${status}\n`)
    } catch (error) {
      process.stderr.write(`[dev-warmup] ${path} failed: ${error.message}\n`)
    }
  }

  process.stdout.write(`[dev-warmup] completed in ${Date.now() - startedAt}ms\n`)
}
