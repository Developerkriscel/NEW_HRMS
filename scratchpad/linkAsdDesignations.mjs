import dotenv from 'dotenv'
import mongoose from 'mongoose'
dotenv.config({ path: '.env.local' })

const DB_NAME = 'nexahr_tenant_asd'
const TENANT_ID = new mongoose.Types.ObjectId('6a6b1b6ba53f75950969aa4c')
const CREATED_BY = 'ayushkumar.nov.2005@gmail.com'

const DEPARTMENTS = [
  { name: 'Engineering', code: 'ENG', designations: ['Software Engineer', 'Senior Software Engineer', 'Tech Lead', 'Engineering Manager'] },
  { name: 'Human Resources', code: 'HR', designations: ['HR Executive', 'HR Manager'] },
]

const uri = process.env.MONGODB_DIRECT_URI || process.env.MONGODB_URI
await mongoose.connect(uri)

const conn = mongoose.connection.useDb(DB_NAME, { useCache: true })
const anySchema = new mongoose.Schema({}, { strict: false })
const Department = conn.model('departments', anySchema, 'departments')
const Designation = conn.model('designations', anySchema, 'designations')

const now = new Date()
for (const dep of DEPARTMENTS) {
  let doc = await Department.findOne({ name: dep.name, tenantId: TENANT_ID, deleted: false })
  if (doc) {
    console.log(`department exists: ${dep.name} (${doc._id})`)
  } else {
    doc = await Department.create({
      name: dep.name,
      code: dep.code,
      head: null,
      active: true,
      createdBy: CREATED_BY,
      updatedBy: null,
      deleted: false,
      tenantId: TENANT_ID,
      createdAt: now,
      updatedAt: now,
      __v: 0,
    })
    console.log(`department created: ${dep.name} (${doc._id})`)
  }

  const res = await Designation.updateMany(
    { name: { $in: dep.designations }, tenantId: TENANT_ID, deleted: false },
    { $set: { department: doc._id, updatedBy: CREATED_BY, updatedAt: new Date() } }
  )
  console.log(`  linked ${res.modifiedCount} designation(s) to ${dep.name}`)
}

const all = await Designation.find({ tenantId: TENANT_ID, deleted: false }).sort({ name: 1 }).lean()
const depNames = new Map((await Department.find({ tenantId: TENANT_ID }).lean()).map((d) => [String(d._id), d.name]))
console.log(`\ndesignations in ${DB_NAME}:`)
for (const d of all) console.log(` - ${d.name} -> ${d.department ? depNames.get(String(d.department)) : '(no department)'}`)

await mongoose.disconnect()
