import dotenv from 'dotenv'
import mongoose from 'mongoose'
dotenv.config({ path: '.env.local' })
const uri = process.env.MONGODB_DIRECT_URI || process.env.MONGODB_URI
await mongoose.connect(uri)
const Tenant = mongoose.model('Tenant', new mongoose.Schema({}, { strict: false }))
const tenants = await Tenant.find({ deleted: { $ne: true } }).lean()
for (const t of tenants) {
  console.log(`--- ${t.companyName} (${t.tenantCode}) ---`)
  console.log('databaseName:', t.databaseName, 'status:', t.databaseStatus)
  if (t.databaseName) {
    const conn = mongoose.connection.useDb(t.databaseName, { useCache: true })
    const Employee = conn.models.Employee || conn.model('Employee', new mongoose.Schema({}, { strict: false }), 'employees')
    const emps = await Employee.find({}).select('firstName lastName email role status').lean()
    console.log('employees:', JSON.stringify(emps, null, 2))
  }
}
await mongoose.disconnect()
