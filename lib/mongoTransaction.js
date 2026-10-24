import mongoose from 'mongoose'

function isUnsupportedTransactionError(error) {
  const message = String(error?.message || '').toLowerCase()
  return message.includes('transaction numbers are only allowed')
    || message.includes('transactions are not supported')
    || message.includes('standalone server')
    || message.includes('replica set')
}

// Atlas and replica-set deployments use real transactions. A local standalone
// MongoDB cannot create one, so fall back to the caller's compensating cleanup
// path instead of turning every recruitment action into a 500.
export async function withOptionalMongoTransaction(work) {
  const dbSession = await mongoose.startSession()
  try {
    try {
      let result
      await dbSession.withTransaction(async () => {
        result = await work(dbSession)
      })
      return result
    } catch (error) {
      if (!isUnsupportedTransactionError(error)) throw error
      return work(null)
    }
  } finally {
    await dbSession.endSession()
  }
}
