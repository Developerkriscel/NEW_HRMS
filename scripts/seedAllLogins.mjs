import dotenv from 'dotenv'
import mongoose from 'mongoose'
import bcrypt from 'bcryptjs'

dotenv.config({ path: '.env.local' })
dotenv.config()

const MONGODB_URI = process.env.MONGODB_DIRECT_URI || process.env.MONGODB_URI
if (!MONGODB_URI) {
  console.error('MONGODB_URI is not set in .env.local')
  process.exit(1)
}

const PASSWORD = 'Password@123'

async function main() {
  await mongoose.connect(MONGODB_URI)
  console.log('Connected to MongoDB')

  const hashedPassword = await bcrypt.hash(PASSWORD, 12)

  // 1. Dynamic Schemas for Main DB
  const PlanSchema = new mongoose.Schema({}, { strict: false, timestamps: true })
  const TenantSchema = new mongoose.Schema({}, { strict: false, timestamps: true })
  const PlatformOperatorSchema = new mongoose.Schema({}, { strict: false, timestamps: true, collection: 'superadminusers' })
  const PlatformRoleSchema = new mongoose.Schema({}, { strict: false, timestamps: true })
  const PlatformOperatorRoleSchema = new mongoose.Schema({}, { strict: false, timestamps: true })
  const EmployeeSchema = new mongoose.Schema({}, { strict: false, timestamps: true })
  const DepartmentSchema = new mongoose.Schema({}, { strict: false, timestamps: true })
  const DesignationSchema = new mongoose.Schema({}, { strict: false, timestamps: true })

  const Plan = mongoose.models.Plan || mongoose.model('Plan', PlanSchema)
  const Tenant = mongoose.models.Tenant || mongoose.model('Tenant', TenantSchema)
  const PlatformOperator = mongoose.models.PlatformOperator || mongoose.model('PlatformOperator', PlatformOperatorSchema)
  const PlatformRole = mongoose.models.PlatformRole || mongoose.model('PlatformRole', PlatformRoleSchema)
  const PlatformOperatorRole = mongoose.models.PlatformOperatorRole || mongoose.model('PlatformOperatorRole', PlatformOperatorRoleSchema)
  const Employee = mongoose.models.Employee || mongoose.model('Employee', EmployeeSchema)
  const Department = mongoose.models.Department || mongoose.model('Department', DepartmentSchema)
  const Designation = mongoose.models.Designation || mongoose.model('Designation', DesignationSchema)

  // 2. Ensure Enterprise Plan
  let plan = await Plan.findOne({ name: 'Enterprise' })
  if (!plan) {
    plan = await Plan.create({
      name: 'Enterprise',
      description: 'Full enterprise tier with all modules unlocked',
      price: 19999,
      billingCycle: 'MONTHLY',
      employeeLimit: -1,
      storageLimitMb: 102400,
      apiQuota: -1,
      integrationLimit: -1,
      retentionTier: 'COMPLIANCE',
      gracePeriodDays: 30,
      features: ['all'],
      active: true,
      trialDays: 30,
      sortOrder: 1,
      deleted: false,
    })
  }

  // 3. Ensure Platform Owner (Super Admin)
  let superAdmin = await PlatformOperator.findOne({ email: 'admin@nexahr.io' })
  if (!superAdmin) {
    superAdmin = await PlatformOperator.create({
      name: 'Dev Super Admin',
      email: 'admin@nexahr.io',
      password: hashedPassword,
      active: true,
      status: 'ACTIVE',
      deleted: false,
    })
    console.log('Created Super Admin: admin@nexahr.io')
  } else {
    superAdmin.password = hashedPassword
    superAdmin.status = 'ACTIVE'
    superAdmin.active = true
    await superAdmin.save()
    console.log('Updated Super Admin password: admin@nexahr.io')
  }

  // Ensure PLATFORM_OWNER role exists and is assigned
  let ownerRole = await PlatformRole.findOne({ name: 'PLATFORM_OWNER' })
  if (!ownerRole) {
    ownerRole = await PlatformRole.create({
      name: 'PLATFORM_OWNER',
      description: 'Full, unrestricted platform access',
      mfaRequired: false,
      status: 'ACTIVE',
      deleted: false,
    })
  }
  await PlatformOperatorRole.updateOne(
    { operator: superAdmin._id, role: ownerRole._id },
    { $set: { revoked: false, assignedAt: new Date() } },
    { upsert: true }
  )

  // 4. Ensure Demo Company (Acme Technologies)
  let tenant = await Tenant.findOne({ tenantCode: 'ACME' })
  const tenantDbName = 'nexahr_tenant_acme'
  if (!tenant) {
    tenant = await Tenant.create({
      companyName: 'Acme Technologies',
      tenantCode: 'ACME',
      subdomain: 'acme',
      email: 'admin@acme.com',
      adminEmail: 'admin@acme.com',
      phone: '+91 9876543210',
      plan: plan._id,
      status: 'ACTIVE',
      databaseName: tenantDbName,
      databaseStatus: 'READY',
      databaseProvisionedAt: new Date(),
      employeeLimit: 250,
      storageLimitMb: 20480,
      storageUsedMb: 120,
      features: {
        core_hr: true,
        attendance: true,
        leave: true,
        payroll: true,
        recruitment: true,
        performance: true,
        assets: true,
        helpdesk: true,
        training: true,
        reports: true,
      },
      deleted: false,
    })
    console.log('Created Tenant: Acme Technologies (ACME)')
  } else {
    tenant.databaseName = tenantDbName
    tenant.databaseStatus = 'READY'
    tenant.status = 'ACTIVE'
    tenant.adminEmail = 'admin@acme.com'
    await tenant.save()
    console.log('Updated Tenant: Acme Technologies')
  }

  // 5. Connect to Tenant DB
  const tenantConn = mongoose.connection.useDb(tenantDbName, { useCache: true })
  const TenantEmployee = tenantConn.model('Employee', EmployeeSchema)
  const TenantDepartment = tenantConn.model('Department', DepartmentSchema)
  const TenantDesignation = tenantConn.model('Designation', DesignationSchema)

  // Ensure Departments
  let engineeringDept = await TenantDepartment.findOne({ name: 'Engineering', tenantId: tenant._id })
  if (!engineeringDept) {
    engineeringDept = await TenantDepartment.create({ name: 'Engineering', code: 'ENG', tenantId: tenant._id, deleted: false })
  }
  let hrDept = await TenantDepartment.findOne({ name: 'Human Resources', tenantId: tenant._id })
  if (!hrDept) {
    hrDept = await TenantDepartment.create({ name: 'Human Resources', code: 'HR', tenantId: tenant._id, deleted: false })
  }
  let financeDept = await TenantDepartment.findOne({ name: 'Finance', tenantId: tenant._id })
  if (!financeDept) {
    financeDept = await TenantDepartment.create({ name: 'Finance', code: 'FIN', tenantId: tenant._id, deleted: false })
  }

  // Ensure Designations
  let ctoDesig = await TenantDesignation.findOne({ title: 'Chief Technology Officer', tenantId: tenant._id })
  if (!ctoDesig) ctoDesig = await TenantDesignation.create({ title: 'Chief Technology Officer', code: 'CTO', tenantId: tenant._id, deleted: false })

  let hrManagerDesig = await TenantDesignation.findOne({ title: 'HR Manager', tenantId: tenant._id })
  if (!hrManagerDesig) hrManagerDesig = await TenantDesignation.create({ title: 'HR Manager', code: 'HRM', tenantId: tenant._id, deleted: false })

  let engManagerDesig = await TenantDesignation.findOne({ title: 'Engineering Manager', tenantId: tenant._id })
  if (!engManagerDesig) engManagerDesig = await TenantDesignation.create({ title: 'Engineering Manager', code: 'EM', tenantId: tenant._id, deleted: false })

  let srDevDesig = await TenantDesignation.findOne({ title: 'Senior Software Engineer', tenantId: tenant._id })
  if (!srDevDesig) srDevDesig = await TenantDesignation.create({ title: 'Senior Software Engineer', code: 'SSE', tenantId: tenant._id, deleted: false })

  let financeLeadDesig = await TenantDesignation.findOne({ title: 'Finance Lead', tenantId: tenant._id })
  if (!financeLeadDesig) financeLeadDesig = await TenantDesignation.create({ title: 'Finance Lead', code: 'FL', tenantId: tenant._id, deleted: false })

  let itAdminDesig = await TenantDesignation.findOne({ title: 'IT Administrator', tenantId: tenant._id })
  if (!itAdminDesig) itAdminDesig = await TenantDesignation.create({ title: 'IT Administrator', code: 'ITA', tenantId: tenant._id, deleted: false })

  // 6. Users List for All Panels
  const PANEL_USERS = [
    {
      employeeCode: 'EMP00001',
      firstName: 'Rajesh',
      lastName: 'Sharma',
      email: 'admin@acme.com',
      role: 'COMPANY_ADMIN',
      department: engineeringDept._id,
      designation: ctoDesig._id,
    },
    {
      employeeCode: 'EMP00002',
      firstName: 'Pooja',
      lastName: 'Verma',
      email: 'hr@acme.com',
      role: 'HR_MANAGER',
      department: hrDept._id,
      designation: hrManagerDesig._id,
    },
    {
      employeeCode: 'EMP00003',
      firstName: 'Amit',
      lastName: 'Kapoor',
      email: 'manager@acme.com',
      role: 'MANAGER',
      department: engineeringDept._id,
      designation: engManagerDesig._id,
    },
    {
      employeeCode: 'EMP00004',
      firstName: 'Rahul',
      lastName: 'Mehta',
      email: 'employee@acme.com',
      role: 'EMPLOYEE',
      department: engineeringDept._id,
      designation: srDevDesig._id,
    },
    {
      employeeCode: 'EMP00005',
      firstName: 'Sunita',
      lastName: 'Rao',
      email: 'finance@acme.com',
      role: 'FINANCE',
      department: financeDept._id,
      designation: financeLeadDesig._id,
    },
    {
      employeeCode: 'EMP00006',
      firstName: 'Vikram',
      lastName: 'Singh',
      email: 'itadmin@acme.com',
      role: 'IT_ADMIN',
      department: engineeringDept._id,
      designation: itAdminDesig._id,
    },
  ]

  for (const u of PANEL_USERS) {
    const userData = {
      ...u,
      tenantId: tenant._id,
      companyName: 'Acme Technologies',
      companyCode: 'ACME',
      password: hashedPassword,
      status: 'ACTIVE',
      joiningDate: new Date('2024-01-15'),
      phone: '+91 9876500000',
      deleted: false,
    }

    // Save in Tenant DB
    await TenantEmployee.updateOne(
      { email: u.email },
      { $set: userData },
      { upsert: true }
    )

    // Also save in Main DB fallback
    await Employee.updateOne(
      { email: u.email },
      { $set: userData },
      { upsert: true }
    )

    console.log(`Seeded user [${u.role}]: ${u.email}`)
  }

  console.log('\n=============================================')
  console.log('       ALL SEED LOGINS READY SUCCESSFULLY     ')
  console.log('=============================================')

  await mongoose.disconnect()
}

main().catch((err) => {
  console.error('Error seeding logins:', err)
  process.exit(1)
})
