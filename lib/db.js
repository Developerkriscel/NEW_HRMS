import mongoose from 'mongoose'

function isValidMongoUri(value) {
  if (typeof value !== 'string') return false
  const uri = value.trim()
  // URL() rejects valid mongodb:// replica-set URIs because they contain
  // comma-separated hosts. Validate the MongoDB scheme and authority instead.
  return /^mongodb(?:\+srv)?:\/\/[^\s]+$/i.test(uri)
}

// Prefer the verified direct URI in this environment. The SRV URI currently
// resolves to an unreachable endpoint here, while the direct URI connects to
// the same configured Atlas deployment. Keep SRV as a fallback for deploys
// where direct shard access is unavailable.
const configuredMongoUris = [process.env.MONGODB_DIRECT_URI, process.env.MONGODB_URI].filter(Boolean)
const MONGODB_URIS = [...new Set(configuredMongoUris.filter(isValidMongoUri))]
const hasInvalidMongoUri = configuredMongoUris.some((uri) => !isValidMongoUri(uri))
const MONGODB_DB_NAME = process.env.MONGODB_DB_NAME || 'krisceltech_platform_admin'
const CONNECT_TIMEOUT_MS = Number(process.env.MONGODB_CONNECT_TIMEOUT_MS || 5000)
const SOCKET_TIMEOUT_MS = Number(process.env.MONGODB_SOCKET_TIMEOUT_MS || 8000)
const MAX_POOL_SIZE = Number(process.env.MONGODB_MAX_POOL_SIZE || 10)
const MIN_POOL_SIZE = Number(process.env.MONGODB_MIN_POOL_SIZE || 2)

let cached = global._mongoose
if (!cached) {
  cached = global._mongoose = { conn: null, promise: null }
}

// Some Windows networks intermittently fail DNS lookups needed to connect
// (SRV/TXT for mongodb+srv://, or plain A-record getaddrinfo for direct
// URIs) with EAI_AGAIN, even though the same lookup succeeds a moment
// later. The mongodb driver wraps these several `cause` levels deep
// (MongoServerSelectionError -> MongoNetworkError -> the raw dns Error),
// so walk the chain instead of only checking the top-level error.
const TRANSIENT_DNS_SYSCALLS = new Set(['querySrv', 'queryTxt', 'getaddrinfo'])
function isTransientDnsError(err) {
  for (let e = err, depth = 0; e && depth < 5; e = e.cause, depth++) {
    if (TRANSIENT_DNS_SYSCALLS.has(e.syscall) || e.code === 'EAI_AGAIN') return true
  }
  return false
}

async function connectWithRetry(uri, options, attempts = Number(process.env.MONGODB_CONNECT_RETRIES || 2), delayMs = 300) {
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      return await mongoose.connect(uri, options)
    } catch (err) {
      if (!isTransientDnsError(err) || attempt === attempts) throw err
      await new Promise((resolve) => setTimeout(resolve, delayMs * attempt))
    }
  }
}

async function connectToConfiguredMongo() {
  let lastError = null
  for (const uri of MONGODB_URIS) {
    try {
      return await connectWithRetry(uri, {
        bufferCommands: false,
        dbName: MONGODB_DB_NAME,
        serverSelectionTimeoutMS: CONNECT_TIMEOUT_MS,
        connectTimeoutMS: CONNECT_TIMEOUT_MS,
        socketTimeoutMS: SOCKET_TIMEOUT_MS,
        maxPoolSize: MAX_POOL_SIZE,
        minPoolSize: MIN_POOL_SIZE,
        maxIdleTimeMS: 120000,
      })
    } catch (err) {
      lastError = err
      if (mongoose.connection.readyState !== 0) await mongoose.disconnect().catch(() => {})
    }
  }
  throw lastError || new Error('No MongoDB connection string is configured')
}

export async function connectDB() {
  if (cached.conn) return cached.conn

  if (!MONGODB_URIS.length) {
    throw new Error(hasInvalidMongoUri
      ? 'MONGODB_URI is invalid. Use a complete mongodb:// or mongodb+srv:// connection string.'
      : 'MONGODB_URI is not set. Copy .env.example to .env.local and configure your MongoDB Atlas connection string.')
  }

  if (!cached.promise) {
    cached.promise = connectToConfiguredMongo()
  }

  try {
    cached.conn = await cached.promise
  } catch (err) {
    cached.promise = null
    throw err
  }

  return cached.conn
}
