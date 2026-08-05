// Standalone seed script — mirrors the seed data from the old
// backend/src/main/resources/db/init.sql (4 plans, 1 super admin, 13
// permissions). Run with `npm run seed` after setting MONGODB_URI in
// .env.local.
import dotenv from 'dotenv'
import mongoose from 'mongoose'
import bcrypt from 'bcryptjs'

dotenv.config({ path: '.env.local' })
dotenv.config()

// See lib/db.js — some networks' DNS servers don't answer SRV/TXT queries.

const MONGODB_URI = process.env.MONGODB_DIRECT_URI || process.env.MONGODB_URI
if (!MONGODB_URI) {
  console.error('MONGODB_URI is not set. Copy .env.example to .env.local and configure it first.')
  process.exit(1)
}

const PlanSchema = new mongoose.Schema({}, { strict: false, timestamps: true })
const PlatformOperatorSchema = new mongoose.Schema({}, { strict: false, timestamps: true, collection: 'superadminusers' })
const PermissionSchema = new mongoose.Schema({}, { strict: false, timestamps: true })

const Plan = mongoose.models.Plan || mongoose.model('Plan', PlanSchema)
const PlatformOperator = mongoose.models.PlatformOperator || mongoose.model('PlatformOperator', PlatformOperatorSchema)
const Permission = mongoose.models.Permission || mongoose.model('Permission', PermissionSchema)

const PLANS = [
  { name: 'Free', price: 0, employeeLimit: 10, storageLimitMb: 1024, trialDays: 0, sortOrder: 1 },
  { name: 'Starter', price: 2999, employeeLimit: 50, storageLimitMb: 5120, trialDays: 14, sortOrder: 2 },
  { name: 'Professional', price: 7999, employeeLimit: 250, storageLimitMb: 20480, trialDays: 14, sortOrder: 3 },
  { name: 'Enterprise', price: 19999, employeeLimit: -1, storageLimitMb: 102400, trialDays: 30, sortOrder: 4 },
]

const PERMISSIONS = [
  { name: 'employee:create', module: 'HR' },
  { name: 'employee:view', module: 'HR' },
  { name: 'employee:update', module: 'HR' },
  { name: 'employee:delete', module: 'HR' },
  { name: 'payroll:view', module: 'Payroll' },
  { name: 'payroll:process', module: 'Payroll' },
  { name: 'payroll:approve', module: 'Payroll' },
  { name: 'attendance:view', module: 'Attendance' },
  { name: 'attendance:approve', module: 'Attendance' },
  { name: 'leave:apply', module: 'Leave' },
  { name: 'leave:approve', module: 'Leave' },
  { name: 'reports:view', module: 'Reports' },
  { name: 'reports:export', module: 'Reports' },
]

async function main() {
  await mongoose.connect(MONGODB_URI)
  console.log('Connected to MongoDB')

  for (const plan of PLANS) {
    await Plan.updateOne(
      { name: plan.name },
      { $setOnInsert: { ...plan, billingCycle: 'MONTHLY', active: true, deleted: false } },
      { upsert: true }
    )
  }
  console.log(`Seeded ${PLANS.length} plans`)

  const existingAdmin = await PlatformOperator.findOne({ email: 'admin@nexahr.io' })
  if (!existingAdmin) {
    const password = await bcrypt.hash('Admin@1234', 12)
    await PlatformOperator.create({
      name: 'NexaHR Super Admin',
      email: 'admin@nexahr.io',
      password,
      active: true,
      status: 'ACTIVE',
      deleted: false,
    })
    console.log('Seeded platform operator: admin@nexahr.io / Admin@1234')
  } else {
    console.log('Platform operator already exists, skipping')
  }

  for (const perm of PERMISSIONS) {
    await Permission.updateOne(
      { name: perm.name },
      { $setOnInsert: { ...perm, deleted: false } },
      { upsert: true }
    )
  }
  console.log(`Seeded ${PERMISSIONS.length} permissions`)

  await mongoose.disconnect()
  console.log('Done')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
