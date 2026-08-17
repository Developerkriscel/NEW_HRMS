import dotenv from 'dotenv'
import mongoose from 'mongoose'
dotenv.config({ path: '.env.local' })

const DB_NAME = 'nexahr_tenant_asd'
const GRANTEE = 'hr@asd.test'
const GRANT = ['requisition.approve']

// Names must match REQUISITION_PERMISSIONS in lib/recruitmentConstants.js
// exactly — canApproveOrReject() does a literal string includes() on them.
const PERMISSIONS = [
  { name: 'requisition.view', description: 'View job requisitions' },
  { name: 'requisition.create', description: 'Create job requisitions' },
  { name: 'requisition.edit', description: 'Edit job requisitions' },
  { name: 'requisition.submit', description: 'Submit requisitions for approval' },
  { name: 'requisition.approve', description: 'Approve pending requisitions' },
  { name: 'requisition.reject', description: 'Reject pending requisitions' },
  { name: 'requisition.cancel', description: 'Cancel requisitions' },
]

await mongoose.connect(process.env.MONGODB_DIRECT_URI || process.env.MONGODB_URI)
const conn = mongoose.connection.useDb(DB_NAME, { useCache: true })
const anySchema = new mongoose.Schema({}, { strict: false })
const Permission = conn.model('permissions', anySchema, 'permissions')
const Employee = conn.model('employees', anySchema, 'employees')

const now = new Date()
const byName = new Map()
for (const p of PERMISSIONS) {
  let doc = await Permission.findOne({ name: p.name })
  if (doc) {
    console.log(`permission exists: ${p.name}`)
  } else {
    doc = await Permission.create({
      ...p,
      module: 'Recruitment',
      deleted: false,
      createdBy: null,
      updatedBy: null,
      createdAt: now,
      updatedAt: now,
      __v: 0,
    })
    console.log(`permission created: ${p.name} (${doc._id})`)
  }
  byName.set(p.name, doc._id)
}

const emp = await Employee.findOne({ email: GRANTEE, deleted: false })
if (!emp) throw new Error(`${GRANTEE} not found in ${DB_NAME}`)

const current = (emp.permissions || []).map(String)
const toAdd = GRANT.map((n) => byName.get(n)).filter((id) => !current.includes(String(id)))
if (toAdd.length) {
  await Employee.updateOne({ _id: emp._id }, { $addToSet: { permissions: { $each: toAdd } }, $set: { updatedAt: new Date() } })
  console.log(`\ngranted ${toAdd.length} permission(s) to ${GRANTEE}`)
} else {
  console.log(`\n${GRANTEE} already holds ${GRANT.join(', ')}`)
}

const after = await Employee.findOne({ _id: emp._id }).lean()
const names = await Permission.find({ _id: { $in: after.permissions || [] } }).lean()
console.log(`${GRANTEE} (${after.role}) permissions:`, names.map((p) => p.name).join(', ') || '(none)')

await mongoose.disconnect()
