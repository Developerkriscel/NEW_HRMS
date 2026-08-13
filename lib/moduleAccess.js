export const MODULE_ACCESS = {
  DASHBOARD: 'dashboard',
  EMPLOYEES: 'employees',
  ATTENDANCE: 'attendance',
  LEAVE: 'leave',
  PAYROLL: 'payroll',
  RECRUITMENT: 'recruitment',
  REQUISITIONS: 'requisitions',
  JOBS: 'jobs',
  CANDIDATES: 'candidates',
  PIPELINE: 'pipeline',
  INTERVIEWS: 'interviews',
  ASSESSMENTS: 'assessments',
  SELECTIONS: 'selections',
  COMPENSATION: 'compensation',
  OFFERS: 'offers',
  ONBOARDING: 'onboarding',
  CAREER_PAGE: 'career_page',
  RECRUITMENT_REPORTS: 'recruitment_reports',
  RECRUITMENT_SETTINGS: 'recruitment_settings',
  OFFBOARDING: 'offboarding',
  PERFORMANCE: 'performance',
  ASSETS: 'assets',
  DOCUMENTS: 'documents',
  HELPDESK: 'helpdesk',
  TRAINING: 'training',
  REPORTS: 'reports',
  COMPANY_PROFILE: 'company_profile',
  DEPARTMENTS: 'departments',
  DESIGNATIONS: 'designations',
  BRANCHES: 'branches',
  SHIFTS: 'shifts',
  ROLES_PERMISSIONS: 'roles_permissions',
  AUDIT_LOGS: 'audit_logs',
  SETTINGS: 'settings',
}

export const MODULE_ACCESS_OPTIONS = [
  { key: MODULE_ACCESS.EMPLOYEES, label: 'Employees', group: 'Core HR' },
  { key: MODULE_ACCESS.ATTENDANCE, label: 'Attendance', group: 'Core HR' },
  { key: MODULE_ACCESS.LEAVE, label: 'Leave', group: 'Core HR' },
  { key: MODULE_ACCESS.PAYROLL, label: 'Payroll', group: 'Core HR' },
  { key: MODULE_ACCESS.RECRUITMENT, label: 'Recruitment Dashboard', group: 'Hiring' },
  { key: MODULE_ACCESS.REQUISITIONS, label: 'Job Requisitions', group: 'Hiring' },
  { key: MODULE_ACCESS.JOBS, label: 'Open Positions', group: 'Hiring' },
  { key: MODULE_ACCESS.CANDIDATES, label: 'Candidates', group: 'Hiring' },
  { key: MODULE_ACCESS.PIPELINE, label: 'Pipeline', group: 'Hiring' },
  { key: MODULE_ACCESS.INTERVIEWS, label: 'Interviews', group: 'Hiring' },
  { key: MODULE_ACCESS.ASSESSMENTS, label: 'Assessments', group: 'Hiring' },
  { key: MODULE_ACCESS.SELECTIONS, label: 'Selections', group: 'Hiring' },
  { key: MODULE_ACCESS.COMPENSATION, label: 'Compensation', group: 'Hiring' },
  { key: MODULE_ACCESS.OFFERS, label: 'Offers', group: 'Hiring' },
  { key: MODULE_ACCESS.ONBOARDING, label: 'Onboarding', group: 'Hiring' },
  { key: MODULE_ACCESS.CAREER_PAGE, label: 'Career Page', group: 'Hiring' },
  { key: MODULE_ACCESS.RECRUITMENT_REPORTS, label: 'Recruitment Reports', group: 'Hiring' },
  { key: MODULE_ACCESS.RECRUITMENT_SETTINGS, label: 'Recruitment Settings', group: 'Hiring' },
  { key: MODULE_ACCESS.OFFBOARDING, label: 'Offboarding', group: 'Core HR' },
  { key: MODULE_ACCESS.PERFORMANCE, label: 'Performance', group: 'People' },
  { key: MODULE_ACCESS.ASSETS, label: 'Assets', group: 'Operations' },
  { key: MODULE_ACCESS.DOCUMENTS, label: 'Documents', group: 'Operations' },
  { key: MODULE_ACCESS.HELPDESK, label: 'Helpdesk', group: 'Operations' },
  { key: MODULE_ACCESS.TRAINING, label: 'Training', group: 'People' },
  { key: MODULE_ACCESS.REPORTS, label: 'Reports', group: 'Analytics' },
]

export const HR_RESTRICTABLE_ROLES = ['HR_MANAGER']

export const RECRUITMENT_CHILD_MODULES = [
  MODULE_ACCESS.REQUISITIONS,
  MODULE_ACCESS.JOBS,
  MODULE_ACCESS.CANDIDATES,
  MODULE_ACCESS.PIPELINE,
  MODULE_ACCESS.INTERVIEWS,
  MODULE_ACCESS.ASSESSMENTS,
  MODULE_ACCESS.SELECTIONS,
  MODULE_ACCESS.COMPENSATION,
  MODULE_ACCESS.OFFERS,
  MODULE_ACCESS.ONBOARDING,
  MODULE_ACCESS.CAREER_PAGE,
  MODULE_ACCESS.RECRUITMENT_REPORTS,
  MODULE_ACCESS.RECRUITMENT_SETTINGS,
]

export function hasModuleAccess(userOrSession, moduleKey) {
  if (!moduleKey) return true
  if (moduleKey === MODULE_ACCESS.DASHBOARD) return true
  if (!userOrSession) return false
  if (['SUPER_ADMIN', 'COMPANY_ADMIN'].includes(userOrSession.role)) return true

  const moduleAccess = Array.isArray(userOrSession.moduleAccess) ? userOrSession.moduleAccess : []
  if (moduleAccess.length === 0) return true
  if (moduleKey === MODULE_ACCESS.RECRUITMENT) {
    return moduleAccess.includes(moduleKey) || RECRUITMENT_CHILD_MODULES.some((key) => moduleAccess.includes(key))
  }
  return moduleAccess.includes(moduleKey)
}

export function filterByModuleAccess(items, userOrSession) {
  return items.filter((item) => hasModuleAccess(userOrSession, item.moduleKey))
}

export function sanitizeModuleAccess(value) {
  const allowed = new Set(Object.values(MODULE_ACCESS))
  return Array.isArray(value) ? [...new Set(value.filter((item) => allowed.has(item)))] : []
}

export function moduleForHrPath(pathname) {
  const matches = [
    ['/hr/recruitment/requisitions', MODULE_ACCESS.REQUISITIONS],
    ['/hr/recruitment/open-positions', MODULE_ACCESS.JOBS],
    ['/hr/recruitment/jobs', MODULE_ACCESS.JOBS],
    ['/hr/recruitment/candidates', MODULE_ACCESS.CANDIDATES],
    ['/hr/recruitment/applications', MODULE_ACCESS.CANDIDATES],
    ['/hr/recruitment/pipeline', MODULE_ACCESS.PIPELINE],
    ['/hr/recruitment/interviews', MODULE_ACCESS.INTERVIEWS],
    ['/hr/recruitment/assessments', MODULE_ACCESS.ASSESSMENTS],
    ['/hr/recruitment/selections', MODULE_ACCESS.SELECTIONS],
    ['/hr/recruitment/compensation', MODULE_ACCESS.COMPENSATION],
    ['/hr/recruitment/offers', MODULE_ACCESS.OFFERS],
    ['/hr/recruitment/offer-templates', MODULE_ACCESS.OFFERS],
    ['/hr/recruitment/onboarding', MODULE_ACCESS.ONBOARDING],
    ['/hr/recruitment/career-page', MODULE_ACCESS.CAREER_PAGE],
    ['/hr/recruitment/reports', MODULE_ACCESS.RECRUITMENT_REPORTS],
    ['/hr/recruitment/settings', MODULE_ACCESS.RECRUITMENT_SETTINGS],
    ['/hr/recruitment', MODULE_ACCESS.RECRUITMENT],
    ['/hr/onboarding', MODULE_ACCESS.ONBOARDING],
    ['/hr/offboarding', MODULE_ACCESS.OFFBOARDING],
    ['/hr/employees', MODULE_ACCESS.EMPLOYEES],
    ['/hr/attendance', MODULE_ACCESS.ATTENDANCE],
    ['/hr/leave', MODULE_ACCESS.LEAVE],
    ['/hr/payroll', MODULE_ACCESS.PAYROLL],
    ['/hr/performance', MODULE_ACCESS.PERFORMANCE],
    ['/hr/assets', MODULE_ACCESS.ASSETS],
    ['/hr/documents', MODULE_ACCESS.DOCUMENTS],
    ['/hr/helpdesk', MODULE_ACCESS.HELPDESK],
    ['/hr/training', MODULE_ACCESS.TRAINING],
    ['/hr/reports', MODULE_ACCESS.REPORTS],
    ['/hr/dashboard', MODULE_ACCESS.DASHBOARD],
  ]
  return matches.find(([prefix]) => pathname === prefix || pathname.startsWith(prefix + '/'))?.[1] || null
}

export function moduleForApiPath(pathname) {
  if (pathname.startsWith('/api/recruitment/applications/')) {
    if (pathname.includes('/interviews')) return MODULE_ACCESS.INTERVIEWS
    if (pathname.includes('/assessments') || pathname.includes('/assign-assessment')) return MODULE_ACCESS.ASSESSMENTS
    if (pathname.includes('/selection') || pathname.endsWith('/select')) return MODULE_ACCESS.SELECTIONS
    if (pathname.includes('/compensation')) return MODULE_ACCESS.COMPENSATION
    if (pathname.includes('/offers')) return MODULE_ACCESS.OFFERS
    if (pathname.includes('/move-stage') || pathname.includes('/bulk-move')) return MODULE_ACCESS.PIPELINE
    return MODULE_ACCESS.CANDIDATES
  }

  const matches = [
    ['/api/employees/reports', MODULE_ACCESS.REPORTS],
    ['/api/employees', MODULE_ACCESS.EMPLOYEES],
    ['/api/departments', MODULE_ACCESS.DEPARTMENTS],
    ['/api/designations', MODULE_ACCESS.DESIGNATIONS],
    ['/api/branches', MODULE_ACCESS.BRANCHES],
    ['/api/shifts', MODULE_ACCESS.SHIFTS],
    ['/api/attendance', MODULE_ACCESS.ATTENDANCE],
    ['/api/leaves/reports', MODULE_ACCESS.REPORTS],
    ['/api/leaves/holidays', MODULE_ACCESS.LEAVE],
    ['/api/leaves', MODULE_ACCESS.LEAVE],
    ['/api/payroll', MODULE_ACCESS.PAYROLL],
    ['/api/assets', MODULE_ACCESS.ASSETS],
    ['/api/asset-requests', MODULE_ACCESS.ASSETS],
    ['/api/documents', MODULE_ACCESS.DOCUMENTS],
    ['/api/helpdesk', MODULE_ACCESS.HELPDESK],
    ['/api/training', MODULE_ACCESS.TRAINING],
    ['/api/performance-reviews', MODULE_ACCESS.PERFORMANCE],
    ['/api/kra', MODULE_ACCESS.PERFORMANCE],
    ['/api/resignations', MODULE_ACCESS.OFFBOARDING],
    ['/api/rosters', MODULE_ACCESS.ATTENDANCE],
    ['/api/holidays', MODULE_ACCESS.LEAVE],
    ['/api/company/audit-logs', MODULE_ACCESS.AUDIT_LOGS],
    ['/api/company/profile', MODULE_ACCESS.COMPANY_PROFILE],
    ['/api/recruitment/requisitions', MODULE_ACCESS.REQUISITIONS],
    ['/api/recruitment/jobs', MODULE_ACCESS.JOBS],
    ['/api/recruitment/job', MODULE_ACCESS.JOBS],
    ['/api/recruitment/publications', MODULE_ACCESS.JOBS],
    ['/api/recruitment/candidates', MODULE_ACCESS.CANDIDATES],
    ['/api/recruitment/candidate-resumes', MODULE_ACCESS.CANDIDATES],
    ['/api/recruitment/candidate-tags', MODULE_ACCESS.CANDIDATES],
    ['/api/recruitment/applications/compare', MODULE_ACCESS.CANDIDATES],
    ['/api/recruitment/applications/bulk', MODULE_ACCESS.CANDIDATES],
    ['/api/recruitment/applications', MODULE_ACCESS.CANDIDATES],
    ['/api/recruitment/pipeline', MODULE_ACCESS.PIPELINE],
    ['/api/recruitment/interviews', MODULE_ACCESS.INTERVIEWS],
    ['/api/recruitment/interview-scorecard-templates', MODULE_ACCESS.INTERVIEWS],
    ['/api/recruitment/assessments', MODULE_ACCESS.ASSESSMENTS],
    ['/api/recruitment/candidate-assessments', MODULE_ACCESS.ASSESSMENTS],
    ['/api/recruitment/selections', MODULE_ACCESS.SELECTIONS],
    ['/api/recruitment/compensation', MODULE_ACCESS.COMPENSATION],
    ['/api/recruitment/salary-structures', MODULE_ACCESS.COMPENSATION],
    ['/api/recruitment/offers', MODULE_ACCESS.OFFERS],
    ['/api/recruitment/offer-templates', MODULE_ACCESS.OFFERS],
    ['/api/recruitment/onboarding', MODULE_ACCESS.ONBOARDING],
    ['/api/recruitment/document-requirements', MODULE_ACCESS.ONBOARDING],
    ['/api/recruitment/integrations', MODULE_ACCESS.CAREER_PAGE],
    ['/api/recruitment/settings', MODULE_ACCESS.RECRUITMENT_SETTINGS],
    ['/api/recruitment/dashboard', MODULE_ACCESS.RECRUITMENT],
  ]
  return matches.find(([prefix]) => pathname === prefix || pathname.startsWith(prefix + '/'))?.[1] || null
}
