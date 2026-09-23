import { config } from 'dotenv'

config({ path: '.env.local' })

const required = ['STORAGE_DRIVER', 'R2_BUCKET_NAME', 'R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY']
const missing = required.filter((key) => !process.env[key])
if (!process.env.R2_ENDPOINT && !process.env.R2_ACCOUNT_ID) missing.push('R2_ENDPOINT or R2_ACCOUNT_ID')

if (missing.length) {
  console.error(`Missing R2 env value(s): ${missing.join(', ')}`)
  process.exit(1)
}

if (process.env.STORAGE_DRIVER !== 'r2') {
  console.error('STORAGE_DRIVER must be set to r2 for this check.')
  process.exit(1)
}

const endpoint = process.env.R2_ENDPOINT || `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`
try {
  const url = new URL(endpoint)
  if (!url.hostname.endsWith('.r2.cloudflarestorage.com')) {
    console.warn(`Warning: R2 endpoint host looks unusual: ${url.hostname}`)
  }
} catch {
  console.error('R2_ENDPOINT is not a valid URL.')
  process.exit(1)
}

const { deletePrivateObject, getPrivateObjectBuffer, putPrivateObject } = await import('../lib/objectStorage.js')

const key = `health-check/r2-${Date.now()}.txt`
try {
  await putPrivateObject(key, Buffer.from('nexahr-r2-ok'), { contentType: 'text/plain' })
  const buffer = await getPrivateObjectBuffer(key)
  if (buffer?.toString() !== 'nexahr-r2-ok') {
    throw new Error('Uploaded object could not be read back correctly.')
  }
  await deletePrivateObject(key)
  console.log(`R2 connected: bucket=${process.env.R2_BUCKET_NAME}, endpoint=${endpoint}`)
} catch (err) {
  const details = {
    name: err.name,
    message: err.message,
    code: err.code,
    status: err.$metadata?.httpStatusCode,
    hostname: err.hostname,
  }
  console.error(`R2 check failed: ${JSON.stringify(details)}`)
  process.exit(1)
}
