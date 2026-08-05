// Ensures indexes exist for the Phase 3 plan/module/subscription/billing
// collections — see scripts/migratePhase2.mjs for why this is explicit
// rather than relying on Mongoose's dev-only autoIndex.
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
  { name: 'Module', indexes: [[{ key: 1 }, { unique: true }]] },
  { name: 'PlanModule', indexes: [[{ plan: 1, module: 1 }, { unique: true }]] },
  { name: 'SubscriptionHistory', indexes: [[{ subscription: 1, createdAt: -1 }, {}]] },
  { name: 'SubscriptionCredit', indexes: [[{ subscription: 1 }, {}]] },
  { name: 'InvoiceMetadata', indexes: [[{ invoiceNumber: 1 }, { unique: true }], [{ tenant: 1 }, {}]] },
  { name: 'PaymentMetadata', indexes: [[{ invoice: 1 }, {}]] },
  { name: 'TenantUsage', indexes: [[{ tenant: 1, snapshotAt: -1 }, {}]] },
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
