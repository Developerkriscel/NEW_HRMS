import mongoose from 'mongoose'

const MONGODB_URI = process.env.MONGODB_DIRECT_URI || process.env.MONGODB_URI

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

async function connectWithRetry(uri, options, attempts = 3, delayMs = 750) {
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      return await mongoose.connect(uri, options)
    } catch (err) {
      if (!isTransientDnsError(err) || attempt === attempts) throw err
      await new Promise((resolve) => setTimeout(resolve, delayMs * attempt))
    }
  }
}

export async function connectDB() {
  if (cached.conn) return cached.conn

  if (!MONGODB_URI) {
    throw new Error('MONGODB_URI is not set. Copy .env.example to .env.local and configure your MongoDB Atlas connection string.')
  }

  if (!cached.promise) {
    cached.promise = connectWithRetry(MONGODB_URI, {
      bufferCommands: false,
      serverSelectionTimeoutMS: 8000,
      connectTimeoutMS: 8000,
      socketTimeoutMS: 20000,
    })
  }

  try {
    cached.conn = await cached.promise
  } catch (err) {
    cached.promise = null
    throw err
  }

  return cached.conn
}
