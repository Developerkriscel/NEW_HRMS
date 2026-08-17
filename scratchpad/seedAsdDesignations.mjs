import dotenv from 'dotenv'
import mongoose from 'mongoose'
dotenv.config({ path: '.env.local' })

const DB_NAME = 'nexahr_tenant_asd'
const TENANT_ID = new mongoose.Types.ObjectId('6a6b1b6ba53f75950969aa4c')
const CREATED_BY = 'ayushkumar.nov.2005@gmail.com'

const DESIGNATIONS = [
  { name: 'Software Engineer', code: 'SE', grade: 'L1' },
  { name: 'Senior Software Engineer', code: 'SSE', grade: 'L2' },
  { name: 'Tech Lead', code: 'TL', grade: 'L3' },
  { name: 'Engineering Manager', code: 'EM', grade: 'M1' },
  { name: 'HR Executive', code: 'HRE', grade: 'L1' },
  { name: 'HR Manager', code: 'HRM', grade: 'M1' },
]

const uri = process.env.MONGODB_DIRECT_URI || process.env.MONGODB_URI
await mongoose.connect(uri)

const conn = mongoose.connection.useDb(DB_NAME, { useCache: true })
const anySchema = new mongoose.Schema({}, { strict: false })
const Designation = conn.model('designations', anySchema, 'designations')

const now = new Date()
for (const d of DESIGNATIONS) {
  const existing = await Designation.findOne({ name: d.name, tenantId: TENANT_ID, deleted: false }).lean()
  if (existing) {
    console.log(`skip (exists): ${d.name}`)
    continue
  }
  const doc = await Designation.create({
    ...d,
    department: null,
    active: true,
    createdBy: CREATED_BY,
    updatedBy: null,
    deleted: false,
    tenantId: TENANT_ID,
    createdAt: now,
    updatedAt: now,
    __v: 0,
  })
  console.log(`created: ${d.name} (${doc._id})`)
}

const all = await Designation.find({ tenantId: TENANT_ID, deleted: false }).sort({ name: 1 }).lean()
console.log(`\ntotal active designations in ${DB_NAME}: ${all.length}`)
for (const d of all) console.log(` - ${d.name}${d.code ? ` [${d.code}${d.grade ? '/' + d.grade : ''}]` : ''}`)

await mongoose.disconnect()
