export const ROLES = {
  SUPER_ADMIN: 'SUPER_ADMIN',
  COMPANY_ADMIN: 'COMPANY_ADMIN',
  HR_MANAGER: 'HR_MANAGER',
  MANAGER: 'MANAGER',
  EMPLOYEE: 'EMPLOYEE',
  FINANCE: 'FINANCE',
  IT_ADMIN: 'IT_ADMIN',
}

export const ROLE_DASHBOARDS = {
  [ROLES.SUPER_ADMIN]: '/super-admin/dashboard',
  [ROLES.COMPANY_ADMIN]: '/company/dashboard',
  [ROLES.HR_MANAGER]: '/hr/dashboard',
  [ROLES.MANAGER]: '/manager/dashboard',
  [ROLES.EMPLOYEE]: '/employee/dashboard',
  [ROLES.FINANCE]: '/hr/dashboard',
  [ROLES.IT_ADMIN]: '/hr/dashboard',
}

export const ROLE_PANEL_LABELS = {
  [ROLES.SUPER_ADMIN]: 'Super Admin Panel',
  [ROLES.COMPANY_ADMIN]: 'Company Admin Panel',
  [ROLES.HR_MANAGER]: 'HR Panel',
  [ROLES.MANAGER]: 'Manager Panel',
  [ROLES.EMPLOYEE]: 'Employee Panel',
  [ROLES.FINANCE]: 'Finance Panel',
  [ROLES.IT_ADMIN]: 'IT Admin Panel',
}
