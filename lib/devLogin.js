export const DEV_TENANT_ID = process.env.NEXAHR_DEV_TENANT_ID || '6a88b686b01cf645eb26b4ba'
export const DEV_TENANT_DB = process.env.NEXAHR_DEV_TENANT_DB || 'nexahr_tenant_acme'

export const DEV_USERS = {
  SUPER_ADMIN: {
    id: process.env.NEXAHR_DEV_SUPER_ADMIN_ID || '6a884143395aab2a599e82b2',
    name: 'Dev Super Admin',
    email: 'admin@nexahr.io',
    role: 'SUPER_ADMIN',
    tenantId: null,
    companyName: null,
    companySlug: null,
    platformPermissions: ['*'],
    platformRoles: ['PLATFORM_OWNER (dev)'],
  },
  COMPANY_ADMIN: {
    id: process.env.NEXAHR_DEV_COMPANY_ADMIN_ID || '6a88b688c939dad117422139',
    name: 'Rajesh Sharma',
    email: 'admin@acme.com',
    role: 'COMPANY_ADMIN',
  },
  HR_MANAGER: {
    id: process.env.NEXAHR_DEV_HR_MANAGER_ID || '6a88b688c939dad11742213b',
    name: 'Pooja Verma',
    email: 'hr@acme.com',
    role: 'HR_MANAGER',
  },
  MANAGER: {
    id: process.env.NEXAHR_DEV_MANAGER_ID || '6a88b688c939dad11742213d',
    name: 'Amit Kapoor',
    email: 'manager@acme.com',
    role: 'MANAGER',
  },
  EMPLOYEE: {
    id: process.env.NEXAHR_DEV_EMPLOYEE_ID || '6a88b688c939dad11742213f',
    name: 'Rahul Mehta',
    email: 'employee@acme.com',
    role: 'EMPLOYEE',
  },
  FINANCE: {
    id: process.env.NEXAHR_DEV_FINANCE_ID || '6a88b688c939dad117422141',
    name: 'Sunita Rao',
    email: 'finance@acme.com',
    role: 'FINANCE',
  },
  IT_ADMIN: {
    id: process.env.NEXAHR_DEV_IT_ADMIN_ID || '6a88b688c939dad117422143',
    name: 'Vikram Singh',
    email: 'itadmin@acme.com',
    role: 'IT_ADMIN',
  },
}

export const ALL_MODULES = [
  'dashboard', 'employees', 'attendance', 'leave', 'payroll', 'recruitment',
  'requisitions', 'jobs', 'candidates', 'pipeline', 'interviews', 'assessments',
  'selections', 'compensation', 'offers', 'onboarding', 'career_page',
  'recruitment_reports', 'recruitment_settings', 'offboarding', 'performance',
  'assets', 'documents', 'helpdesk', 'training', 'reports', 'company_profile',
  'departments', 'designations', 'branches', 'shifts', 'roles_permissions',
  'audit_logs', 'settings',
]

const DEV_PASSWORD = 'Password@123'

export function isLocalhostUrl(url) {
  try {
    const hostname = new URL(url).hostname
    return ['localhost', '127.0.0.1', '::1', '0.0.0.0'].includes(hostname)
  } catch {
    return false
  }
}

export function isDevAuthAllowed(reqOrUrl) {
  if (process.env.NODE_ENV !== 'production') return true
  if (typeof reqOrUrl === 'string') return isLocalhostUrl(reqOrUrl)
  const req = reqOrUrl
  const host = req?.headers?.get?.('host') || ''
  const forwardedHost = req?.headers?.get?.('x-forwarded-host') || ''
  return isLocalhostUrl(req?.url) || /^localhost(?::\d+)?$/i.test(host) || /^127\.0\.0\.1(?::\d+)?$/i.test(host) || /^localhost(?::\d+)?$/i.test(forwardedHost)
}

export function buildDevUserForRole(role = 'SUPER_ADMIN') {
  const base = DEV_USERS[String(role || 'SUPER_ADMIN').toUpperCase()] || DEV_USERS.SUPER_ADMIN
  if (base.role === 'SUPER_ADMIN') return { ...base }
  return {
    ...base,
    tenantId: DEV_TENANT_ID,
    companyName: 'Acme Technologies',
    companySlug: 'acme',
    tenantDatabaseName: DEV_TENANT_DB,
    permissions: [],
    moduleAccess: ALL_MODULES,
    platformPermissions: [],
    platformRoles: [],
  }
}

export function roleForDevEmail(email) {
  const normalized = String(email || '').trim().toLowerCase()
  return Object.values(DEV_USERS).find((user) => user.email.toLowerCase() === normalized)?.role || null
}

export function isDevQuickCredential(email, password, reqOrUrl = null) {
  return isDevAuthAllowed(reqOrUrl) && password === DEV_PASSWORD && !!roleForDevEmail(email)
}

export function buildDevUserForEmail(email) {
  const role = roleForDevEmail(email)
  return role ? buildDevUserForRole(role) : null
}
