// Ensures indexes exist for the Phase 2 tenant-provisioning/lifecycle
// collections. Mongoose builds indexes automatically on first connect in
// dev (autoIndex defaults to true), but that's implicit and won't run at
// all if autoIndex is disabled (the recommended setting for production) —
// this makes index creation explicit and re-runnable, matching the pattern
// already used by provisionTenantDatabase() in lib/tenantDb.js. Re-declares
// schemas ad-hoc (matching scripts/seed.mjs's existing convention) since a
// plain `node` process can't resolve this project's `@/` import alias.
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
  {
    name: 'Tenant',
    schema: new mongoose.Schema({}, { strict: false }),
    indexes: [
      [{ status: 1 }, {}],
      [{ provisioningStatus: 1 }, {}],
      [{ tenantCode: 1 }, { unique: true }],
      [{ email: 1 }, { unique: true }],
      [{ subdomain: 1 }, { unique: true, sparse: true }],
      [{ databaseName: 1 }, { unique: true, sparse: true }],
    ],
  },
  {
    name: 'TenantProvisioningJob',
    schema: new mongoose.Schema({}, { strict: false }),
    indexes: [
      [{ idempotencyKey: 1 }, { unique: true }],
      [{ status: 1, createdAt: -1 }, {}],
    ],
  },
  {
    name: 'TenantProvisioningStep',
    schema: new mongoose.Schema({}, { strict: false }),
    indexes: [
      [{ job: 1, stepKey: 1 }, { unique: true }],
    ],
  },
  {
    name: 'TenantLifecycleEvent',
    schema: new mongoose.Schema({}, { strict: false }),
    indexes: [
      [{ tenant: 1, createdAt: -1 }, {}],
    ],
  },
]

async function main() {
  await mongoose.connect(MONGODB_URI)
  console.log('Connected to MongoDB')

  for (const { name, schema, indexes } of collections) {
    const Model = mongoose.models[name] || mongoose.model(name, schema)
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
