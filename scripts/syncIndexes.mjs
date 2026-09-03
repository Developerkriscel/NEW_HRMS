import dotenv from 'dotenv'
import mongoose from 'mongoose'

dotenv.config({ path: '.env.local' })
dotenv.config()

const MONGODB_URI = process.env.MONGODB_DIRECT_URI || process.env.MONGODB_URI
if (!MONGODB_URI) {
  console.error('MONGODB_URI is not set')
  process.exit(1)
}

async function createIndexes(db, collectionName, indexes) {
  const collection = db.collection(collectionName)
  for (const [keys, options = {}] of indexes) {
    await collection.createIndex(keys, options)
  }
}

async function main() {
  await mongoose.connect(MONGODB_URI, {
    serverSelectionTimeoutMS: Number(process.env.MONGODB_CONNECT_TIMEOUT_MS || 4000),
    connectTimeoutMS: Number(process.env.MONGODB_CONNECT_TIMEOUT_MS || 4000),
    socketTimeoutMS: Number(process.env.MONGODB_SOCKET_TIMEOUT_MS || 15000),
  })

  const rootDb = mongoose.connection.db
  await createIndexes(rootDb, 'tenants', [
    [{ deleted: 1, status: 1 }],
    [{ deleted: 1, createdAt: -1 }],
    [{ adminEmail: 1, deleted: 1 }],
  ])
  await createIndexes(rootDb, 'subscriptions', [
    [{ status: 1, createdAt: -1 }],
    [{ tenant: 1, status: 1 }],
    [{ endDate: 1, status: 1 }],
    [{ deleted: 1, createdAt: -1 }],
  ])
  await createIndexes(rootDb, 'plans', [
    [{ deleted: 1, active: 1, sortOrder: 1 }],
  ])

  const tenants = await rootDb
    .collection('tenants')
    .find({ deleted: { $ne: true }, databaseName: { $type: 'string', $ne: '' } })
    .project({ databaseName: 1 })
    .toArray()

  for (const tenant of tenants) {
    const db = mongoose.connection.useDb(tenant.databaseName, { useCache: true }).db
    await createIndexes(db, 'employees', [
      [{ email: 1, tenantId: 1, deleted: 1 }],
      [{ tenantId: 1, deleted: 1, status: 1 }],
      [{ tenantId: 1, deleted: 1, role: 1 }],
      [{ tenantId: 1, deleted: 1, createdAt: -1 }],
      [{ tenantId: 1, firstName: 1 }],
    ])
    await createIndexes(db, 'attendances', [
      [{ employee: 1, date: 1 }, { unique: true }],
      [{ tenantId: 1, date: 1 }],
      [{ tenantId: 1, date: -1 }],
      [{ tenantId: 1, regularizationStatus: 1, date: -1 }],
      [{ employee: 1, date: -1 }],
    ])
    await createIndexes(db, 'leaverequests', [
      [{ employee: 1 }],
      [{ employee: 1, createdAt: -1 }],
      [{ employee: 1, status: 1, createdAt: -1 }],
      [{ tenantId: 1, status: 1 }],
      [{ tenantId: 1, status: 1, createdAt: -1 }],
      [{ tenantId: 1, startDate: 1, endDate: 1 }],
    ])
  }

  console.log(`Synced platform indexes and tenant indexes for ${tenants.length} tenant database(s)`)
  await mongoose.disconnect()
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
