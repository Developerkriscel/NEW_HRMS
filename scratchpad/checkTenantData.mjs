import dotenv from 'dotenv'
import mongoose from 'mongoose'
dotenv.config({ path: '.env.local' })
const uri = process.env.MONGODB_DIRECT_URI || process.env.MONGODB_URI
await mongoose.connect(uri)

async function inspect(dbName, label) {
  console.log(`\n=== ${label} (${dbName}) ===`)
  const conn = mongoose.connection.useDb(dbName, { useCache: true })
  const anySchema = new mongoose.Schema({}, { strict: false })
  const collections = await conn.db.listCollections().toArray()
  const names = collections.map((c) => c.name)
  console.log('collections:', names.join(', '))

  for (const cname of ['departments', 'designations', 'branches', 'job_requisitions', 'jobs', 'job_publications', 'job_pipeline_stages', 'candidates', 'applications']) {
    if (!names.includes(cname)) { console.log(`${cname}: (missing)`); continue }
    const Model = conn.models[cname] || conn.model(cname, anySchema, cname)
    const count = await Model.countDocuments({})
    console.log(`${cname}: ${count}`)
    if (count > 0 && count <= 10) {
      const docs = await Model.find({}).limit(10).lean()
      console.log(JSON.stringify(docs, null, 2))
    }
  }
}

await inspect('nexahr_tenant_asd', 'asd')
await inspect('nexahr_tenant_testqa', 'Test QA Corp')

await mongoose.disconnect()
