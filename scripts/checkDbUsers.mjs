import dotenv from 'dotenv'
import mongoose from 'mongoose'
import bcrypt from 'bcryptjs'

dotenv.config({ path: '.env.local' })
dotenv.config()

const MONGODB_URI = process.env.MONGODB_DIRECT_URI || process.env.MONGODB_URI

async function check() {
  await mongoose.connect(MONGODB_URI)
  console.log('Connected to MongoDB')

  // Check superadminusers collection (PlatformOperator)
  const PlatformOperatorSchema = new mongoose.Schema({}, { strict: false, collection: 'superadminusers' })
  const PlatformOperator = mongoose.models.PlatformOperator || mongoose.model('PlatformOperator', PlatformOperatorSchema)

  const operators = await PlatformOperator.find({})
  console.log('=== PLATFORM OPERATORS (superadminusers) ===')
  for (const op of operators) {
    const isPass123 = await bcrypt.compare('Password@123', op.password || '')
    const isPassAdmin1234 = await bcrypt.compare('Admin@1234', op.password || '')
    console.log(`Email: [${op.email}], Active: [${op.active}], Status: [${op.status}], PasswordMatches_Password@123: [${isPass123}], PasswordMatches_Admin@1234: [${isPassAdmin1234}]`)
  }

  // Check employees collection
  const EmployeeSchema = new mongoose.Schema({}, { strict: false })
  const Employee = mongoose.models.Employee || mongoose.model('Employee', EmployeeSchema)
  const employees = await Employee.find({})
  console.log('\n=== EMPLOYEES (main db) ===')
  for (const emp of employees) {
    const isPass123 = await bcrypt.compare('Password@123', emp.password || '')
    console.log(`Email: [${emp.email}], Role: [${emp.role}], Status: [${emp.status}], PasswordMatches_Password@123: [${isPass123}]`)
  }

  // Check tenant db
  const tenantConn = mongoose.connection.useDb('nexahr_tenant_acme', { useCache: true })
  const TenantEmployee = tenantConn.model('Employee', EmployeeSchema)
  const tenantEmps = await TenantEmployee.find({})
  console.log('\n=== EMPLOYEES (tenant db: nexahr_tenant_acme) ===')
  for (const emp of tenantEmps) {
    const isPass123 = await bcrypt.compare('Password@123', emp.password || '')
    console.log(`Email: [${emp.email}], Role: [${emp.role}], Status: [${emp.status}], PasswordMatches_Password@123: [${isPass123}]`)
  }

  await mongoose.disconnect()
}

check().catch(console.error)
