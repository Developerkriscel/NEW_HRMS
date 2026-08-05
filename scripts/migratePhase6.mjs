// Indexes for Phase 6 (support access) collections, plus a Tenant.createdAt
// index the Phase 7 dashboard's month-bucketed aggregations rely on.
import dotenv from 'dotenv'
import mongoose from 'mongoose'

dotenv.config({ path: '.env.local' })
dotenv.config()

const MONGODB_URI = process.env.MONGODB_DIRECT_URI || process.env.MONGODB_URI
if (!MONGODB_URI) {
  console.error('MONGODB_URI is not set. Copy .env.example to .env.local and configure it first.')
  process.exit(1)
}

const collections = [
  { name: 'SupportRequest', indexes: [[{ status: 1, createdAt: -1 }, {}], [{ tenant: 1 }, {}]] },
  { name: 'SupportAccessSession', indexes: [[{ operator: 1, status: 1 }, {}], [{ tenant: 1, status: 1 }, {}]] },
  { name: 'SupportAccessEvent', indexes: [[{ session: 1, createdAt: -1 }, {}]] },
  { name: 'Tenant', indexes: [[{ createdAt: -1 }, {}]] },
  { name: 'Subscription', indexes: [[{ createdAt: -1 }, {}], [{ endDate: 1 }, {}]] },
]

async function main() {
  await mongoose.connect(MONGODB_URI)
  console.log('Connected to MongoDB')

  for (const { name, indexes } of collections) {
    const Model = mongoose.models[name] || mongoose.model(name, new mongoose.Schema({}, { strict: false }))
    for (const [fields, options] of indexes) {
      await Model.collection.createIndex(fields, options)
    }
    console.log(`Ensured ${indexes.length} index(es) on ${name}`)
  }

  await mongoose.disconnect()
  console.log('Done')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
